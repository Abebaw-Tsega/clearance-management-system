const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
require('dotenv').config();

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

// Staff login endpoint
const staffLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }
  try {
    const [users] = await pool.query('SELECT user_id, password_hash, first_name, last_name, email FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = users[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    // Get staff role
    const [roles] = await pool.query('SELECT general_role, specific_role FROM roles WHERE user_id = ?', [user.user_id]);
    if (roles.length === 0) {
      return res.status(403).json({ error: 'No staff role assigned' });
    }
    // Create JWT
    const token = jwt.sign({ user_id: user.user_id, email: user.email, role: roles[0].general_role }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({
      token,
      user: {
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: roles[0].general_role,
        specific_role: roles[0].specific_role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

module.exports = {
  login,
  changePassword,
  staffLogin,
};