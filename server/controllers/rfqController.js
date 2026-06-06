const db = require('../config/db');

/**
 * Helper to write action logs to activity_logs table
 */
const logActivity = async (userId, action, entityId, description) => {
  try {
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, 'rfq', $3, $4)`,
      [userId, action, entityId, description]
    );
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
};

/**
 * Create a new Request for Quotation (RFQ)
 * POST /api/rfqs
 */
const createRfq = async (req, res, next) => {
  const { title, description, deadline, items, vendor_ids } = req.body;

  if (!title || !deadline || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Title, deadline, and at least one item are required to create an RFQ',
    });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Auto-generate rfq_number: e.g. RFQ-2026-001
    const currentYear = new Date().getFullYear();
    const countRes = await client.query(
      `SELECT COUNT(*)::int as count
       FROM rfqs
       WHERE EXTRACT(YEAR FROM created_at) = $1`,
      [currentYear]
    );
    const nextNum = (countRes.rows[0]?.count || 0) + 1;
    const rfqNumber = `RFQ-${currentYear}-${String(nextNum).padStart(3, '0')}`;

    // 2. Insert RFQ details
    const rfqInsertRes = await client.query(
      `INSERT INTO rfqs (rfq_number, title, description, deadline, created_by, status)
       VALUES ($1, $2, $3, $4, $5, 'open')
       RETURNING *`,
      [rfqNumber, title, description || null, deadline, req.user.id]
    );
    const rfq = rfqInsertRes.rows[0];

    // 3. Insert RFQ Line Items
    for (const item of items) {
      if (!item.product_name || !item.quantity || !item.unit) {
        throw new Error('All line items must contain product_name, quantity, and unit');
      }
      await client.query(
        `INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications)
         VALUES ($1, $2, $3, $4, $5)`,
        [rfq.id, item.product_name, item.quantity, item.unit, item.specifications || null]
      );
    }

    // 4. Assign Vendors & Write notifications
    if (vendor_ids && Array.isArray(vendor_ids) && vendor_ids.length > 0) {
      for (const vendorId of vendor_ids) {
        await client.query(
          `INSERT INTO rfq_vendors (rfq_id, vendor_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [rfq.id, vendorId]
        );
      }

      // Fetch user_ids of the assigned vendors to push database notifications and socket alerts
      const vendorsRes = await client.query(
        `SELECT id, user_id, company_name FROM vendors WHERE id = ANY($1) AND user_id IS NOT NULL`,
        [vendor_ids]
      );

      // Create database notifications for each vendor user
      const { sendNotification } = require('../utils/notificationHelper');
      const io = req.app.get('io');
      for (const vendorUser of vendorsRes.rows) {
        await sendNotification(
          client,
          vendorUser.user_id,
          'New RFQ Sourcing Invite',
          `New RFQ ${title} has been created and you are invited to quote`,
          'rfq',
          rfq.id,
          io
        );
      }
      await client.query('COMMIT');
      await logActivity(req.user.id, 'CREATE', rfq.id, `Created RFQ sourcing event: "${rfqNumber}" with ${items.length} items`);
    } else {
      await client.query('COMMIT');
      await logActivity(req.user.id, 'CREATE', rfq.id, `Created RFQ sourcing event: "${rfqNumber}" (no vendors assigned)`);
    }

    res.status(201).json({
      success: true,
      rfq,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Get all RFQs with optional filters
 * GET /api/rfqs
 */
const getRfqs = async (req, res, next) => {
  const { status, startDate, endDate } = req.query;

  try {
    let queryText = `
      SELECT r.*,
        (SELECT COUNT(*)::int FROM rfq_items WHERE rfq_id = r.id) as items_count,
        (SELECT COUNT(*)::int FROM rfq_vendors WHERE rfq_id = r.id) as vendors_count,
        u.name as creator_name
      FROM rfqs r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCounter = 1;

    // Vendor users should only see RFQs they are assigned to
    if (req.user.role === 'vendor') {
      // Find vendor_id for this user
      const vendorResult = await db.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
      if (vendorResult.rows.length === 0) {
        return res.status(200).json({ success: true, rfqs: [] });
      }
      const vendorId = vendorResult.rows[0].id;
      queryParams.push(vendorId);
      queryText += ` AND r.id IN (SELECT rfq_id FROM rfq_vendors WHERE vendor_id = $${paramCounter})`;
      paramCounter++;
    }

    // Apply status filter
    if (status && status !== 'all') {
      queryParams.push(status);
      queryText += ` AND r.status = $${paramCounter}`;
      paramCounter++;
    }

    // Apply date range filters
    if (startDate) {
      queryParams.push(startDate);
      queryText += ` AND r.created_at >= $${paramCounter}`;
      paramCounter++;
    }

    if (endDate) {
      queryParams.push(endDate);
      queryText += ` AND r.created_at <= $${paramCounter}`;
      paramCounter++;
    }

    queryText += ' ORDER BY r.created_at DESC';

    const result = await db.query(queryText, queryParams);

    res.status(200).json({
      success: true,
      rfqs: result.rows || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single RFQ with items and assigned vendors
 * GET /api/rfqs/:id
 */
const getRfqById = async (req, res, next) => {
  const { id } = req.params;

  try {
    // 1. Fetch main RFQ record
    const rfqResult = await db.query(
      `SELECT r.*, u.name as creator_name
       FROM rfqs r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (rfqResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'RFQ not found',
      });
    }

    const rfq = rfqResult.rows[0];

    // Vendor Access Check: Ensure they are assigned to this RFQ
    if (req.user.role === 'vendor') {
      const vendorResult = await db.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
      if (vendorResult.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'Forbidden: Access denied' });
      }
      const vendorId = vendorResult.rows[0].id;
      const assignCheck = await db.query(
        'SELECT 1 FROM rfq_vendors WHERE rfq_id = $1 AND vendor_id = $2',
        [id, vendorId]
      );
      if (assignCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'Forbidden: Access denied' });
      }
    }

    // 2. Fetch line items
    const itemsResult = await db.query(
      'SELECT * FROM rfq_items WHERE rfq_id = $1 ORDER BY id ASC',
      [id]
    );

    // 3. Fetch invited vendors along with their quotation status
    const vendorsResult = await db.query(
      `SELECT
         v.id as vendor_id, v.company_name, v.category, v.contact_person, v.email, v.phone,
         CASE WHEN q.id IS NOT NULL THEN 'Submitted' ELSE 'Pending' END as quotation_status,
         q.id as quotation_id
       FROM vendors v
       JOIN rfq_vendors rv ON v.id = rv.vendor_id
       LEFT JOIN quotations q ON q.rfq_id = rv.rfq_id AND q.vendor_id = rv.vendor_id
       WHERE rv.rfq_id = $1
       ORDER BY v.company_name ASC`,
      [id]
    );

    res.status(200).json({
      success: true,
      rfq,
      items: itemsResult.rows || [],
      vendors: vendorsResult.rows || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update RFQ details (restricted to open status)
 * PUT /api/rfqs/:id
 */
const updateRfq = async (req, res, next) => {
  const { id } = req.params;
  const { title, description, deadline, items, vendor_ids } = req.body;

  if (!title || !deadline) {
    return res.status(400).json({
      success: false,
      message: 'Title and deadline are required parameters',
    });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Verify RFQ is still open
    const rfqCheck = await client.query('SELECT status, rfq_number FROM rfqs WHERE id = $1', [id]);
    if (rfqCheck.rows.length === 0) {
      throw new Error('RFQ not found');
    }
    const rfq = rfqCheck.rows[0];

    if (rfq.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit this RFQ: status is currently "${rfq.status}". Only "open" RFQs can be modified.`,
      });
    }

    // Update main RFQ
    await client.query(
      `UPDATE rfqs
       SET title = $1, description = $2, deadline = $3
       WHERE id = $4`,
      [title, description || null, deadline, id]
    );

    // Sync line items (Delete existing and re-insert to preserve indices cleanly)
    if (items && Array.isArray(items)) {
      await client.query('DELETE FROM rfq_items WHERE rfq_id = $1', [id]);
      for (const item of items) {
        await client.query(
          `INSERT INTO rfq_items (rfq_id, product_name, quantity, unit, specifications)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, item.product_name, item.quantity, item.unit, item.specifications || null]
        );
      }
    }

    // Sync assigned vendors
    if (vendor_ids && Array.isArray(vendor_ids)) {
      await client.query('DELETE FROM rfq_vendors WHERE rfq_id = $1', [id]);
      for (const vendorId of vendor_ids) {
        await client.query(
          `INSERT INTO rfq_vendors (rfq_id, vendor_id)
           VALUES ($1, $2)`,
          [id, vendorId]
        );
      }
    }

    await client.query('COMMIT');

    // Log update audit trail
    await logActivity(req.user.id, 'UPDATE', id, `Updated RFQ: "${rfq.rfq_number}"`);

    res.status(200).json({
      success: true,
      message: 'RFQ details updated successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Close RFQ (changes status to closed)
 * PUT /api/rfqs/:id/close
 */
const closeRfq = async (req, res, next) => {
  const { id } = req.params;

  try {
    const rfqCheck = await db.query('SELECT status, rfq_number FROM rfqs WHERE id = $1', [id]);
    if (rfqCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'RFQ not found' });
    }
    const rfq = rfqCheck.rows[0];

    if (rfq.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: `Only "open" RFQs can be closed. Current status: "${rfq.status}"`,
      });
    }

    await db.query(
      `UPDATE rfqs
       SET status = 'closed'
       WHERE id = $1`,
      [id]
    );

    // Log closure
    await logActivity(req.user.id, 'UPDATE', id, `Closed RFQ sourcing timeline: "${rfq.rfq_number}"`);

    res.status(200).json({
      success: true,
      message: `RFQ ${rfq.rfq_number} closed successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel RFQ (soft deletion -> status = cancelled)
 * DELETE /api/rfqs/:id
 */
const cancelRfq = async (req, res, next) => {
  const { id } = req.params;

  try {
    const rfqCheck = await db.query('SELECT status, rfq_number FROM rfqs WHERE id = $1', [id]);
    if (rfqCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'RFQ not found' });
    }
    const rfq = rfqCheck.rows[0];

    await db.query(
      `UPDATE rfqs
       SET status = 'cancelled'
       WHERE id = $1`,
      [id]
    );

    // Log cancellation
    await logActivity(req.user.id, 'DELETE', id, `Cancelled RFQ sourcing event: "${rfq.rfq_number}"`);

    res.status(200).json({
      success: true,
      message: `RFQ ${rfq.rfq_number} cancelled successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get RFQs assigned to currently logged-in vendor user
 * GET /api/rfqs/my-rfqs
 */
const getVendorRfqs = async (req, res, next) => {
  try {
    // Resolve vendor_id for the logged-in vendor user
    const vendorResult = await db.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
    if (vendorResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Current profile is not mapped to an active vendor record',
      });
    }
    const vendorId = vendorResult.rows[0].id;

    // Fetch assigned RFQs
    const result = await db.query(
      `SELECT r.*,
        (SELECT COUNT(*)::int FROM rfq_items WHERE rfq_id = r.id) as items_count,
        rv.invited_at
       FROM rfqs r
       JOIN rfq_vendors rv ON r.id = rv.rfq_id
       WHERE rv.vendor_id = $1
       ORDER BY rv.invited_at DESC`,
      [vendorId]
    );

    res.status(200).json({
      success: true,
      rfqs: result.rows || [],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRfq,
  getRfqs,
  getRfqById,
  updateRfq,
  closeRfq,
  cancelRfq,
  getVendorRfqs,
};
