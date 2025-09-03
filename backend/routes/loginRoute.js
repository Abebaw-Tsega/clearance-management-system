const express = require('express');
const router = express.Router();
const { login, changePassword, staffLogin } = require('../controller/login');

router.post('/login', login);
router.post('/change-password', changePassword);
// router.post('/staff/login', staffLogin);

module.exports = router;