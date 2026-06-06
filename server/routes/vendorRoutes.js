const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { authenticateToken, authorize } = require('../middleware/auth');

// GET /api/vendors/categories (Get unique categories - must be declared before /:id)
router.get('/categories', authenticateToken, vendorController.getCategories);

// POST /api/vendors (Create vendor - restricted to Admin and Procurement Officer)
router.post(
  '/',
  authenticateToken,
  authorize('admin', 'procurement_officer'),
  vendorController.createVendor
);

// GET /api/vendors (List vendors with search/filters - open to all authenticated users)
router.get('/', authenticateToken, vendorController.getVendors);

// GET /api/vendors/:id (Retrieve single vendor detail - open to all authenticated users)
router.get('/:id', authenticateToken, vendorController.getVendorById);

// PUT /api/vendors/:id (Update vendor details - restricted to Admin and Procurement Officer)
router.put(
  '/:id',
  authenticateToken,
  authorize('admin', 'procurement_officer'),
  vendorController.updateVendor
);

// DELETE /api/vendors/:id (Soft delete vendor - restricted to Admin and Procurement Officer)
router.delete(
  '/:id',
  authenticateToken,
  authorize('admin', 'procurement_officer'),
  vendorController.deleteVendor
);

module.exports = router;
