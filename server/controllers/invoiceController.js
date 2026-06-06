const db = require('../config/db');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

/**
 * Helper to log Invoice activity
 */
const logActivity = async (userId, action, entityId, description) => {
  try {
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, 'invoice', $3, $4)`,
      [userId, action, entityId, description]
    );
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
};

/**
 * Helper to construct the PDF Invoice Buffer
 */
const generatePDFBuffer = (invoice, po, items, vendor) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });
    doc.on('error', reject);

    // Styling Colors
    const primaryColor = '#16a34a'; // Green brand color
    const textColor = '#1e293b'; // Slate 800
    const lightText = '#64748b'; // Slate 500
    const borderColor = '#cbd5e1'; // Slate 300
    const lightBg = '#f8fafc'; // Slate 50

    // Header Title
    doc.fillColor(primaryColor).fontSize(24).font('Helvetica-Bold').text('VendorBridge ERP', 50, 50);
    doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold').text('COMMERCIAL INVOICE', 50, 80);
    
    // Invoice Metadata (Top-Right)
    doc.fillColor(textColor).fontSize(12).font('Helvetica-Bold').text(`Invoice: ${invoice.invoice_number}`, 400, 50, { align: 'right' });
    doc.fontSize(9).font('Helvetica').fillColor(lightText);
    doc.text(`Date Issued: ${new Date(invoice.created_at).toLocaleDateString()}`, 400, 68, { align: 'right' });
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 400, 82, { align: 'right' });
    doc.text(`PO Ref: ${po.po_number}`, 400, 96, { align: 'right' });
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 400, 110, { align: 'right' });

    doc.moveDown(2);

    // Separator line
    doc.strokeColor(borderColor).lineWidth(1).moveTo(50, 135).lineTo(545, 135).stroke();

    // Bill To & Vendor details
    doc.moveDown(1.5);
    const startY = doc.y;

    // Buyer Information
    doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold').text('Bill To (Buyer):', 50, startY);
    doc.fontSize(9).font('Helvetica').fillColor(lightText);
    doc.text('VendorBridge Corporation', 50, startY + 15);
    doc.text('Procurement Operations Dept', 50, startY + 28);
    doc.text('New Delhi, India', 50, startY + 41);
    doc.text('procurement@vendorbridge.com', 50, startY + 54);

    // Supplier Information
    doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold').text('Supplier (Vendor):', 300, startY);
    doc.fontSize(9).font('Helvetica').fillColor(lightText);
    doc.text(vendor.company_name, 300, startY + 15);
    doc.text(`Contact: ${vendor.contact_person || 'N/A'}`, 300, startY + 28);
    doc.text(vendor.email, 300, startY + 41);
    doc.text(vendor.phone || 'N/A', 300, startY + 54);
    if (vendor.address) {
      doc.text(vendor.address, 300, startY + 67, { width: 245 });
    }

    doc.moveDown(4);

    // Separator
    const sepY = Math.max(doc.y, startY + 90);
    doc.strokeColor(borderColor).lineWidth(1).moveTo(50, sepY).lineTo(545, sepY).stroke();

    // Table Header
    doc.moveDown(1);
    const tableHeaderY = sepY + 15;
    doc.fillColor(textColor).fontSize(9).font('Helvetica-Bold');
    doc.text('Item / Product Name & Specifications', 55, tableHeaderY);
    doc.text('Qty', 320, tableHeaderY, { width: 40, align: 'right' });
    doc.text('Unit Price', 380, tableHeaderY, { width: 70, align: 'right' });
    doc.text('Total Price', 470, tableHeaderY, { width: 70, align: 'right' });

    doc.strokeColor(borderColor).lineWidth(0.5).moveTo(50, tableHeaderY + 15).lineTo(545, tableHeaderY + 15).stroke();

    // Table Rows
    let currentY = tableHeaderY + 23;
    doc.font('Helvetica').fontSize(9).fillColor(textColor);

    items.forEach((item) => {
      // Check if page boundary exceeded (leaving space for summary block)
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      // Title & Specs
      doc.font('Helvetica-Bold').text(item.product_name, 55, currentY, { width: 250 });
      let rowHeight = 12;
      if (item.specifications) {
        doc.font('Helvetica-Oblique').fontSize(8).fillColor(lightText).text(item.specifications, 55, currentY + 12, { width: 250 });
        doc.font('Helvetica').fontSize(9).fillColor(textColor);
        rowHeight += 12;
      }

      doc.text(item.quantity.toString(), 320, currentY, { width: 40, align: 'right' });
      doc.text(`Rs.${parseFloat(item.unit_price).toFixed(2)}`, 380, currentY, { width: 70, align: 'right' });
      doc.text(`Rs.${parseFloat(item.total_price).toFixed(2)}`, 470, currentY, { width: 70, align: 'right' });

      currentY += rowHeight + 10;
      doc.strokeColor(borderColor).lineWidth(0.3).moveTo(50, currentY - 5).lineTo(545, currentY - 5).stroke();
    });

    // Summary calculations block (Right aligned)
    const summaryStartY = currentY + 10;
    doc.fontSize(9);

    doc.font('Helvetica').fillColor(lightText).text('Subtotal:', 350, summaryStartY, { width: 100, align: 'right' });
    doc.font('Helvetica-Bold').fillColor(textColor).text(`Rs.${parseFloat(invoice.amount).toFixed(2)}`, 470, summaryStartY, { width: 70, align: 'right' });

    doc.font('Helvetica').fillColor(lightText).text('GST (18%):', 350, summaryStartY + 15, { width: 100, align: 'right' });
    doc.font('Helvetica-Bold').fillColor(textColor).text(`Rs.${parseFloat(invoice.tax_amount).toFixed(2)}`, 470, summaryStartY + 15, { width: 70, align: 'right' });

    // Grand Total Background block
    doc.rect(345, summaryStartY + 32, 200, 24).fill(lightBg);
    doc.font('Helvetica-Bold').fillColor(primaryColor).text('Grand Total:', 350, summaryStartY + 40, { width: 100, align: 'right' });
    doc.fillColor(primaryColor).text(`Rs.${parseFloat(invoice.total_amount).toFixed(2)}`, 470, summaryStartY + 40, { width: 70, align: 'right' });

    // Bank Details / Payment Terms Placeholder
    doc.font('Helvetica-Bold').fillColor(textColor).text('Payment Instructions:', 50, summaryStartY);
    doc.font('Helvetica').fontSize(8).fillColor(lightText);
    doc.text('Bank Name: Federal Reserve Bank', 50, summaryStartY + 15);
    doc.text('Account Number: 1209384910293', 50, summaryStartY + 27);
    doc.text('IFSC/Swift Code: VBRPINBBXXX', 50, summaryStartY + 39);
    doc.text('Payment Terms: Net 30 days from invoice date.', 50, summaryStartY + 51);

    // Footer note
    doc.fontSize(8).fillColor(lightText).text('Thank you for choosing VendorBridge ERP. For any inquiries, contact support@vendorbridge.com', 50, 760, { align: 'center', width: 495 });

    // ── PAID Circular Stamp (bottom-right free space) ────────────────
    if (invoice.status === 'paid') {
      const cx = 480; // center X — bottom-right free area
      const cy = 660; // center Y — below the summary block

      doc.save();

      // Outer ring
      doc.circle(cx, cy, 52)
         .lineWidth(3)
         .strokeColor('#16a34a')
         .fillOpacity(0)
         .stroke();

      // Inner ring
      doc.circle(cx, cy, 44)
         .lineWidth(1.2)
         .strokeColor('#16a34a')
         .stroke();

      // "PAID" text — large, centred
      doc.fillColor('#16a34a')
         .fillOpacity(0.85)
         .font('Helvetica-Bold')
         .fontSize(24)
         .text('PAID', cx - 44, cy - 16, { width: 88, align: 'center', lineBreak: false });

      // "CLEARED" sub-label
      doc.fillColor('#16a34a')
         .fillOpacity(0.75)
         .font('Helvetica-Bold')
         .fontSize(7)
         .text('CLEARED', cx - 44, cy + 12, { width: 88, align: 'center', characterSpacing: 2, lineBreak: false });

      // Thin divider line inside the circle
      doc.moveTo(cx - 28, cy + 8)
         .lineTo(cx + 28, cy + 8)
         .lineWidth(0.8)
         .strokeColor('#16a34a')
         .strokeOpacity(0.6)
         .stroke();

      doc.restore();
    }
    // ─────────────────────────────────────────────────────────────────

    doc.end();
  });
};

/**
 * Generate invoice from a PO
 * POST /api/invoices
 */
const createInvoice = async (req, res, next) => {
  const { po_id } = req.body;

  if (!po_id) {
    return res.status(400).json({
      success: false,
      message: 'Purchase Order ID is required to generate an Invoice.',
    });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check if invoice already exists for this PO
    const invCheck = await client.query(
      'SELECT id, invoice_number FROM invoices WHERE po_id = $1',
      [po_id]
    );

    if (invCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `An Invoice (${invCheck.rows[0].invoice_number}) has already been generated for this Purchase Order.`,
      });
    }

    // 2. Fetch PO details
    const poRes = await client.query(
      `SELECT po.*, v.company_name, v.user_id as vendor_user_id
       FROM purchase_orders po
       JOIN vendors v ON po.vendor_id = v.id
       WHERE po.id = $1`,
      [po_id]
    );

    if (poRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order not found.',
      });
    }

    const po = poRes.rows[0];

    // 3. Generate invoice_number: INV-YYYY-NNN
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const seqRes = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) as max_seq 
       FROM invoices 
       WHERE invoice_number LIKE $1`,
      [`${prefix}%`]
    );
    const nextSeq = (seqRes.rows[0]?.max_seq || 0) + 1;
    const invoice_number = `${prefix}${String(nextSeq).padStart(3, '0')}`;

    // 4. Compute default Net-30 Due Date (30 days from now)
    const due_date = new Date();
    due_date.setDate(due_date.getDate() + 30);

    // Map amounts:
    // amount = PO total_amount (subtotal)
    // tax_amount = PO tax_amount
    // total_amount = PO grand_total (final total)
    const amount = parseFloat(po.total_amount);
    const tax_amount = parseFloat(po.tax_amount);
    const total_amount = parseFloat(po.grand_total);

    // 5. Insert invoice
    const invInsert = await client.query(
      `INSERT INTO invoices (invoice_number, po_id, amount, tax_amount, total_amount, status, due_date)
       VALUES ($1, $2, $3, $4, $5, 'unpaid', $6)
       RETURNING id, invoice_number`,
      [invoice_number, po_id, amount, tax_amount, total_amount, due_date]
    );

    const invoiceId = invInsert.rows[0].id;

    // Optional: auto-promote PO status to 'completed'
    await client.query(
      "UPDATE purchase_orders SET status = 'completed' WHERE id = $1",
      [po_id]
    );

    await client.query('COMMIT');

    // 6. Log activity & save notifications
    await logActivity(
      req.user.id,
      'CREATE',
      invoiceId,
      `Generated Invoice "${invoice_number}" from Purchase Order "${po.po_number}" for vendor "${po.company_name}" (₹${total_amount.toFixed(2)}).`
    );

    const { sendNotification } = require('../utils/notificationHelper');
    const io = req.app.get('io');

    // Notify vendor user
    if (po.vendor_user_id) {
      await sendNotification(
        client,
        po.vendor_user_id,
        'Invoice Generated',
        `Invoice ${invoice_number} has been created for PO ${po.po_number}`,
        'invoice',
        invoiceId,
        io
      );
    }

    // Notify procurement officer
    if (po.created_by) {
      await sendNotification(
        client,
        po.created_by,
        'Invoice Generated',
        `Invoice ${invoice_number} has been created for PO ${po.po_number}`,
        'invoice',
        invoiceId,
        io
      );
    }

    res.status(201).json({
      success: true,
      message: `Invoice ${invoice_number} generated successfully from Purchase Order.`,
      invoice_id: invoiceId,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Retrieve list of all invoices
 * GET /api/invoices
 */
const getInvoices = async (req, res, next) => {
  const { status, vendor_id } = req.query;

  try {
    let queryText = `
      SELECT inv.*, po.po_number, v.company_name, v.id as vendor_id
      FROM invoices inv
      JOIN purchase_orders po ON inv.po_id = po.id
      JOIN vendors v ON po.vendor_id = v.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCounter = 1;

    if (status) {
      queryText += ` AND inv.status = $${paramCounter}`;
      queryParams.push(status);
      paramCounter++;
    }

    if (vendor_id) {
      queryText += ` AND v.id = $${paramCounter}`;
      queryParams.push(vendor_id);
      paramCounter++;
    }

    queryText += ' ORDER BY inv.created_at DESC';

    const result = await db.query(queryText, queryParams);

    res.status(200).json({
      success: true,
      invoices: result.rows || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve single invoice details
 * GET /api/invoices/:id
 */
const getInvoiceById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const invRes = await db.query(
      `SELECT inv.*, po.po_number, po.quotation_id, po.created_at as po_created_at,
              v.company_name, v.category, v.contact_person, v.email as vendor_email, v.phone as vendor_phone, v.address as vendor_address
       FROM invoices inv
       JOIN purchase_orders po ON inv.po_id = po.id
       JOIN vendors v ON po.vendor_id = v.id
       WHERE inv.id = $1`,
      [id]
    );

    if (invRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found.',
      });
    }

    const invoice = invRes.rows[0];

    // Fetch line items using the associated quotation
    const itemsRes = await db.query(
      `SELECT qi.*, ri.product_name, ri.quantity, ri.unit, ri.specifications
       FROM quotation_items qi
       JOIN rfq_items ri ON qi.rfq_item_id = ri.id
       WHERE qi.quotation_id = $1
       ORDER BY qi.id ASC`,
      [invoice.quotation_id]
    );

    res.status(200).json({
      success: true,
      invoice,
      items: itemsRes.rows || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate and return invoice PDF
 * GET /api/invoices/:id/pdf
 */
const getInvoicePDF = async (req, res, next) => {
  const { id } = req.params;

  try {
    // 1. Fetch invoice and related models
    const invRes = await db.query(
      `SELECT inv.*, po.po_number, po.quotation_id,
              v.company_name, v.category, v.contact_person, v.email as vendor_email, v.phone as vendor_phone, v.address as vendor_address
       FROM invoices inv
       JOIN purchase_orders po ON inv.po_id = po.id
       JOIN vendors v ON po.vendor_id = v.id
       WHERE inv.id = $1`,
      [id]
    );

    if (invRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const invoice = invRes.rows[0];

    const itemsRes = await db.query(
      `SELECT qi.*, ri.product_name, ri.quantity, ri.unit, ri.specifications
       FROM quotation_items qi
       JOIN rfq_items ri ON qi.rfq_item_id = ri.id
       WHERE qi.quotation_id = $1
       ORDER BY qi.id ASC`,
      [invoice.quotation_id]
    );

    // 2. Generate PDF using our helper
    const pdfBuffer = await generatePDFBuffer(invoice, invoice, itemsRes.rows || [], invoice);

    // 3. Set headers and stream response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invoice.invoice_number}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Send invoice PDF to supplier/vendor via email
 * POST /api/invoices/:id/email
 */
const sendInvoiceEmail = async (req, res, next) => {
  const { id } = req.params;

  try {
    // 1. Fetch details
    const invRes = await db.query(
      `SELECT inv.*, po.po_number, po.quotation_id,
              v.company_name, v.category, v.contact_person, v.email as vendor_email, v.phone as vendor_phone, v.address as vendor_address
       FROM invoices inv
       JOIN purchase_orders po ON inv.po_id = po.id
       JOIN vendors v ON po.vendor_id = v.id
       WHERE inv.id = $1`,
      [id]
    );

    if (invRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const invoice = invRes.rows[0];

    const itemsRes = await db.query(
      `SELECT qi.*, ri.product_name, ri.quantity, ri.unit, ri.specifications
       FROM quotation_items qi
       JOIN rfq_items ri ON qi.rfq_item_id = ri.id
       WHERE qi.quotation_id = $1
       ORDER BY qi.id ASC`,
      [invoice.quotation_id]
    );

    // 2. Generate PDF Buffer
    const pdfBuffer = await generatePDFBuffer(invoice, invoice, itemsRes.rows || [], invoice);

    // 3. Setup Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
      port: parseInt(process.env.EMAIL_PORT || '2525', 10),
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@vendorbridge.com',
      to: invoice.vendor_email,
      subject: `VendorBridge ERP - Commercial Invoice ${invoice.invoice_number}`,
      text: `Hello ${invoice.contact_person || invoice.company_name},\n\nPlease find attached the Commercial Invoice ${invoice.invoice_number} corresponding to Purchase Order ${invoice.po_number} (₹${parseFloat(invoice.total_amount).toFixed(2)}).\n\nBest Regards,\nProcurement Dept\nVendorBridge Corp`,
      html: `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; bg-color: #ffffff; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <!-- Brand Header -->
            <div style="background: linear-gradient(135deg, #16a34a, #14532d); padding: 32px; text-align: center;">
              <div style="display: inline-block; background: #ffffff; border-radius: 10px; width: 42px; height: 42px; line-height: 42px; font-weight: 900; color: #16a34a; font-size: 20px; margin-bottom: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center;">VB</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">VendorBridge ERP</h1>
              <p style="margin: 4px 0 0 0; color: #bbf7d0; font-size: 12px; font-weight: 500; text-transform: uppercase; tracking-wider: 1px;">Finance Desk &bull; Invoice Delivery</p>
            </div>
            
            <!-- Body Content -->
            <div style="padding: 32px; background-color: #ffffff;">
              <h2 style="margin-top: 0; margin-bottom: 14px; color: #0f172a; font-size: 18px; font-weight: 700;">Commercial Invoice Issued</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                Hello <strong>${invoice.contact_person || invoice.company_name}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                A new commercial invoice has been generated for your review. We have attached the official commercial PDF invoice document to this email.
              </p>

              <!-- Info Box Details Grid -->
              <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Invoice Number</td>
                    <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 700; text-align: right; font-family: monospace;">${invoice.invoice_number}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Purchase Order Ref</td>
                    <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 700; text-align: right; font-family: monospace;">${invoice.po_number}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Due Date</td>
                    <td style="padding: 6px 0; font-size: 13px; color: #e11d48; font-weight: 700; text-align: right;">${new Date(invoice.due_date).toLocaleDateString()}</td>
                  </tr>
                  <tr style="border-top: 1px dashed #e2e8f0;">
                    <td style="padding: 12px 0 0 0; font-size: 13px; color: #1e293b; font-weight: 800;">Total Payable</td>
                    <td style="padding: 12px 0 0 0; font-size: 17px; color: #16a34a; font-weight: 900; text-align: right;">₹${parseFloat(invoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </table>
              </div>

              <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin-bottom: 24px;">
                Payment terms are Net-30 days from invoice issuance. If you have any inquiries regarding this ledger entry, please contact our accounts payable division at <a href="mailto:accounts.payable@vendorbridge.com" style="color: #16a34a; text-decoration: none; font-weight: 600;">accounts.payable@vendorbridge.com</a>.
              </p>

              <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 12px; color: #64748b; line-height: 1.5;">
                Best Regards,<br />
                <strong style="color: #1e293b;">Accounts Payable Desk</strong><br />
                VendorBridge Corp.
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
              This is an automated notification generated by the VendorBridge ERP System.<br />
              Please do not reply directly to this mail.
            </div>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Invoice-${invoice.invoice_number}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    let emailSent = false;
    let message = `Invoice PDF successfully sent to vendor at ${invoice.vendor_email}`;

    // Verify SMTP and send with graceful offline fallback
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your_smtp_username') {
        await transporter.sendMail(mailOptions);
        emailSent = true;
      } else {
        console.warn('SMTP settings are using placeholders. Email sending simulated.');
        message = `Invoice generated and email delivery simulated to ${invoice.vendor_email} (active credentials not provided in config).`;
      }
    } catch (mailErr) {
      console.error('Mail delivery failure:', mailErr.message);
      message = `Invoice processed, email sending simulated (transporter error: ${mailErr.message})`;
    }

    // 4. Log activity
    await logActivity(
      req.user.id,
      'EMAIL_SEND',
      id,
      `Emailed invoice PDF "${invoice.invoice_number}" to vendor "${invoice.company_name}" (${invoice.vendor_email}).`
    );

    res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update invoice status (e.g., mark as paid)
 * PUT /api/invoices/:id/status
 */
const updateInvoiceStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['unpaid', 'paid', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status value.',
    });
  }

  try {
    const result = await db.query(
      `UPDATE invoices
       SET status = $1
       WHERE id = $2
       RETURNING id, invoice_number`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found.',
      });
    }

    const updatedInvoice = result.rows[0];

    // Log activity
    await logActivity(
      req.user.id,
      'STATUS_UPDATE',
      id,
      `Updated Invoice "${updatedInvoice.invoice_number}" status to "${status}".`
    );

    // ──────────────────────────────────────────────────
    // When marked as PAID → send Payment Confirmation email to vendor
    // ──────────────────────────────────────────────────
    if (status === 'paid') {
      try {
        // Fetch full invoice + vendor details
        const fullInvRes = await db.query(
          `SELECT inv.*, po.po_number, po.quotation_id,
                  v.company_name, v.contact_person, v.email AS vendor_email,
                  v.phone AS vendor_phone, v.address AS vendor_address
           FROM invoices inv
           JOIN purchase_orders po ON inv.po_id = po.id
           JOIN vendors v ON po.vendor_id = v.id
           WHERE inv.id = $1`,
          [id]
        );

        if (fullInvRes.rows.length > 0) {
          const inv = fullInvRes.rows[0];
          const paidDate = new Date().toLocaleDateString('en-IN', {
            day: '2-digit', month: 'long', year: 'numeric',
          });
          const dueDate = new Date(inv.due_date).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'long', year: 'numeric',
          });
          const issueDate = new Date(inv.created_at).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'long', year: 'numeric',
          });
          const totalFormatted = parseFloat(inv.total_amount).toLocaleString('en-IN', {
            minimumFractionDigits: 2, maximumFractionDigits: 2,
          });

          const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
            port: parseInt(process.env.EMAIL_PORT || '2525', 10),
            auth: {
              user: process.env.EMAIL_USER || '',
              pass: process.env.EMAIL_PASS || '',
            },
          });

          const paymentMailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@vendorbridge.com',
            to: inv.vendor_email,
            subject: `✅ Payment Confirmed – Invoice ${inv.invoice_number} | VendorBridge ERP`,
            text: `Hello ${inv.contact_person || inv.company_name},\n\nWe are pleased to confirm that payment for Invoice ${inv.invoice_number} (₹${totalFormatted}) has been successfully processed on ${paidDate}.\n\nThank you for your services.\n\nBest Regards,\nAccounts Payable Desk\nVendorBridge Corp.`,
            html: `
              <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f0fdf4; padding: 40px 20px; color: #1e293b; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #d1fae5; overflow: hidden; box-shadow: 0 4px 20px rgba(22, 163, 74, 0.08);">

                  <!-- Brand Header -->
                  <div style="background: linear-gradient(135deg, #16a34a 0%, #14532d 100%); padding: 36px 32px; text-align: center; position: relative;">
                    <div style="display: inline-block; background: #ffffff; border-radius: 12px; width: 48px; height: 48px; line-height: 48px; font-weight: 900; color: #16a34a; font-size: 22px; margin-bottom: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); text-align: center;">VB</div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">VendorBridge ERP</h1>
                    <p style="margin: 6px 0 0 0; color: #bbf7d0; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Finance Desk &bull; Payment Confirmation</p>
                  </div>

                  <!-- Payment Confirmed Banner -->
                  <div style="background: linear-gradient(135deg, #dcfce7, #f0fdf4); border-bottom: 2px solid #86efac; padding: 24px 32px; text-align: center;">
                    <div style="display: inline-block; background: #16a34a; border-radius: 50%; width: 52px; height: 52px; line-height: 52px; font-size: 26px; text-align: center; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(22,163,74,0.3);">✓</div>
                    <h2 style="margin: 0 0 6px 0; color: #14532d; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">Payment Successfully Received</h2>
                    <p style="margin: 0; color: #16a34a; font-size: 13px; font-weight: 600;">Your invoice has been settled in full</p>
                  </div>

                  <!-- Body Content -->
                  <div style="padding: 32px;">
                    <p style="font-size: 14px; line-height: 1.7; color: #475569; margin-bottom: 24px;">
                      Hello <strong style="color: #0f172a;">${inv.contact_person || inv.company_name}</strong>,
                    </p>
                    <p style="font-size: 14px; line-height: 1.7; color: #475569; margin-bottom: 28px;">
                      We are pleased to confirm that the payment for the following invoice has been <strong style="color: #16a34a;">successfully processed and cleared</strong>. Please retain this notification for your financial records.
                    </p>

                    <!-- Invoice Details Card -->
                    <div style="background: linear-gradient(145deg, #f8fafc, #f1f5f9); border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px; margin-bottom: 28px;">
                      <h3 style="margin: 0 0 16px 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">Payment Details</h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 7px 0; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Number</td>
                          <td style="padding: 7px 0; font-size: 13px; color: #1e293b; font-weight: 800; text-align: right; font-family: 'Courier New', monospace;">${inv.invoice_number}</td>
                        </tr>
                        <tr>
                          <td style="padding: 7px 0; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Purchase Order Ref</td>
                          <td style="padding: 7px 0; font-size: 13px; color: #1e293b; font-weight: 700; text-align: right; font-family: 'Courier New', monospace;">${inv.po_number}</td>
                        </tr>
                        <tr>
                          <td style="padding: 7px 0; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Issue Date</td>
                          <td style="padding: 7px 0; font-size: 13px; color: #1e293b; font-weight: 700; text-align: right;">${issueDate}</td>
                        </tr>
                        <tr>
                          <td style="padding: 7px 0; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Original Due Date</td>
                          <td style="padding: 7px 0; font-size: 13px; color: #64748b; font-weight: 700; text-align: right;">${dueDate}</td>
                        </tr>
                        <tr>
                          <td style="padding: 7px 0; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Payment Processed On</td>
                          <td style="padding: 7px 0; font-size: 13px; color: #16a34a; font-weight: 800; text-align: right;">${paidDate}</td>
                        </tr>
                        <tr style="border-top: 2px dashed #d1fae5;">
                          <td style="padding: 16px 0 4px 0; font-size: 14px; color: #0f172a; font-weight: 900;">Total Amount Paid</td>
                          <td style="padding: 16px 0 4px 0; font-size: 22px; color: #16a34a; font-weight: 900; text-align: right; letter-spacing: -0.5px;">₹${totalFormatted}</td>
                        </tr>
                        <tr>
                          <td colspan="2" style="text-align: right; padding: 0 0 4px 0;">
                            <span style="display: inline-block; background: #dcfce7; color: #15803d; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 3px 10px; border-radius: 20px; border: 1px solid #86efac; letter-spacing: 0.5px;">Inclusive of 18% GST</span>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- Payment Status Pill -->
                    <div style="text-align: center; margin-bottom: 28px;">
                      <div style="display: inline-block; background: #dcfce7; border: 2px solid #86efac; border-radius: 50px; padding: 10px 28px;">
                        <span style="color: #15803d; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">🟢 Payment Status: CLEARED</span>
                      </div>
                    </div>

                    <p style="font-size: 12px; line-height: 1.6; color: #64748b; margin-bottom: 28px; padding: 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px;">
                      <strong style="color: #92400e;">📋 Please Note:</strong> This is an official payment confirmation from VendorBridge Corp. You may use this as proof of payment for your accounting records. If you believe this confirmation was sent in error or have any discrepancies, please reach out immediately to <a href="mailto:accounts.payable@vendorbridge.com" style="color: #16a34a; text-decoration: none; font-weight: 600;">accounts.payable@vendorbridge.com</a>.
                    </p>

                    <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 12px; color: #64748b; line-height: 1.6;">
                      Thank you for your continued partnership with VendorBridge Corp.<br /><br />
                      Best Regards,<br />
                      <strong style="color: #1e293b;">Accounts Payable Desk</strong><br />
                      VendorBridge Corp.
                    </div>
                  </div>

                  <!-- Footer -->
                  <div style="background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                    This is an automated payment confirmation generated by the VendorBridge ERP System.<br />
                    Please do not reply directly to this email.
                  </div>
                </div>
              </div>
            `,
          };

          if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your_smtp_username') {
            await transporter.sendMail(paymentMailOptions);
            console.log(`Payment confirmation email sent to ${inv.vendor_email} for invoice ${inv.invoice_number}`);
          } else {
            console.warn(`SMTP not configured – payment confirmation email simulated for ${inv.vendor_email}`);
          }
        }
      } catch (mailErr) {
        // Non-fatal: log but don't fail the status update response
        console.error('Payment confirmation email error:', mailErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: `Invoice status updated to "${status}" successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  getInvoicePDF,
  sendInvoiceEmail,
  updateInvoiceStatus,
};
