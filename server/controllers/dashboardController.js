const db = require('../config/db');

/**
 * Fetch ERP operation metrics and statistics for dashboard display.
 * GET /api/dashboard/stats
 */
const getStats = async (req, res, next) => {
  try {
    // 1. active_rfqs_count (RFQs currently open)
    const activeRfqsResult = await db.query(
      `SELECT COUNT(*)::int as count FROM rfqs WHERE status = 'open'`
    );
    const active_rfqs_count = activeRfqsResult.rows[0]?.count || 0;

    // 2. pending_approvals_count (Approvals currently pending review)
    const pendingApprovalsResult = await db.query(
      `SELECT COUNT(*)::int as count FROM approvals WHERE status = 'pending'`
    );
    const pending_approvals_count = pendingApprovalsResult.rows[0]?.count || 0;

    // 3. po_total_this_month (PO grand_total sum for the current month)
    const poTotalResult = await db.query(
      `SELECT COALESCE(SUM(grand_total), 0.00)::float as total
       FROM purchase_orders
       WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)`
    );
    const po_total_this_month = poTotalResult.rows[0]?.total || 0.0;

    // 4. overdue_invoices_count (Invoices unpaid and past their due date)
    const overdueInvoicesResult = await db.query(
      `SELECT COUNT(*)::int as count
       FROM invoices
       WHERE due_date < CURRENT_DATE AND status = 'unpaid'`
    );
    const overdue_invoices_count = overdueInvoicesResult.rows[0]?.count || 0;

    // 5. recent_pos (last 5 POs with supplier company name details)
    const recentPosResult = await db.query(
      `SELECT po.id, po.po_number, po.grand_total as amount, po.status, v.company_name as vendor_name
       FROM purchase_orders po
       LEFT JOIN vendors v ON po.vendor_id = v.id
       ORDER BY po.created_at DESC
       LIMIT 5`
    );
    const recent_pos = recentPosResult.rows || [];

    // 6. spending_by_month (last 6 months spending, structured via SERIES generator)
    const spendingResult = await db.query(
      `SELECT
         TO_CHAR(month, 'YYYY-MM') as month_raw,
         TO_CHAR(month, 'Mon') as month_name,
         COALESCE(SUM(po.grand_total), 0.00)::float as amount
       FROM (
         SELECT GENERATE_SERIES(
           DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months',
           DATE_TRUNC('month', CURRENT_DATE),
           INTERVAL '1 month'
         ) as month
       ) m
       LEFT JOIN purchase_orders po ON DATE_TRUNC('month', po.created_at) = m.month
       GROUP BY m.month, month_raw, month_name
       ORDER BY m.month ASC`
    );

    // Adapt postgres rows into clean client-bound array
    const spending_by_month = spendingResult.rows.map(row => ({
      month: row.month_name,
      amount: row.amount
    }));

    res.status(200).json({
      success: true,
      stats: {
        active_rfqs_count,
        pending_approvals_count,
        po_total_this_month,
        overdue_invoices_count,
        recent_pos,
        spending_by_month,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
};
