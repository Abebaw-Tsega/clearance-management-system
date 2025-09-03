const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAllClearanceData, toggleClearanceSystem, assignRole, getAllStudents, getClearanceTypes, getRecentRequests, updateSystemControl, getClearanceSystem } = require('../controller/admins');

router.get('/data', authenticateToken(['admin', 'superadmin']), getAllClearanceData);
router.put('/system', authenticateToken(['admin']), toggleClearanceSystem);
router.post('/roles', authenticateToken(['superadmin']), assignRole);
router.get('/students', authenticateToken(['admin', 'superadmin']), getAllStudents);
router.get('/clearance-types', authenticateToken(['admin', 'superadmin']), getClearanceTypes);
router.get('/recent-requests', authenticateToken(['admin', 'superadmin']), getRecentRequests);
router.put('/system-control', authenticateToken(['admin']), updateSystemControl);
router.get('/system', authenticateToken(['admin', 'superadmin']), getClearanceSystem);


module.exports = router;