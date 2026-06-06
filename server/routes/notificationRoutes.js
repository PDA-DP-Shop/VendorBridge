const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

// GET /api/notifications (Fetch current user's notifications)
router.get('/', authenticateToken, notificationController.getNotifications);

// PUT /api/notifications/read-all (Mark all as read - placed before :id/read)
router.put('/read-all', authenticateToken, notificationController.markAllAsRead);

// PUT /api/notifications/:id/read (Mark single notification as read)
router.put('/:id/read', authenticateToken, notificationController.markAsRead);

module.exports = router;
