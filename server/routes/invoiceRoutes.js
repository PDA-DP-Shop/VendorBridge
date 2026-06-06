const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticateToken } = require('../middleware/auth');

// POST /api/invoices (Generate invoice from PO)
router.post('/', authenticateToken, invoiceController.createInvoice);

// GET /api/invoices (List all invoices)
router.get('/', authenticateToken, invoiceController.getInvoices);

// GET /api/invoices/:id (Retrieve invoice details)
router.get('/:id', authenticateToken, invoiceController.getInvoiceById);

// GET /api/invoices/:id/pdf (Download invoice PDF)
router.get('/:id/pdf', authenticateToken, invoiceController.getInvoicePDF);

// POST /api/invoices/:id/email (Send invoice PDF email to vendor)
router.post('/:id/email', authenticateToken, invoiceController.sendInvoiceEmail);

// PUT /api/invoices/:id/status (Update invoice status)
router.put('/:id/status', authenticateToken, invoiceController.updateInvoiceStatus);

module.exports = router;
