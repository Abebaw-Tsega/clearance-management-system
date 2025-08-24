const jwt = require('jsonwebtoken');
const pool = require('../config/db'); // Import the MySQL connection pool
require('dotenv').config();

const authenticateToken = (requiredRoles = []) => {
  return async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    console.log('Auth Header:', authHeader);
    console.log('Token:', token);
    console.log('JWT_SECRET in Middleware:', process.env.JWT_SECRET);

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded Token:', decoded);
      req.user = decoded;

      if (requiredRoles.length > 0) {
        const [rows] = await pool.query(
          'SELECT general_role, specific_role FROM roles WHERE user_id = ?',
          [decoded.user_id]
        );
        console.log('User Roles:', rows);
        const userRoles = rows.map(row => ({
          general_role: row.general_role,
          specific_role: row.specific_role,
        }));

        const hasRequiredRole = userRoles.some(role =>
          requiredRoles.includes(role.general_role) ||
          (role.specific_role && requiredRoles.includes(`${role.general_role}:${role.specific_role}`))
        );

        if (!hasRequiredRole) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
      }

      next();
    } catch (error) {
      console.error('Token Verification Error:', error.message);
      console.error('Full Error:', error);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  };
};

module.exports = { authenticateToken };