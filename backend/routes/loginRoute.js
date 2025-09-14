const express = require('express');
const router = express.Router();
const { login, changePassword, forgotPassword,requestPasswordReset,resetPassword } = require('../controller/login');



router.post('/login', login);
router.post('/change-password', changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);

module.exports = router;