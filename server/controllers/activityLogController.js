const db = require('../config/db');

/**
 * Retrieve paginated activity logs with filters (Admin only)
 * GET /api/activity-logs
 */
const getActivityLogs = async (req, res, next) => {
  const { user_id, entity_type, start_date, end_date } = req.query;
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);
  const offset = (page - 1) * limit;

  try {
    let baseQuery = `
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCounter = 1;

    // Apply filters
    if (user_id) {
      baseQuery += ` AND al.user_id = $${paramCounter}`;
      queryParams.push(user_id);
      paramCounter++;
    }

    if (entity_type) {
      baseQuery += ` AND al.entity_type = $${paramCounter}`;
      queryParams.push(entity_type);
      paramCounter++;
    }

    if (start_date) {
      baseQuery += ` AND al.created_at >= $${paramCounter}`;
      queryParams.push(start_date);
      paramCounter++;
    }

    if (end_date) {
      baseQuery += ` AND al.created_at <= $${paramCounter}`;
      queryParams.push(end_date);
      paramCounter++;
    }

    // 1. Get total count for pagination metadata
    const countQuery = `SELECT COUNT(*)::int as total ${baseQuery}`;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = countResult.rows[0]?.total || 0;

    // 2. Fetch paginated rows
    let rowsQuery = `
      SELECT al.*, u.name as user_name, u.email as user_email, u.role as user_role
      ${baseQuery}
      ORDER BY al.created_at DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    // Add pagination params
    queryParams.push(limit, offset);
    
    const logsResult = await db.query(rowsQuery, queryParams);

    res.status(200).json({
      success: true,
      logs: logsResult.rows || [],
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivityLogs,
};
