const db = require('../config/db');

/**
 * Utility helper to log actions to activity_logs table
 */
const logActivity = async (userId, action, entityId, description) => {
  try {
    await db.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, 'vendor', $3, $4)`,
      [userId, action, entityId, description]
    );
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
};

/**
 * Create a new vendor
 * POST /api/vendors
 */
const createVendor = async (req, res, next) => {
  const { company_name, category, gst_number, contact_person, email, phone, address, status } = req.body;

  if (!company_name || !category || !gst_number || !email) {
    return res.status(400).json({
      success: false,
      message: 'Company name, category, GST number, and email are required fields',
    });
  }

  try {
    // Check if GST Number is already registered
    const gstCheck = await db.query('SELECT id FROM vendors WHERE gst_number = $1', [gst_number]);
    if (gstCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A vendor with this GST number is already registered',
      });
    }

    const result = await db.query(
      `INSERT INTO vendors (company_name, category, gst_number, contact_person, email, phone, address, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        company_name,
        category,
        gst_number,
        contact_person || null,
        email,
        phone || null,
        address || null,
        status || 'active',
      ]
    );

    const vendor = result.rows[0];

    // Log this activity
    await logActivity(req.user.id, 'CREATE', vendor.id, `Created vendor profile: "${company_name}"`);

    // Emit Socket.io event "vendor_added"
    const io = req.app.get('io');
    if (io) {
      io.emit('vendor_added', {
        id: vendor.id,
        company_name: vendor.company_name,
        category: vendor.category,
        contact_person: vendor.contact_person,
        created_by_name: req.user.name || 'Staff',
      });
    }

    res.status(201).json({
      success: true,
      vendor,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all vendors with filters and pagination
 * GET /api/vendors
 */
const getVendors = async (req, res, next) => {
  const { search, category, status, page = 1, limit = 10 } = req.query;

  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);
  const offset = (parsedPage - 1) * parsedLimit;

  try {
    let queryText = 'SELECT * FROM vendors WHERE 1=1';
    let countQueryText = 'SELECT COUNT(*)::int as count FROM vendors WHERE 1=1';
    const queryParams = [];
    let paramCounter = 1;

    // Apply search filter (company_name, gst_number, contact_person, email)
    if (search) {
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern);
      const searchCondition = ` AND (company_name ILIKE $${paramCounter} OR gst_number ILIKE $${paramCounter} OR contact_person ILIKE $${paramCounter} OR email ILIKE $${paramCounter})`;
      queryText += searchCondition;
      countQueryText += searchCondition;
      paramCounter++;
    }

    // Apply category filter
    if (category && category !== 'all') {
      queryParams.push(category);
      queryText += ` AND category = $${paramCounter}`;
      countQueryText += ` AND category = $${paramCounter}`;
      paramCounter++;
    }

    // Apply status filter
    if (status && status !== 'all') {
      queryParams.push(status);
      queryText += ` AND status = $${paramCounter}`;
      countQueryText += ` AND status = $${paramCounter}`;
      paramCounter++;
    }

    // Execute count query
    const countResult = await db.query(countQueryText, queryParams);
    const total = countResult.rows[0]?.count || 0;

    // Append ordering, limit and offset parameters
    queryText += ` ORDER BY company_name ASC LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    queryParams.push(parsedLimit, offset);

    // Execute query
    const vendorsResult = await db.query(queryText, queryParams);

    res.status(200).json({
      success: true,
      vendors: vendorsResult.rows,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get vendor details with full history logs
 * GET /api/vendors/:id
 */
const getVendorById = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Fetch vendor details
    const vendorResult = await db.query('SELECT * FROM vendors WHERE id = $1', [id]);
    if (vendorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }
    const vendor = vendorResult.rows[0];

    // Fetch related RFQs
    const rfqsResult = await db.query(
      `SELECT r.id, r.rfq_number, r.title, r.deadline, r.status, rv.invited_at
       FROM rfqs r
       JOIN rfq_vendors rv ON r.id = rv.rfq_id
       WHERE rv.vendor_id = $1
       ORDER BY rv.invited_at DESC`,
      [id]
    );

    // Fetch related Quotations
    const quotationsResult = await db.query(
      `SELECT q.id, q.rfq_id, q.total_amount, q.delivery_days, q.status, q.submitted_at, r.rfq_number, r.title as rfq_title
       FROM quotations q
       JOIN rfqs r ON q.rfq_id = r.id
       WHERE q.vendor_id = $1
       ORDER BY q.submitted_at DESC`,
      [id]
    );

    // Fetch related Purchase Orders
    const posResult = await db.query(
      `SELECT po.id, po.po_number, po.total_amount, po.grand_total, po.status, po.created_at
       FROM purchase_orders po
       WHERE po.vendor_id = $1
       ORDER BY po.created_at DESC`,
      [id]
    );

    res.status(200).json({
      success: true,
      vendor,
      rfqs: rfqsResult.rows || [],
      quotations: quotationsResult.rows || [],
      purchase_orders: posResult.rows || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update vendor profile details
 * PUT /api/vendors/:id
 */
const updateVendor = async (req, res, next) => {
  const { id } = req.params;
  const { company_name, category, gst_number, contact_person, email, phone, address, status } = req.body;

  if (!company_name || !category || !gst_number || !email) {
    return res.status(400).json({
      success: false,
      message: 'Company name, category, GST number, and email are required fields',
    });
  }

  try {
    // Verify vendor exists
    const vendorCheck = await db.query('SELECT company_name FROM vendors WHERE id = $1', [id]);
    if (vendorCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    const result = await db.query(
      `UPDATE vendors
       SET company_name = $1, category = $2, gst_number = $3, contact_person = $4, email = $5, phone = $6, address = $7, status = $8
       WHERE id = $9
       RETURNING *`,
      [company_name, category, gst_number, contact_person || null, email, phone || null, address || null, status || 'active', id]
    );

    const updatedVendor = result.rows[0];

    // Log this update activity
    await logActivity(req.user.id, 'UPDATE', id, `Updated vendor profile details for: "${company_name}"`);

    res.status(200).json({
      success: true,
      vendor: updatedVendor,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft delete vendor by changing status to 'inactive'
 * DELETE /api/vendors/:id
 */
const deleteVendor = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Verify vendor exists
    const vendorCheck = await db.query('SELECT company_name FROM vendors WHERE id = $1', [id]);
    if (vendorCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }
    const companyName = vendorCheck.rows[0].company_name;

    const result = await db.query(
      `UPDATE vendors
       SET status = 'inactive'
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Log this delete activity
    await logActivity(req.user.id, 'DELETE', id, `Soft deleted (deactivated) vendor: "${companyName}"`);

    res.status(200).json({
      success: true,
      message: `Vendor "${companyName}" soft deleted successfully`,
      vendor: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all unique vendor categories
 * GET /api/vendors/categories
 */
const getCategories = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT DISTINCT category FROM vendors WHERE category IS NOT NULL ORDER BY category ASC'
    );
    const categories = result.rows.map(row => row.category);

    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  getCategories,
};
