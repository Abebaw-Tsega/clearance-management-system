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
    const token = jwt.sign({ user_id: user.user_id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    console.log(`Login successful for user_id: ${user.user_id}, roles: ${JSON.stringify(userRoles)}`);
    res.status(200).json({ token, roles: userRoles });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { login };