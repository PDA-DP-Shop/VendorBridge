const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const { authenticateToken, authorize } = require('../middleware/auth');

// GET /api/quotations/compare/:rfq_id (Compare all quotations side by side - internal roles only, placed before /:id)
router.get(
  '/compare/:rfq_id',
  authenticateToken,
  authorize('admin', 'procurement_officer'),
  quotationController.compareQuotations
);

// POST /api/quotations (Vendor submits a quotation)
router.post(
  '/',
  authenticateToken,
  authorize('vendor'),
  quotationController.submitQuotation
);

// GET /api/quotations (List quotations - open to authenticated roles with row filters built in controller)
router.get('/', authenticateToken, quotationController.getQuotations);

// GET /api/quotations/:id (Get single quotation details)
router.get('/:id', authenticateToken, quotationController.getQuotationById);

// PUT /api/quotations/:id (Vendor edits quotation - restricted to submitted status inside controller)
router.put(
  '/:id',
  authenticateToken,
  authorize('vendor'),
  quotationController.updateQuotation
);

// POST /api/quotations/:id/select (Select quotation for approval review)
router.post(
  '/:id/select',
  authenticateToken,
  authorize('admin', 'procurement_officer'),
  quotationController.selectQuotation
);

module.exports = router;
