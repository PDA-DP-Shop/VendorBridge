const db = require('../config/db');

/**
 * Helper to write action logs to activity_logs table
 */
const logActivity = async (userId, action, entityId, description) => {
  try {
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, 'approval', $3, $4)`,
      [userId, action, entityId, description]
    );
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
};

/**
 * Create a new approval request (Procurement Officer selects a quotation)
 * POST /api/approvals
 */
const createApproval = async (req, res, next) => {
  const { quotation_id } = req.body;

  if (!quotation_id) {
    return res.status(400).json({
      success: false,
      message: 'Quotation ID is required to request approval review.',
    });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch quotation details along with RFQ number, title, and vendor info
    const quoteRes = await client.query(
      `SELECT q.*, r.rfq_number, r.title as rfq_title, v.company_name
       FROM quotations q
       JOIN rfqs r ON q.rfq_id = r.id
       JOIN vendors v ON q.vendor_id = v.id
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

    // Check status
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
      [quotation_id]
    );

    // 3. Create or update approval record with status 'pending'
    const approvalCheck = await client.query(
      'SELECT id FROM approvals WHERE quotation_id = $1',
      [quotation_id]
    );

    let approvalId;
    if (approvalCheck.rows.length === 0) {
      const approvalInsert = await client.query(
        `INSERT INTO approvals (quotation_id, status, remarks)
         VALUES ($1, 'pending', 'Quotation selected by procurement officer. Pending manager approval review.')
         RETURNING id`,
        [quotation_id]
      );
      approvalId = approvalInsert.rows[0].id;
    } else {
      approvalId = approvalCheck.rows[0].id;
      await client.query(
        `UPDATE approvals
         SET status = 'pending', action_at = CURRENT_TIMESTAMP, approver_id = NULL
         WHERE id = $1`,
        [approvalId]
      );
    }

    // 4. Fetch all managers to notify in DB & push Socket.io events
    const managersRes = await client.query(
      "SELECT id FROM users WHERE role IN ('manager', 'admin')"
    );

    const { sendNotification } = require('../utils/notificationHelper');
    const io = req.app.get('io');
    for (const manager of managersRes.rows) {
      await sendNotification(
        client,
        manager.id,
        'Quotation Selected for Approval',
        `New approval request for quotation from ${quotation.company_name} on ${quotation.rfq_title}`,
        'approval',
        approvalId,
        io
      );

      if (io) {
        io.to(`user_${manager.id}`).emit('approval_request', {
          approval_id: approvalId,
          quotation_id: quotation_id,
          rfq_number: quotation.rfq_number,
          rfq_title: quotation.rfq_title,
          vendor_name: quotation.company_name,
          total_amount: parseFloat(quotation.total_amount),
        });
      }
    }

    await client.query('COMMIT');

    // Log this selection activity
    await logActivity(
      req.user.id,
      'SELECT',
      approvalId,
      `Selected quotation from "${quotation.company_name}" for RFQ "${quotation.rfq_number}" (₹${parseFloat(quotation.total_amount).toFixed(2)}) for manager approval.`
    );

    res.status(201).json({
      success: true,
      message: `Quotation from "${quotation.company_name}" selected and sent to managers for approval review.`,
      approval_id: approvalId,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Retrieve approvals list
 * GET /api/approvals
 */
const getApprovals = async (req, res, next) => {
  const { status } = req.query;

  try {
    let queryText = `
      SELECT a.*, q.total_amount, q.delivery_days, q.submitted_at,
             v.company_name, v.category,
             r.title as rfq_title, r.rfq_number,
             u_off.name as officer_name
      FROM approvals a
      JOIN quotations q ON a.quotation_id = q.id
      JOIN vendors v ON q.vendor_id = v.id
      JOIN rfqs r ON q.rfq_id = r.id
      LEFT JOIN users u_off ON r.created_by = u_off.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCounter = 1;

    // Default filters: Managers see pending approvals by default if filter not specified
    if (req.user.role === 'manager' && !status) {
      queryText += ` AND a.status = $${paramCounter}`;
      queryParams.push('pending');
      paramCounter++;
    } else if (status && status !== 'all') {
      queryText += ` AND a.status = $${paramCounter}`;
      queryParams.push(status);
      paramCounter++;
    }

    queryText += ' ORDER BY a.action_at DESC';

    const result = await db.query(queryText, queryParams);

    res.status(200).json({
      success: true,
      approvals: result.rows || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve single approval details including quotation details, items and vendor ranks
 * GET /api/approvals/:id
 */
const getApprovalById = async (req, res, next) => {
  const { id } = req.params;

  try {
    // 1. Fetch main approval record joined with quotation, rfq and vendor
    const approvalRes = await db.query(
      `SELECT a.*, q.total_amount, q.delivery_days, q.notes as quotation_notes, q.submitted_at, q.vendor_id, q.rfq_id,
              v.company_name, v.category, v.contact_person, v.email as vendor_email, v.phone as vendor_phone,
              r.title as rfq_title, r.rfq_number, r.deadline as rfq_deadline, r.description as rfq_description,
              u_off.name as officer_name, u_app.name as approver_name
       FROM approvals a
       JOIN quotations q ON a.quotation_id = q.id
       JOIN vendors v ON q.vendor_id = v.id
       JOIN rfqs r ON q.rfq_id = r.id
       LEFT JOIN users u_off ON r.created_by = u_off.id
       LEFT JOIN users u_app ON a.approver_id = u_app.id
       WHERE a.id = $1`,
      [id]
    );

    if (approvalRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found.',
      });
    }

    const approval = approvalRes.rows[0];

    // 2. Fetch quotation line items
    const itemsRes = await db.query(
      `SELECT qi.*, ri.product_name, ri.quantity, ri.unit, ri.specifications
       FROM quotation_items qi
       JOIN rfq_items ri ON qi.rfq_item_id = ri.id
       WHERE qi.quotation_id = $1
       ORDER BY qi.id ASC`,
      [approval.quotation_id]
    );

    // 3. Compute rank summary side-by-side rank
    const allQuotesRes = await db.query(
      'SELECT id, total_amount FROM quotations WHERE rfq_id = $1 ORDER BY total_amount ASC',
      [approval.rfq_id]
    );
    const allQuotes = allQuotesRes.rows || [];
    const index = allQuotes.findIndex(q => q.id === approval.quotation_id);
    const rank = index !== -1 ? index + 1 : 1;

    res.status(200).json({
      success: true,
      approval,
      items: itemsRes.rows || [],
      rank: {
        position: rank,
        total: allQuotes.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Manager approves the quotation selection
 * PUT /api/approvals/:id/approve
 */
const approveRequest = async (req, res, next) => {
  const { id } = req.params;
  const { remarks } = req.body;

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch approval details and associated RFQ, quotation, and vendor
    const approvalRes = await client.query(
      `SELECT a.*, q.rfq_id, q.vendor_id, r.title as rfq_title, r.rfq_number, r.created_by as officer_id, v.company_name
       FROM approvals a
       JOIN quotations q ON a.quotation_id = q.id
       JOIN rfqs r ON q.rfq_id = r.id
       JOIN vendors v ON q.vendor_id = v.id
       WHERE a.id = $1`,
      [id]
    );

    if (approvalRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Approval request not found.' });
    }

    const approval = approvalRes.rows[0];

    if (approval.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This approval request is already processed. Status: "${approval.status}".`,
      });
    }

    // 2. Set approval status to 'approved' and save remarks
    await client.query(
      `UPDATE approvals
       SET status = 'approved', remarks = $1, approver_id = $2, action_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [remarks || 'Quotation selection approved by manager.', req.user.id, id]
    );

    // 3. Set selected quotation status to 'selected'
    await client.query(
      `UPDATE quotations
       SET status = 'selected'
       WHERE id = $1`,
      [approval.quotation_id]
    );

    // 4. Set all other quotations for the same RFQ to 'rejected'
    await client.query(
      `UPDATE quotations
       SET status = 'rejected'
       WHERE rfq_id = $1 AND id != $2`,
      [approval.rfq_id, approval.quotation_id]
    );

    // 5. Set RFQ status to 'closed'
    await client.query(
      `UPDATE rfqs
       SET status = 'closed'
       WHERE id = $1`,
      [approval.rfq_id]
    );

    // 6. Write notification for the officer who created the RFQ / submitted the selection
    const { sendNotification } = require('../utils/notificationHelper');
    const io = req.app.get('io');
    if (approval.officer_id) {
      await sendNotification(
        client,
        approval.officer_id,
        'Quotation Approved',
        `Your quotation request was approved for ${approval.rfq_title}`,
        'approval',
        id,
        io
      );
    }

    await client.query('COMMIT');

    // Log activity
    await logActivity(
      req.user.id,
      'APPROVE',
      id,
      `Approved quotation selection of "${approval.company_name}" for RFQ "${approval.rfq_number}"`
    );

    // Emit Socket event to the procurement officer
    if (io && approval.officer_id) {
      io.to(`user_${approval.officer_id}`).emit('approval_done', {
        approval_id: id,
        quotation_id: approval.quotation_id,
        rfq_number: approval.rfq_number,
        rfq_title: approval.rfq_title,
        status: 'approved',
        remarks: remarks || 'Approved by manager.',
      });
    }

    // Emit Socket event to all managers and admins to decrement/update their badge count
    if (io) {
      const managersRes = await db.query(
        "SELECT id FROM users WHERE role IN ('manager', 'admin')"
      );
      managersRes.rows.forEach((manager) => {
        io.to(`user_${manager.id}`).emit('approval_processed', {
          approval_id: id,
          status: 'approved',
        });
      });
    }

    res.status(200).json({
      success: true,
      message: 'Quotation selection approved successfully. Sourcing event is closed.',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Manager rejects the quotation selection (returns quotation status back to 'submitted')
 * PUT /api/approvals/:id/reject
 */
const rejectRequest = async (req, res, next) => {
  const { id } = req.params;
  const { remarks } = req.body;

  // Remarks are mandatory when rejecting
  if (!remarks || remarks.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Approval remarks/comments are required when rejecting a quotation selection request.',
    });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch approval details and associated RFQ, quotation, and vendor
    const approvalRes = await client.query(
      `SELECT a.*, q.rfq_id, q.vendor_id, r.title as rfq_title, r.rfq_number, r.created_by as officer_id, v.company_name
       FROM approvals a
       JOIN quotations q ON a.quotation_id = q.id
       JOIN rfqs r ON q.rfq_id = r.id
       JOIN vendors v ON q.vendor_id = v.id
       WHERE a.id = $1`,
      [id]
    );

    if (approvalRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Approval request not found.' });
    }

    const approval = approvalRes.rows[0];

    if (approval.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This approval request is already processed. Status: "${approval.status}".`,
      });
    }

    // 2. Set approval status to 'rejected'
    await client.query(
      `UPDATE approvals
       SET status = 'rejected', remarks = $1, approver_id = $2, action_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [remarks, req.user.id, id]
    );

    // 3. Set quotation status back to 'submitted' (so that the officer can edit/re-select)
    await client.query(
      `UPDATE quotations
       SET status = 'submitted'
       WHERE id = $1`,
      [approval.quotation_id]
    );

    // 4. Write notification to the procurement officer
    const { sendNotification } = require('../utils/notificationHelper');
    const io = req.app.get('io');
    if (approval.officer_id) {
      await sendNotification(
        client,
        approval.officer_id,
        'Quotation Selection Rejected',
        `Your quotation request was rejected for ${approval.rfq_title}`,
        'approval',
        id,
        io
      );
    }

    await client.query('COMMIT');

    // Log activity
    await logActivity(
      req.user.id,
      'REJECT',
      id,
      `Rejected quotation selection of "${approval.company_name}" for RFQ "${approval.rfq_number}". Remarks: "${remarks}"`
    );

    // Emit Socket event to the procurement officer
    if (io && approval.officer_id) {
      io.to(`user_${approval.officer_id}`).emit('approval_rejected', {
        approval_id: id,
        quotation_id: approval.quotation_id,
        rfq_number: approval.rfq_number,
        rfq_title: approval.rfq_title,
        status: 'rejected',
        remarks: remarks,
      });
    }

    // Emit Socket event to all managers and admins to decrement/update their badge count
    if (io) {
      const managersRes = await db.query(
        "SELECT id FROM users WHERE role IN ('manager', 'admin')"
      );
      managersRes.rows.forEach((manager) => {
        io.to(`user_${manager.id}`).emit('approval_processed', {
          approval_id: id,
          status: 'rejected',
        });
      });
    }

    res.status(200).json({
      success: true,
      message: 'Quotation selection rejected successfully.',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Fetch pending approvals count (for manager badges)
 * GET /api/approvals/pending-count
 */
const getPendingCount = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*)::int as count FROM approvals WHERE status = 'pending'`
    );
    const count = result.rows[0]?.count || 0;

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createApproval,
  getApprovals,
  getApprovalById,
  approveRequest,
  rejectRequest,
  getPendingCount,
};
