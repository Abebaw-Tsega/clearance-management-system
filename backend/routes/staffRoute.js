// backend/routes/staffRoute.js
const express = require('express');
const router = express.Router();
const { approveRequest, getPendingRequests, getStaffProfile } = require('../controller/staffs');
const { authenticateToken } = require('../middleware/auth');

// list all possible staff general roles
const staffRoles = [
   'department_head',
   'librarian',
   'cafeteria',
   'dormitory',
   'sport',
   'student_affair',
   'registrar'
];

// now require one of those roles
router.put(
   '/requests/:request_id/action',
   authenticateToken(staffRoles),
   approveRequest
);

router.get(
   '/requests',
   authenticateToken(staffRoles),
   getPendingRequests
);

router.get(
   '/profile',
   authenticateToken(staffRoles),
   getStaffProfile
);

module.exports = router;