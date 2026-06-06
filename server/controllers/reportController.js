const db = require('../config/db');

/**
 * Helper to escape field values for CSV export
 */
const escapeCSV = (val) => {
  if (val === null || val === undefined) return '';
  
  // Format dates cleanly
  if (val instanceof Date) {
    return val.toISOString();
  }
  
  let str = val.toString();
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};

/**
 * GET /api/reports/vendor-performance
 * Returns top 10 vendors sorted by total PO amount won
 */
const getVendorPerformance = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        v.id,
        v.company_name,
        v.category,
        (SELECT COUNT(*)::int FROM rfq_vendors WHERE vendor_id = v.id) as rfqs_invited,
        (SELECT COUNT(*)::int FROM quotations WHERE vendor_id = v.id) as quotations_submitted,
        (SELECT COUNT(*)::int FROM purchase_orders WHERE vendor_id = v.id) as pos_won,
        (SELECT COALESCE(SUM(grand_total), 0)::float FROM purchase_orders WHERE vendor_id = v.id) as total_amount
      FROM vendors v
      ORDER BY total_amount DESC
      LIMIT 10
    `);

    res.status(200).json({
      success: true,
      data: result.rows || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/spending-summary
 * Returns total spending trends by month, vendor category, and vendor
 */
const getSpendingSummary = async (req, res, next) => {
  try {
    // 1. Spending by month (last 12 months)
    const monthlySpending = await db.query(`
      SELECT 
        TO_CHAR(created_at, 'Mon YYYY') as month_label,
        DATE_TRUNC('month', created_at) as month_date,
        COALESCE(SUM(grand_total), 0)::float as amount
      FROM purchase_orders
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month_label, month_date
      ORDER BY month_date ASC
    `);

    // 2. Spending by vendor category
    const categorySpending = await db.query(`
      SELECT 
        v.category,
        COALESCE(SUM(po.grand_total), 0)::float as amount
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      GROUP BY v.category
      ORDER BY amount DESC
    `);

    // 3. Spending by vendor (top 10)
    const vendorSpending = await db.query(`
      SELECT 
        v.company_name,
        COALESCE(SUM(po.grand_total), 0)::float as amount
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      GROUP BY v.company_name
      ORDER BY amount DESC
      LIMIT 10
    `);

    res.status(200).json({
      success: true,
      monthlySpending: monthlySpending.rows || [],
      categorySpending: categorySpending.rows || [],
      vendorSpending: vendorSpending.rows || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/procurement-stats
 * Returns key procurement statistics and status counts
 */
const getProcurementStats = async (req, res, next) => {
  try {
    // 1. Total RFQs created
    const rfqCountRes = await db.query('SELECT COUNT(*)::int as total FROM rfqs');
    const totalRFQs = rfqCountRes.rows[0]?.total || 0;

    // 2. Average quotations per RFQ
    const avgQuotesRes = await db.query(`
      SELECT COALESCE(AVG(quote_count), 0)::float as avg_quotes
      FROM (
        SELECT r.id, COUNT(q.id) as quote_count
        FROM rfqs r
        LEFT JOIN quotations q ON q.rfq_id = r.id
        GROUP BY r.id
      ) sub
    `);
    const avgQuotesPerRFQ = parseFloat(avgQuotesRes.rows[0]?.avg_quotes || 0).toFixed(1);

    // 3. Average approval time (hours between select and approval/rejection)
    const avgApprovalRes = await db.query(`
      SELECT 
        COALESCE(AVG(EXTRACT(EPOCH FROM (act.created_at - req.created_at)) / 3600), 0)::float as avg_hours
      FROM activity_logs req
      JOIN activity_logs act ON req.entity_id = act.entity_id 
        AND req.entity_type = 'approval' 
        AND act.entity_type = 'approval'
        AND req.action = 'SELECT'
        AND act.action IN ('APPROVE', 'REJECT')
    `);
    const avgApprovalTimeHours = parseFloat(avgApprovalRes.rows[0]?.avg_hours || 0).toFixed(1);

    // 4. Total active vendors
    const vendorCountRes = await db.query("SELECT COUNT(*)::int as total FROM vendors WHERE status = 'active'");
    const totalActiveVendors = vendorCountRes.rows[0]?.total || 0;

    // 5. Total invoices paid vs unpaid
    const invoiceCountRes = await db.query(`
      SELECT 
        COUNT(CASE WHEN status = 'paid' THEN 1 END)::int as paid_count,
        COUNT(CASE WHEN status = 'unpaid' THEN 1 END)::int as unpaid_count
      FROM invoices
    `);
    const paidInvoices = invoiceCountRes.rows[0]?.paid_count || 0;
    const unpaidInvoices = invoiceCountRes.rows[0]?.unpaid_count || 0;

    // 6. Total POs created
    const poCountRes = await db.query('SELECT COUNT(*)::int as total FROM purchase_orders');
    const totalPOs = poCountRes.rows[0]?.total || 0;

    res.status(200).json({
      success: true,
      stats: {
        totalRFQs,
        avgQuotesPerRFQ,
        avgApprovalTimeHours,
        totalActiveVendors,
        totalPOs,
        invoices: {
          paid: paidInvoices,
          unpaid: unpaidInvoices,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/export?type=vendors|rfqs|pos|invoices
 * Exports data as a CSV stream
 */
const exportEntityData = async (req, res, next) => {
  const { type } = req.query;

  try {
    let csvData = '';
    let filename = '';

    if (type === 'vendors') {
      const result = await db.query(`
        SELECT id, company_name, category, email, phone, contact_person, status, created_at 
        FROM vendors 
        ORDER BY id ASC
      `);
      filename = `vendors_${new Date().toISOString().slice(0, 7)}.csv`;
      
      const headers = ['ID', 'Company Name', 'Category', 'Email', 'Phone', 'Contact Person', 'Status', 'Created At'];
      csvData += headers.join(',') + '\n';
      
      for (const row of result.rows) {
        csvData += [
          escapeCSV(row.id),
          escapeCSV(row.company_name),
          escapeCSV(row.category),
          escapeCSV(row.email),
          escapeCSV(row.phone),
          escapeCSV(row.contact_person),
          escapeCSV(row.status),
          escapeCSV(row.created_at),
        ].join(',') + '\n';
      }
    } else if (type === 'rfqs') {
      const result = await db.query(`
        SELECT id, rfq_number, title, description, deadline, status, created_at 
        FROM rfqs 
        ORDER BY id ASC
      `);
      filename = `rfqs_${new Date().toISOString().slice(0, 7)}.csv`;

      const headers = ['ID', 'RFQ Number', 'Title', 'Description', 'Deadline', 'Status', 'Created At'];
      csvData += headers.join(',') + '\n';

      for (const row of result.rows) {
        csvData += [
          escapeCSV(row.id),
          escapeCSV(row.rfq_number),
          escapeCSV(row.title),
          escapeCSV(row.description),
          escapeCSV(row.deadline),
          escapeCSV(row.status),
          escapeCSV(row.created_at),
        ].join(',') + '\n';
      }
    } else if (type === 'pos') {
      const result = await db.query(`
        SELECT po.id, po.po_number, po.total_amount, po.tax_amount, po.grand_total, po.status, v.company_name as vendor_name, po.created_at
        FROM purchase_orders po
        JOIN vendors v ON po.vendor_id = v.id
        ORDER BY po.id ASC
      `);
      filename = `purchase_orders_${new Date().toISOString().slice(0, 7)}.csv`;

      const headers = ['ID', 'PO Number', 'Total Amount', 'Tax Amount', 'Grand Total', 'Status', 'Vendor Name', 'Created At'];
      csvData += headers.join(',') + '\n';

      for (const row of result.rows) {
        csvData += [
          escapeCSV(row.id),
          escapeCSV(row.po_number),
          escapeCSV(row.total_amount),
          escapeCSV(row.tax_amount),
          escapeCSV(row.grand_total),
          escapeCSV(row.status),
          escapeCSV(row.vendor_name),
          escapeCSV(row.created_at),
        ].join(',') + '\n';
      }
    } else if (type === 'invoices') {
      const result = await db.query(`
        SELECT i.id, i.invoice_number, i.amount, i.tax_amount, i.total_amount, i.status, i.due_date, po.po_number, i.created_at
        FROM invoices i
        JOIN purchase_orders po ON i.po_id = po.id
        ORDER BY i.id ASC
      `);
      filename = `invoices_${new Date().toISOString().slice(0, 7)}.csv`;

      const headers = ['ID', 'Invoice Number', 'Amount', 'Tax Amount', 'Total Amount', 'Status', 'Due Date', 'PO Number', 'Created At'];
      csvData += headers.join(',') + '\n';

      for (const row of result.rows) {
        csvData += [
          escapeCSV(row.id),
          escapeCSV(row.invoice_number),
          escapeCSV(row.amount),
          escapeCSV(row.tax_amount),
          escapeCSV(row.total_amount),
          escapeCSV(row.status),
          escapeCSV(row.due_date),
          escapeCSV(row.po_number),
          escapeCSV(row.created_at),
        ].join(',') + '\n';
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid export type specified',
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVendorPerformance,
  getSpendingSummary,
  getProcurementStats,
  exportEntityData,
};
