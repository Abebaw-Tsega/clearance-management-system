const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { submitClearanceRequest, getClearanceStatus, getStudentProfile } = require('../controller/students');
const { generateCertificate } = require('../controller/certificate');


router.post('/request', authenticateToken(['student']), submitClearanceRequest);
router.get('/status', authenticateToken(['student']), getClearanceStatus);
router.get('/profile', authenticateToken(['student']), getStudentProfile);
router.get('/certificate/:requestId', authenticateToken(['student']), generateCertificate);

module.exports = router;