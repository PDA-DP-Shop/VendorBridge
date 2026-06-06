const express = require('express');
const router = express.Router();
const rfqController = require('../controllers/rfqController');
const { authenticateToken, authorize } = require('../middleware/auth');

// GET /api/rfqs/my-rfqs (Retrieve assigned RFQs for logged-in vendor user - must be placed before /:id)
router.get('/my-rfqs', authenticateToken, authorize('vendor'), rfqController.getVendorRfqs);

// POST /api/rfqs (Create RFQ - restricted to Admin and Procurement Officer)
router.post(
  '/',
  authenticateToken,
  authorize('admin', 'procurement_officer'),
  rfqController.createRfq
);

// GET /api/rfqs (List RFQs - open to all authenticated users)
router.get('/', authenticateToken, rfqController.getRfqs);

// GET /api/rfqs/:id (Get RFQ details with line items - open to all authenticated users)
router.get('/:id', authenticateToken, rfqController.getRfqById);

// PUT /api/rfqs/:id (Update RFQ - restricted to Admin and Procurement Officer)
router.put(
  '/:id',
  authenticateToken,
  authorize('admin', 'procurement_officer'),
  rfqController.updateRfq
);

// PUT /api/rfqs/:id/close (Close RFQ - restricted to Admin and Procurement Officer)
router.put(
  '/:id/close',
  authenticateToken,
  authorize('admin', 'procurement_officer'),
  rfqController.closeRfq
);

// DELETE /api/rfqs/:id (Cancel RFQ - restricted to Admin and Procurement Officer)
router.delete(
  '/:id',
  authenticateToken,
  authorize('admin', 'procurement_officer'),
  rfqController.cancelRfq
);

module.exports = router;
