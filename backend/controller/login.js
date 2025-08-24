const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Fetch user
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Fetch user roles
    const [roles] = await pool.query('SELECT general_role, specific_role FROM roles WHERE user_id = ?', [user.user_id]);

    // Generate JWT
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        roles: roles.map(row => ({ general_role: row.general_role, specific_role: row.specific_role })),
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Update login tracker
    await pool.query('UPDATE users SET login_tracker = CURRENT_TIMESTAMP WHERE user_id = ?', [user.user_id]);

    // Return token and roles
    res.json({
      token,
      roles: roles.map(row => ({
        general_role: row.general_role,
        specific_role: row.specific_role,
      })),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { login };