const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
   getAllClearanceData,
   toggleClearanceSystem,
   assignRole,
   getAllStudents,
   getClearanceTypes,
   getRecentRequests,
   updateSystemControl,
   getClearanceSystem,
   getAdminProfile,
   importStudents,
   getRegistrarProfile,
   toggleAdminStatus,
   getDepartments,
   getBlocks,
   removeRole,
   getRoles,
} = require('../controller/admins');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
   destination: (req, file, cb) => {
      cb(null, 'Uploads/');
   },
   filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
   },
});
const upload = multer({
   storage,
   fileFilter: (req, file, cb) => {
      if (file.mimetype === 'text/csv') {
         cb(null, true);
      } else {
         cb(new Error('Only CSV files are allowed'), false);
      }
   },
});

router.get('/data', authenticateToken(['admin', 'superadmin']), getAllClearanceData);
router.put('/system', authenticateToken(['admin']), toggleClearanceSystem);
router.post('/roles', authenticateToken(['superadmin']), assignRole);
router.get('/students', authenticateToken(['admin', 'superadmin']), getAllStudents);
router.get('/clearance-types', authenticateToken(['admin', 'superadmin']), getClearanceTypes);
router.get('/recent-requests', authenticateToken(['admin', 'superadmin']), getRecentRequests);
router.put('/system-control', authenticateToken(['admin']), updateSystemControl);
router.get('/system', authenticateToken(['admin', 'superadmin', 'student']), getClearanceSystem);
router.get('/profile', authenticateToken(['admin', 'superadmin']), getAdminProfile);
router.post('/import-students', authenticateToken(['admin', 'superadmin']), upload.single('csvFile'), importStudents); // Updated roles
router.get('/registrar-profile', authenticateToken(['superadmin']), getRegistrarProfile); // New route for registrar profile
router.put('/roles/:user_id', authenticateToken(['superadmin']), toggleAdminStatus); // New route to activate/deactivate admin accounts
router.get('/departments', authenticateToken(['superadmin']), getDepartments);
router.get('/blocks', authenticateToken(['superadmin']), getBlocks);
router.delete('/roles/:user_id', authenticateToken(['superadmin']), removeRole); // New route to remove staff role
router.get('/roles', authenticateToken(['superadmin']), getRoles); // New route to get all roles

module.exports = router;