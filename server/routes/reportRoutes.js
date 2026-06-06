const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Apply auth and staff constraints to all analytics report endpoints
router.use(authenticateToken);
router.use(authorize('admin', 'manager', 'procurement_officer'));

// GET /api/reports/vendor-performance (Top 10 vendors by won PO total amount)
router.get('/vendor-performance', reportController.getVendorPerformance);

// GET /api/reports/spending-summary (Total spending by month, category, and vendor)
router.get('/spending-summary', reportController.getSpendingSummary);

// GET /api/reports/procurement-stats (Procurement KPI aggregates)
router.get('/procurement-stats', reportController.getProcurementStats);

// GET /api/reports/export (CSV file download generation)
router.get('/export', reportController.exportEntityData);

module.exports = router;
