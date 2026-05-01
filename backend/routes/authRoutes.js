// routes/authRoutes.js
const express = require('express');
const { register, login, updateProfile, getUsers } = require('../controllers/authController');
const { protect, allowRoles } = require('../middleware/auth');
const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.put('/profile', protect, updateProfile);
router.get('/users', protect, allowRoles('Admin', 'Supervisor'), getUsers);

module.exports = router;