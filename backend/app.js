const express = require('express');
const cors = require('cors');
require('dotenv').config();

const loginRoutes = require('./routes/loginRoute');
const studentRoutes = require('./routes/studentRoute');
const staffRoutes = require('./routes/staffRoute');
const adminRoutes = require('./routes/adminRoute');

const bcrypt = require('bcrypt');
console.log(bcrypt.hashSync('password123', 10));
console.log('JWT_SECRET:', process.env.JWT_SECRET);



const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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