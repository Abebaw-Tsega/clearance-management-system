const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getPendingRequests, takeActionOnRequest } = require('../controller/staffs');

router.get('/requests', authenticateToken(['dormitory', 'department_head', 'librarian', 'cafeteria', 'sport', 'student_affair', 'registrar']), getPendingRequests);
router.put('/requests/:request_id/action', authenticateToken(['dormitory', 'department_head', 'librarian', 'cafeteria', 'sport', 'student_affair', 'registrar']), takeActionOnRequest);

module.exports = router;