const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAllClearanceData, toggleClearanceSystem, assignRole } = require('../controller/admins');

router.get('/data', authenticateToken(['admin', 'superadmin']), getAllClearanceData);
router.put('/system', authenticateToken(['admin']), toggleClearanceSystem);
router.post('/roles', authenticateToken(['superadmin']), assignRole);

module.exports = router;