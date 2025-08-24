const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { submitClearanceRequest, getClearanceStatus, getClearanceCertificate } = require('../controller/students');

router.post('/request', authenticateToken(['student']), submitClearanceRequest);
router.get('/status', authenticateToken(['student']), getClearanceStatus);
router.get('/certificate/:request_id', authenticateToken(['student']), getClearanceCertificate);

module.exports = router;