const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLogController');
const { authenticateToken, authorize } = require('../middleware/auth');

// GET /api/activity-logs (Admin only, paginated with filters)
router.get('/', authenticateToken, authorize('admin'), activityLogController.getActivityLogs);

module.exports = router;
