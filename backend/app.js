const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const axios = require('axios');

const loginRoutes = require('./routes/loginRoute');
const studentRoutes = require('./routes/studentRoute');
const staffRoutes = require('./routes/staffRoute');
const adminRoutes = require('./routes/adminRoute');

const bcrypt = require('bcrypt');
console.log(bcrypt.hashSync('password123', 10));
console.log('JWT_SECRET:', process.env.JWT_SECRET);

const instance = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create Uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Routes
app.use('/api', loginRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.get('/', (req, res) => {
  res.send('Welcome to the AASTU Clearance Management System API');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});