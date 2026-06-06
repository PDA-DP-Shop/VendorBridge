const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, authorize } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// GET /api/auth/me (Protected route)
router.get('/me', authenticateToken, authController.getMe);

// GET /api/auth/users (Protected route, admin only)
router.get('/users', authenticateToken, authorize('admin'), authController.getAllUsers);

module.exports = router;
