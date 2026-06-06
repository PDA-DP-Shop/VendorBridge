const db = require('../config/db');

/**
 * Helper to write action logs to activity_logs table
 */
const logActivity = async (userId, action, entityId, description) => {
  try {
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, 'quotation', $3, $4)`,
      [userId, action, entityId, description]
    );
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
};

/**
 * Submit a new quotation bid
 * POST /api/quotations
 */
const submitQuotation = async (req, res, next) => {
  const { rfq_id, delivery_days, notes, items } = req.body;

  if (!rfq_id || !delivery_days || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'RFQ ID, delivery timeline, and pricing details are required to submit a quotation.',
    });
  }

  // 1. Resolve vendor_id for the logged-in vendor user
  let vendorResult;
  try {
    vendorResult = await db.query('SELECT id, company_name FROM vendors WHERE user_id = $1', [req.user.id]);
    if (vendorResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Current profile is not mapped to an active vendor record.',
      });
    }
  } catch (err) {
    return next(err);
  }

  const vendorId = vendorResult.rows[0].id;
  const vendorName = vendorResult.rows[0].company_name;

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 2. Validate vendor is assigned to the RFQ
    const assignmentCheck = await client.query(
      'SELECT 1 FROM rfq_vendors WHERE rfq_id = $1 AND vendor_id = $2',
      [rfq_id, vendorId]
    );
    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not assigned to bid on this Request for Quotation (RFQ).',
      });
    }

    // 3. Verify RFQ is open
    const rfqCheck = await client.query('SELECT status, title, rfq_number FROM rfqs WHERE id = $1', [rfq_id]);
    if (rfqCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'RFQ not found' });
    }
    const rfq = rfqCheck.rows[0];
    if (rfq.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: `Bidding timeline is locked. RFQ status is currently "${rfq.status}".`,
      });
    }

    // 4. Verify no previous quotation submitted by this vendor for this RFQ
    const duplicateCheck = await client.query(
      'SELECT id FROM quotations WHERE rfq_id = $1 AND vendor_id = $2',
      [rfq_id, vendorId]
    );
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Quotation has already been submitted for this sourcing event. Please edit your existing quote instead.',
      });
    }

    // 5. Fetch RFQ Line Items to compute item total prices and grand total
    const rfqItemsRes = await client.query(
      'SELECT id, quantity FROM rfq_items WHERE rfq_id = $1',
      [rfq_id]
    );
    const rfqItemMap = {};
    rfqItemsRes.rows.forEach(item => {
      rfqItemMap[item.id] = parseInt(item.quantity, 10);
    });

    let totalAmount = 0.00;
    const computedItems = [];

    // Verify all items are submitted and prices are valid
    for (const item of items) {
      const quantity = rfqItemMap[item.rfq_item_id];
      if (!quantity) {
        throw new Error(`Invalid line item reference (rfq_item_id: ${item.rfq_item_id}) for this RFQ.`);
      }
      const unitPrice = parseFloat(item.unit_price);
      if (isNaN(unitPrice) || unitPrice < 0) {
        throw new Error('All unit prices must be non-negative numeric values.');
      }
      const totalPrice = quantity * unitPrice;
      totalAmount += totalPrice;

      computedItems.push({
        rfq_item_id: item.rfq_item_id,
        unit_price: unitPrice,
        total_price: totalPrice,
      });
    }

    // 6. Save quotation metadata
    const quoteInsertRes = await client.query(
      `INSERT INTO quotations (rfq_id, vendor_id, total_amount, delivery_days, notes, status)
       VALUES ($1, $2, $3, $4, $5, 'submitted')
       RETURNING *`,
      [rfq_id, vendorId, totalAmount, parseInt(delivery_days, 10), notes || null]
    );
    const quotation = quoteInsertRes.rows[0];

    // 7. Save quotation line items
    for (const item of computedItems) {
      await client.query(
        `INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price)
         VALUES ($1, $2, $3, $4)`,
        [quotation.id, item.rfq_item_id, item.unit_price, item.total_price]
      );
    }

    // 8. Fetch procurement officers and admins to notify
    const staffRes = await client.query(
      "SELECT id FROM users WHERE role IN ('admin', 'procurement_officer')"
    );

    // Save notification entries in DB
    const { sendNotification } = require('../utils/notificationHelper');
    const io = req.app.get('io');
    for (const staff of staffRes.rows) {
      await sendNotification(
        client,
        staff.id,
        'New Quotation Submitted',
        `Vendor ${vendorName} submitted a quotation for ${rfq.title}`,
        'quotation',
        quotation.id,
        io
      );
    }

    await client.query('COMMIT');

    // Log this creation activity
    await logActivity(req.user.id, 'CREATE', quotation.id, `Submitted quotation bid for RFQ "${rfq.rfq_number}"`);

    res.status(201).json({
      success: true,
      quotation,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Retrieve quotations list with filters
 * GET /api/quotations
 */
const getQuotations = async (req, res, next) => {
  const { rfq_id } = req.query;

  try {
    let queryText = '';
    const queryParams = [];

    if (req.user.role === 'vendor') {
      // Vendors see only their own quotations
      const vendorResult = await db.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
      if (vendorResult.rows.length === 0) {
        return res.status(200).json({ success: true, quotations: [] });
      }
      const vendorId = vendorResult.rows[0].id;
      queryParams.push(vendorId);

      queryText = `
        SELECT q.*, r.title as rfq_title, r.rfq_number, v.company_name
        FROM quotations q
        JOIN rfqs r ON q.rfq_id = r.id
        JOIN vendors v ON q.vendor_id = v.id
        WHERE q.vendor_id = $1
      `;

      if (rfq_id) {
        queryParams.push(rfq_id);
        queryText += ' AND q.rfq_id = $2';
      }

      queryText += ' ORDER BY q.submitted_at DESC';
    } else {
      // Staff see all quotations, possibly filtered by RFQ
      queryText = `
        SELECT q.*, r.title as rfq_title, r.rfq_number, v.company_name, v.category
        FROM quotations q
        JOIN rfqs r ON q.rfq_id = r.id
        JOIN vendors v ON q.vendor_id = v.id
        WHERE 1=1
      `;

      if (rfq_id) {
        queryParams.push(rfq_id);
        queryText += ' AND q.rfq_id = $1';
        queryText += ' ORDER BY q.total_amount ASC'; // For internal view, sort by lowest price first when filtering a specific RFQ
      } else {
        queryText += ' ORDER BY q.submitted_at DESC';
      }
    }

    const result = await db.query(queryText, queryParams);

    res.status(200).json({
      success: true,
      quotations: result.rows || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve quotation details with items
 * GET /api/quotations/:id
 */
const getQuotationById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const quoteRes = await db.query(
      `SELECT q.*, r.title as rfq_title, r.rfq_number, r.deadline as rfq_deadline, r.status as rfq_status,
              v.company_name, v.category, v.contact_person, v.email, v.phone
       FROM quotations q
       JOIN rfqs r ON q.rfq_id = r.id
       JOIN vendors v ON q.vendor_id = v.id
       WHERE q.id = $1`,
      [id]
    );

    if (quoteRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found.',
      });
    }

    const quotation = quoteRes.rows[0];

    // Access control: Vendors cannot view other vendors' quotations
    if (req.user.role === 'vendor') {
      const vendorResult = await db.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
      if (vendorResult.rows.length === 0 || vendorResult.rows[0].id !== quotation.vendor_id) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Access denied.',
        });
      }
    }

    const itemsRes = await db.query(
      `SELECT qi.*, ri.product_name, ri.quantity, ri.unit, ri.specifications
       FROM quotation_items qi
       JOIN rfq_items ri ON qi.rfq_item_id = ri.id
       WHERE qi.quotation_id = $1
       ORDER BY qi.id ASC`,
      [id]
    );

    res.status(200).json({
      success: true,
      quotation,
      items: itemsRes.rows || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update vendor quotation (only allowed if status = 'submitted')
 * PUT /api/quotations/:id
 */
const updateQuotation = async (req, res, next) => {
  const { id } = req.params;
  const { delivery_days, notes, items } = req.body;

  if (!delivery_days || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Delivery days and items pricing structures are required.',
    });
  }

  // Find vendor profile
  const vendorResult = await db.query('SELECT id FROM vendors WHERE user_id = $1', [req.user.id]);
  if (vendorResult.rows.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Current profile is not mapped to an active vendor record.',
    });
  }
  const vendorId = vendorResult.rows[0].id;

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verify quotation exists, is owned by this vendor, and is still in 'submitted' status
    const quoteCheck = await client.query(
      'SELECT vendor_id, status, rfq_id FROM quotations WHERE id = $1',
      [id]
    );
    if (quoteCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }
    const quotation = quoteCheck.rows[0];

    if (quotation.vendor_id !== vendorId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied.' });
    }

    if (quotation.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit this quotation. Current status is "${quotation.status}". Only "submitted" bids can be modified.`,
      });
    }

    // Verify RFQ is still open
    const rfqCheck = await client.query('SELECT status, rfq_number FROM rfqs WHERE id = $1', [quotation.rfq_id]);
    if (rfqCheck.rows[0]?.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'The sourcing event timeline is closed. No adjustments allowed.',
      });
    }

    // 2. Fetch RFQ Item quantities
    const rfqItemsRes = await client.query(
      'SELECT id, quantity FROM rfq_items WHERE rfq_id = $1',
      [quotation.rfq_id]
    );
    const rfqItemMap = {};
    rfqItemsRes.rows.forEach(item => {
      rfqItemMap[item.id] = parseInt(item.quantity, 10);
    });

    let totalAmount = 0.00;
    const computedItems = [];

    for (const item of items) {
      const quantity = rfqItemMap[item.rfq_item_id];
      if (!quantity) {
        throw new Error('Invalid line item reference.');
      }
      const unitPrice = parseFloat(item.unit_price);
      if (isNaN(unitPrice) || unitPrice < 0) {
        throw new Error('All unit prices must be non-negative numeric values.');
      }
      const totalPrice = quantity * unitPrice;
      totalAmount += totalPrice;

      computedItems.push({
        rfq_item_id: item.rfq_item_id,
        unit_price: unitPrice,
        total_price: totalPrice,
      });
    }

    // 3. Delete old items and insert updated ones
    await client.query('DELETE FROM quotation_items WHERE quotation_id = $1', [id]);
    for (const item of computedItems) {
      await client.query(
        `INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price)
         VALUES ($1, $2, $3, $4)`,
        [id, item.rfq_item_id, item.unit_price, item.total_price]
      );
    }

    // 4. Update quotation metadata
    await client.query(
      `UPDATE quotations
       SET total_amount = $1, delivery_days = $2, notes = $3, submitted_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [totalAmount, parseInt(delivery_days, 10), notes || null, id]
    );

    await client.query('COMMIT');

    // Log update activity
    await logActivity(req.user.id, 'UPDATE', id, `Updated quotation bid pricing for RFQ "${rfqCheck.rows[0].rfq_number}"`);

    res.status(200).json({
      success: true,
      message: 'Quotation updated successfully.',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Compare all quotations for an RFQ side by side
 * GET /api/quotations/compare/:rfq_id
 */
const compareQuotations = async (req, res, next) => {
  const { rfq_id } = req.params;

  try {
    // 1. Fetch RFQ details
    const rfqRes = await db.query('SELECT * FROM rfqs WHERE id = $1', [rfq_id]);
    if (rfqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'RFQ not found.' });
    }
    const rfq = rfqRes.rows[0];

    // 2. Fetch all RFQ line items
    const rfqItemsRes = await db.query(
      'SELECT id, product_name, quantity, unit, specifications FROM rfq_items WHERE rfq_id = $1 ORDER BY id ASC',
      [rfq_id]
    );
    const rfqItems = rfqItemsRes.rows || [];

    // 3. Fetch all quotations submitted for this RFQ
    const quotationsRes = await db.query(
      `SELECT q.*, v.company_name, v.category, v.email, v.phone
       FROM quotations q
       JOIN vendors v ON q.vendor_id = v.id
       WHERE q.rfq_id = $1
       ORDER BY q.total_amount ASC`,
      [rfq_id]
    );
    const quotations = quotationsRes.rows || [];

    // 4. Fetch all quotation items for these quotations
    const qItemsRes = await db.query(
      `SELECT qi.*, q.vendor_id
       FROM quotation_items qi
       JOIN quotations q ON qi.quotation_id = q.id
       WHERE q.rfq_id = $1`,
      [rfq_id]
    );
    const qItems = qItemsRes.rows || [];

    // Organize items into a convenient comparison structure
    // We want to find the lowest price per RFQ item row
    const itemLowestPriceMap = {};
    rfqItems.forEach(item => {
      // Find all quotes matching this item and determine the lowest unit price
      const matchingBids = qItems.filter(qi => qi.rfq_item_id === item.id);
      if (matchingBids.length > 0) {
        const prices = matchingBids.map(b => parseFloat(b.unit_price));
        itemLowestPriceMap[item.id] = Math.min(...prices);
      } else {
        itemLowestPriceMap[item.id] = null;
      }
    });

    // Build comparisonMatrix rows
    const comparisonMatrix = rfqItems.map(item => {
      const bidsByVendor = {};
      const lowestPrice = itemLowestPriceMap[item.id];

      quotations.forEach(q => {
        const bid = qItems.find(qi => qi.quotation_id === q.id && qi.rfq_item_id === item.id);
        if (bid) {
          const uPrice = parseFloat(bid.unit_price);
          bidsByVendor[q.vendor_id] = {
            unit_price: uPrice,
            total_price: parseFloat(bid.total_price),
            is_lowest: lowestPrice !== null && uPrice === lowestPrice,
          };
        } else {
          bidsByVendor[q.vendor_id] = null; // No bid submitted for this specific item (should not normally happen if frontend forces all items)
        }
      });

      return {
        rfq_item_id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit: item.unit,
        specifications: item.specifications,
        bids: bidsByVendor,
      };
    });

    // Find the cheapest overall quotation grand total
    let lowestGrandTotal = null;
    if (quotations.length > 0) {
      const totals = quotations.map(q => parseFloat(q.total_amount));
      lowestGrandTotal = Math.min(...totals);
    }

    res.status(200).json({
      success: true,
      rfq,
      rfqItems,
      quotations: quotations.map(q => ({
        ...q,
        is_cheapest_total: lowestGrandTotal !== null && parseFloat(q.total_amount) === lowestGrandTotal,
      })),
      comparisonMatrix,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Select a quotation and initiate manager approval workflow
 * POST /api/quotations/:id/select
 */
const selectQuotation = async (req, res, next) => {
  const { id } = req.params;

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch quotation details along with RFQ number and vendor company details
    const quoteRes = await client.query(
      `SELECT q.*, r.rfq_number, r.title as rfq_title, v.company_name, v.user_id as vendor_user_id
       FROM quotations q
       JOIN rfqs r ON q.rfq_id = r.id
       JOIN vendors v ON q.vendor_id = v.id
       WHERE q.id = $1`,
      [id]
    );

    if (quoteRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found.',
      });
    }

    const quotation = quoteRes.rows[0];

    // Verify it is not already rejected/selected/under_review
    if (quotation.status === 'selected') {
      return res.status(400).json({
        success: false,
        message: 'This quotation has already been selected and finalized.',
      });
    }

    // 2. Set quotation status to 'under_review'
    await client.query(
      `UPDATE quotations
       SET status = 'under_review'
       WHERE id = $1`,
      [id]
    );

    // 3. Create or update approval record to status 'pending'
    const approvalCheck = await client.query(
      'SELECT id FROM approvals WHERE quotation_id = $1',
      [id]
    );

    let approvalId;
    if (approvalCheck.rows.length === 0) {
      const approvalInsert = await client.query(
        `INSERT INTO approvals (quotation_id, status, remarks)
         VALUES ($1, 'pending', 'Quotation selected by procurement officer. Pending manager approval.')
         RETURNING id`,
        [id]
      );
      approvalId = approvalInsert.rows[0].id;
    } else {
      approvalId = approvalCheck.rows[0].id;
      await client.query(
        `UPDATE approvals
         SET status = 'pending', action_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [approvalId]
      );
    }

    // 4. Fetch all managers and admins to notify
    const managersRes = await client.query(
      "SELECT id FROM users WHERE role IN ('manager', 'admin')"
    );

    // Create notifications for managers and admins
    for (const manager of managersRes.rows) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message)
         VALUES ($1, $2, $3)`,
        [
          manager.id,
          'Quotation Selected for Approval',
          `Quotation bid from "${quotation.company_name}" for RFQ ${quotation.rfq_number} (₹${parseFloat(quotation.total_amount).toFixed(2)}) has been selected and requires your approval review.`,
        ]
      );
    }

    await client.query('COMMIT');

    // Log this selection
    await logActivity(
      req.user.id,
      'SELECT',
      id,
      `Selected quotation from "${quotation.company_name}" for RFQ "${quotation.rfq_number}" (₹${parseFloat(quotation.total_amount).toFixed(2)})`
    );

    // Emit socket event to managers and admins
    const io = req.app.get('io');
    if (io) {
      managersRes.rows.forEach(manager => {
        io.to(`user_${manager.id}`).emit('approval_request', {
          approval_id: approvalId,
          quotation_id: id,
          rfq_number: quotation.rfq_number,
          rfq_title: quotation.rfq_title,
          vendor_name: quotation.company_name,
          total_amount: parseFloat(quotation.total_amount),
        });
      });
    }

    res.status(200).json({
      success: true,
      message: `Quotation from "${quotation.company_name}" selected and sent to managers for approval.`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

module.exports = {
  submitQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  compareQuotations,
  selectQuotation,
};
