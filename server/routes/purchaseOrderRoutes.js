const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const { authenticateToken } = require('../middleware/auth');

// POST /api/purchase-orders (Generate PO from quotation)
router.post('/', authenticateToken, purchaseOrderController.createPO);

// GET /api/purchase-orders (List all POs)
router.get('/', authenticateToken, purchaseOrderController.getPOs);

// GET /api/purchase-orders/:id (Retrieve single PO detail)
router.get('/:id', authenticateToken, purchaseOrderController.getPOById);

// PUT /api/purchase-orders/:id/status (Update PO status)
router.put('/:id/status', authenticateToken, purchaseOrderController.updatePOStatus);

module.exports = router;
