const db = require('../config/db');

/**
 * Helper to log PO activity
 */
const logActivity = async (userId, action, entityId, description) => {
  try {
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, 'purchase_order', $3, $4)`,
      [userId, action, entityId, description]
    );
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
};

/**
 * Generate a new Purchase Order from an approved quotation
 * POST /api/purchase-orders
 */
const createPO = async (req, res, next) => {
  const { quotation_id, notes } = req.body;

  if (!quotation_id) {
    return res.status(400).json({
      success: false,
      message: 'Quotation ID is required to generate a Purchase Order.',
    });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check if PO already exists for this quotation
    const poCheck = await client.query(
      'SELECT id, po_number FROM purchase_orders WHERE quotation_id = $1',
      [quotation_id]
    );

    if (poCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `A Purchase Order (${poCheck.rows[0].po_number}) has already been generated for this quotation.`,
      });
    }

    // 2. Fetch quotation details (must be approved/selected)
    const quoteRes = await client.query(
      `SELECT q.*, v.company_name, v.user_id as vendor_user_id, r.title as rfq_title, r.rfq_number
       FROM quotations q
       JOIN vendors v ON q.vendor_id = v.id
       JOIN rfqs r ON q.rfq_id = r.id
       WHERE q.id = $1`,
      [quotation_id]
    );

    if (quoteRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found.',
      });
    }

    const quotation = quoteRes.rows[0];

    if (quotation.status !== 'selected') {
      return res.status(400).json({
        success: false,
        message: `Purchase Orders can only be generated from approved quotations. Current status: "${quotation.status}".`,
      });
    }

    // 3. Generate po_number: PO-YYYY-NNN
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;
    const seqRes = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM '[0-9]+$') AS INTEGER)), 0) as max_seq 
       FROM purchase_orders 
       WHERE po_number LIKE $1`,
      [`${prefix}%`]
    );
    const nextSeq = (seqRes.rows[0]?.max_seq || 0) + 1;
    const po_number = `${prefix}${String(nextSeq).padStart(3, '0')}`;

    // 4. Calculate Tax and Grand Total (18% default GST)
    const total_amount = parseFloat(quotation.total_amount);
    const tax_rate = 0.18;
    const tax_amount = parseFloat((total_amount * tax_rate).toFixed(2));
    const grand_total = parseFloat((total_amount + tax_amount).toFixed(2));

    // 5. Insert PO
    const poInsert = await client.query(
      `INSERT INTO purchase_orders (po_number, quotation_id, vendor_id, total_amount, tax_amount, grand_total, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7)
       RETURNING id, po_number`,
      [po_number, quotation_id, quotation.vendor_id, total_amount, tax_amount, grand_total, req.user.id]
    );

    const poId = poInsert.rows[0].id;

    await client.query('COMMIT');

    // 6. Log activity
    await logActivity(
      req.user.id,
      'CREATE',
      poId,
      `Generated Purchase Order "${po_number}" for vendor "${quotation.company_name}" (₹${grand_total.toFixed(2)} inclusive of 18% GST).`
    );

    // 7. Emit socket events & save notifications
    const { sendNotification } = require('../utils/notificationHelper');
    const io = req.app.get('io');
    
    // Notify vendor user
    if (quotation.vendor_user_id) {
      await sendNotification(
        client,
        quotation.vendor_user_id,
        'Purchase Order Issued',
        `Purchase Order ${po_number} has been generated for ${quotation.company_name}`,
        'purchase_order',
        poId,
        io
      );
    }

    // Notify procurement officer
    await sendNotification(
      client,
      req.user.id,
      'Purchase Order Generated',
      `Purchase Order ${po_number} has been generated for ${quotation.company_name}`,
      'purchase_order',
      poId,
      io
    );

    res.status(201).json({
      success: true,
      message: `Purchase Order ${po_number} generated successfully.`,
      po_id: poId,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Retrieve list of all Purchase Orders
 * GET /api/purchase-orders
 */
const getPOs = async (req, res, next) => {
  const { status, vendor_id, start_date, end_date } = req.query;

  try {
    let queryText = `
      SELECT po.*, v.company_name, v.category, r.title as rfq_title, r.rfq_number
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN quotations q ON po.quotation_id = q.id
      LEFT JOIN rfqs r ON q.rfq_id = r.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCounter = 1;

    if (status) {
      queryText += ` AND po.status = $${paramCounter}`;
      queryParams.push(status);
      paramCounter++;
    }

    if (vendor_id) {
      queryText += ` AND po.vendor_id = $${paramCounter}`;
      queryParams.push(vendor_id);
      paramCounter++;
    }

    if (start_date) {
      queryText += ` AND po.created_at >= $${paramCounter}`;
      queryParams.push(start_date);
      paramCounter++;
    }

    if (end_date) {
      queryText += ` AND po.created_at <= $${paramCounter}`;
      queryParams.push(end_date);
      paramCounter++;
    }

    queryText += ' ORDER BY po.created_at DESC';

    const result = await db.query(queryText, queryParams);

    res.status(200).json({
      success: true,
      purchaseOrders: result.rows || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve single Purchase Order details including items list
 * GET /api/purchase-orders/:id
 */
const getPOById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const poRes = await db.query(
      `SELECT po.*, v.company_name, v.category, v.contact_person, v.email as vendor_email, v.phone as vendor_phone, v.address as vendor_address,
              r.title as rfq_title, r.rfq_number, u.name as officer_name, inv.id as invoice_id, inv.invoice_number
       FROM purchase_orders po
       JOIN vendors v ON po.vendor_id = v.id
       LEFT JOIN quotations q ON po.quotation_id = q.id
       LEFT JOIN rfqs r ON q.rfq_id = r.id
       LEFT JOIN users u ON po.created_by = u.id
       LEFT JOIN invoices inv ON po.id = inv.po_id
       WHERE po.id = $1`,
      [id]
    );

    if (poRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order not found.',
      });
    }

    const po = poRes.rows[0];

    // Fetch original items pricing from quotation items mapping
    const itemsRes = await db.query(
      `SELECT qi.*, ri.product_name, ri.quantity, ri.unit, ri.specifications
       FROM quotation_items qi
       JOIN rfq_items ri ON qi.rfq_item_id = ri.id
       WHERE qi.quotation_id = $1
       ORDER BY qi.id ASC`,
      [po.quotation_id]
    );

    res.status(200).json({
      success: true,
      purchaseOrder: po,
      items: itemsRes.rows || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Purchase Order status
 * PUT /api/purchase-orders/:id/status
 */
const updatePOStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['draft', 'sent', 'acknowledged', 'completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status value.',
    });
  }

  try {
    const result = await db.query(
      `UPDATE purchase_orders
       SET status = $1
       WHERE id = $2
       RETURNING id, po_number`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Purchase Order not found.',
      });
    }

    const po = result.rows[0];

    // Log activity
    await logActivity(
      req.user.id,
      'STATUS_UPDATE',
      id,
      `Updated Purchase Order "${po.po_number}" status to "${status}".`
    );

    res.status(200).json({
      success: true,
      message: `Purchase Order status updated to "${status}" successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPO,
  getPOs,
  getPOById,
  updatePOStatus,
};
