const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const nodemailer = require('nodemailer');
require('dotenv').config();

// --- Password Reset Token Store (in-memory Map) ---
const resetTokens = new Map();

const transporter = nodemailer.createTransport({
  service: 'gmail', // or your SMTP provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- Request Password Reset ---
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    const [users] = await pool.query('SELECT user_id, email FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    // Generate unique token (6-digit code)
    let token = Math.floor(100000 + Math.random() * 900000).toString();
    // Ensure uniqueness (for demo, not strictly necessary)
    let attempts = 0;
    while ([...resetTokens.values()].some(t => t.token === token) && attempts < 5) {
      token = Math.floor(100000 + Math.random() * 900000).toString();
      attempts++;
    }
    resetTokens.set(email, { token, expires: Date.now() + 600000 }); // 10 min expiry
    // Styled HTML email for password reset
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          h1 {
            color: #2c3e50;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #3498db;
            color: white !important;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
            font-weight: bold;
            transition: background-color 0.3s;
          }
          .button:hover {
            background-color: #2980b9;
          }
          .code {
            font-family: monospace;
            font-size: 3em;
            background-color: #ecf0f1;
            padding: 10px;
            border-radius: 4px;
            margin: 20px 0;
            display: inline-block;
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            font-size: 0.9em;
            color: #7f8c8d;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Password Reset Request</h1>
          <p>You are receiving this email because you (or someone else) has requested to reset the password for your account.</p>
          <p>Please use the code below to reset your password. This code will expire in 10 minutes.</p>
          <div class="code">${token}</div>
          <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
          <p>For security reasons, do not share this code with anyone.</p>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} AASTU Clearance Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request - Action Required',
      html: htmlContent
    });
    res.json({ message: 'Reset code sent to your email.' });
  } catch (error) {
    console.error('Error sending reset token:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Reset Password With Token ---
const resetPassword = async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Email, token, and new password are required' });
  }
  try {
    const stored = resetTokens.get(email);
    if (!stored || stored.token !== token || Date.now() > stored.expires) {
      return res.status(401).json({ error: 'Invalid or expired reset token' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [newHash, email]);
    resetTokens.delete(email);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Fetch user
    const [users] = await pool.query('SELECT user_id, email, password_hash FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Fetch roles
    const [roles] = await pool.query('SELECT general_role, specific_role FROM roles WHERE user_id = ?', [user.user_id]);
    let userRoles = roles.map(row => ({
      general_role: row.general_role,
      specific_role: row.specific_role
    }));

    // Check if user is a student
    const [students] = await pool.query('SELECT student_id FROM students WHERE user_id = ?', [user.user_id]);
    if (students.length > 0 && !userRoles.some(r => r.general_role === 'student')) {
      userRoles.push({ general_role: 'student', specific_role: null });
    }

    // Generate JWT
    const token = jwt.sign({ user_id: user.user_id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    console.log(`Login successful for user_id: ${user.user_id}, roles: ${JSON.stringify(userRoles)}`);
    res.status(200).json({ token, roles: userRoles });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// Change password endpoint
const changePassword = async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  if (!email || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    // Get user by email
    const [users] = await pool.query('SELECT user_id, password_hash FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = users[0];
    // Check current password
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [newHash, user.user_id]);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
};


// Forgot password endpoint
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  try {
    // Check if user exists
    const [users] = await pool.query('SELECT user_id, email FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Simulate sending email (replace with real email logic if needed)
    // You could generate a token and send a reset link here
    console.log(`Password reset link sent to ${email}`);
    res.json({ message: 'Password reset link sent to your email.' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

module.exports = {
  login,
  changePassword,
  forgotPassword,
  requestPasswordReset,
  resetPassword,
};