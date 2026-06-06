const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { authenticateToken, authorize } = require('../middleware/auth');

// GET /api/approvals/pending-count (Fetch pending count - must be placed before /:id)
router.get(
  '/pending-count',
  authenticateToken,
  authorize('manager', 'admin'),
  approvalController.getPendingCount
);

// POST /api/approvals (Create approval request - procurement officer selection)
router.post(
  '/',
  authenticateToken,
  authorize('admin', 'procurement_officer'),
  approvalController.createApproval
);

// GET /api/approvals (List approvals filtered by status)
router.get('/', authenticateToken, approvalController.getApprovals);

// GET /api/approvals/:id (Get single approval request details)
router.get('/:id', authenticateToken, approvalController.getApprovalById);

// PUT /api/approvals/:id/approve (Manager approves request)
router.put(
  '/:id/approve',
  authenticateToken,
  authorize('manager', 'admin'),
  approvalController.approveRequest
);

// PUT /api/approvals/:id/reject (Manager rejects request)
router.put(
  '/:id/reject',
  authenticateToken,
  authorize('manager', 'admin'),
  approvalController.rejectRequest
);

module.exports = router;
