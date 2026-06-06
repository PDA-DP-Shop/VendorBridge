import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
  ArrowLeft,
  Printer,
  Download,
  Mail,
  CheckCircle,
  Building,
  User,
  Calendar,
  Clock,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'unpaid':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          Unpaid
        </span>
      );
    case 'paid':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
          Paid
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
          {status}
        </span>
      );
  }
};

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const isStaff = user?.role === 'manager' || user?.role === 'admin' || user?.role === 'procurement_officer';

  const fetchInvoiceDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/invoices/${id}`);
      if (res.data && res.data.success) {
        setInvoice(res.data.invoice);
        setItems(res.data.items || []);
      }
    } catch (err) {
      console.error('Failed to load invoice details:', err);
      toast.error('Failed to retrieve invoice details.');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceDetails();
  }, [id]);

  // Download Invoice PDF
  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${invoice.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Invoice PDF downloaded successfully.');
    } catch (err) {
      console.error('Failed to download PDF:', err);
      toast.error('Failed to compile and download Invoice PDF.');
    }
  };

  // Send Invoice via Email
  const handleSendEmail = async () => {
    setEmailing(true);
    try {
      const res = await api.post(`/invoices/${id}/email`);
      if (res.data && res.data.success) {
        toast.success(res.data.message || 'Invoice successfully sent to vendor.');
      }
    } catch (err) {
      console.error('Failed to email invoice:', err);
      toast.error('Failed to send invoice PDF via email.');
    } finally {
      setEmailing(false);
    }
  };

  // Mark invoice as Paid
  const handleMarkAsPaid = async () => {
    if (!window.confirm('Are you sure you want to mark this invoice as PAID? A payment confirmation email will be sent to the vendor.')) {
      return;
    }

    setUpdating(true);
    try {
      const res = await api.put(`/invoices/${id}/status`, { status: 'paid' });
      if (res.data && res.data.success) {
        toast.success('Invoice marked as Paid & confirmation email sent to vendor.', { duration: 5000 });
        await fetchInvoiceDetails();
      }
    } catch (err) {
      console.error('Failed to update invoice status:', err);
      toast.error('Failed to update invoice status.');
    } finally {
      setUpdating(false);
    }
  };

  // Print Document — opens a clean standalone print window
  const handlePrint = () => {
    const isPaid = invoice.status === 'paid';
    const isCancelled = invoice.status === 'cancelled';

    const itemRows = items.map((item) => `
      <tr>
        <td style="padding:10px 12px; border-bottom:1px solid #f1f5f9;">
          <div style="font-weight:700; color:#0f172a; font-size:12px;">${item.product_name}</div>
          ${item.specifications ? `<div style="font-size:10px; color:#94a3b8; margin-top:2px; font-style:italic;">${item.specifications}</div>` : ''}
        </td>
        <td style="padding:10px 12px; text-align:right; border-bottom:1px solid #f1f5f9; font-size:12px; color:#475569; font-weight:600;">
          ${item.quantity} <span style="color:#94a3b8; font-weight:400;">${item.unit || ''}</span>
        </td>
        <td style="padding:10px 12px; text-align:right; border-bottom:1px solid #f1f5f9; font-size:12px; font-weight:700; color:#334155;">
          ₹${parseFloat(item.unit_price).toFixed(2)}
        </td>
        <td style="padding:10px 12px; text-align:right; border-bottom:1px solid #f1f5f9; font-size:12px; font-weight:900; color:#0f172a;">
          ₹${parseFloat(item.total_price).toFixed(2)}
        </td>
      </tr>
    `).join('');

    const paidStamp = isPaid ? `
      <div style="
        position:absolute; bottom:90px; right:60px;
        width:110px; height:110px;
        border-radius:50%;
        border:4px solid #16a34a;
        display:flex; flex-direction:column;
        align-items:center; justify-content:center;
        box-shadow:inset 0 0 0 3px #16a34a, 0 0 0 1.5px #16a34a;
        opacity:0.82;
        pointer-events:none;
      ">
        <div style="
          width:96px; height:96px; border-radius:50%;
          border:1.5px solid #16a34a;
          display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          gap:2px;
        ">
          <span style="font-size:26px; font-weight:900; color:#16a34a; letter-spacing:1px; line-height:1;">PAID</span>
          <div style="width:56px; height:1px; background:#16a34a; opacity:0.5; margin:2px 0;"></div>
          <span style="font-size:7.5px; font-weight:800; color:#16a34a; letter-spacing:2.5px; text-transform:uppercase;">CLEARED</span>
        </div>
      </div>
    ` : '';

    const statusBadge = isPaid
      ? `<span style="display:inline-block; background:#dcfce7; color:#15803d; border:1px solid #86efac; font-size:10px; font-weight:700; padding:2px 9px; border-radius:20px;">PAID</span>`
      : isCancelled
      ? `<span style="display:inline-block; background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-size:10px; font-weight:700; padding:2px 9px; border-radius:20px;">CANCELLED</span>`
      : `<span style="display:inline-block; background:#fef2f2; color:#b91c1c; border:1px solid #fca5a5; font-size:10px; font-weight:700; padding:2px 9px; border-radius:20px;">UNPAID</span>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${invoice.invoice_number} — VendorBridge ERP</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif;
      background: #fff;
      color: #1e293b;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 14mm 16mm 14mm 16mm;
      margin: 0 auto;
      background: #fff;
      position: relative;
    }
    /* Header */
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
    .brand { display:flex; align-items:center; gap:10px; }
    .brand-icon {
      width:36px; height:36px; border-radius:8px;
      background:#16a34a; color:#fff;
      font-size:14px; font-weight:900;
      display:flex; align-items:center; justify-content:center;
    }
    .brand-name { font-size:20px; font-weight:900; color:#0f172a; letter-spacing:-0.5px; }
    .brand-sub { font-size:9px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-top:1px; }
    .invoice-meta { text-align:right; }
    .invoice-meta h1 { font-size:16px; font-weight:900; color:#0f172a; letter-spacing:0.5px; margin-bottom:4px; }
    .invoice-meta div { font-size:9.5px; color:#64748b; margin-top:2px; }
    .invoice-meta .inv-num { font-family:monospace; font-weight:700; color:#1e293b; font-size:11px; }
    /* Divider */
    hr { border:none; border-top:1.5px solid #e2e8f0; margin:14px 0; }
    hr.dashed { border-top:1px dashed #e2e8f0; }
    /* Bill / Vendor grid */
    .parties { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; }
    .party-label { font-size:8.5px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:5px; }
    .party-name { font-size:11.5px; font-weight:800; color:#0f172a; }
    .party-detail { font-size:10px; color:#64748b; margin-top:1.5px; }
    /* Table */
    table { width:100%; border-collapse:collapse; margin-bottom:16px; }
    thead tr { background:#f8fafc; border-bottom:1.5px solid #e2e8f0; }
    thead th { font-size:8.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#94a3b8; padding:9px 12px; }
    thead th:not(:first-child) { text-align:right; }
    tbody td { font-size:11.5px; }
    /* Totals */
    .totals-row { display:flex; justify-content:space-between; margin-bottom:5px; font-size:11px; }
    .totals-row span:first-child { color:#64748b; font-weight:500; }
    .totals-row span:last-child { font-weight:700; color:#334155; }
    .grand-total { background:#f0fdf4; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; border:1px solid #dcfce7; margin-top:8px; }
    .grand-total .label { font-weight:900; color:#0f172a; font-size:12px; }
    .grand-total .amount { font-size:16px; font-weight:900; color:#16a34a; }
    /* Footer */
    .footer { margin-top:20px; text-align:center; font-size:9px; color:#94a3b8; }
    /* Bank details */
    .bank { font-size:10px; color:#64748b; line-height:1.7; }
    .bank strong { color:#334155; }
    /* Payment confirmed box */
    .payment-confirmed {
      margin-top:8px; background:#f0fdf4; border:1px solid #86efac;
      border-radius:7px; padding:7px 11px;
      font-size:10px; font-weight:700; color:#15803d;
      display:flex; align-items:center; gap:6px;
    }
    @media print {
      body { margin:0; }
      .page { padding:10mm 14mm; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand">
        <div class="brand-icon">VB</div>
        <div>
          <div class="brand-name">VendorBridge Corp.</div>
          <div class="brand-sub">Accounts Payable Department &bull; New Delhi, India</div>
        </div>
      </div>
    </div>
    <div class="invoice-meta">
      <h1>COMMERCIAL INVOICE</h1>
      <div class="inv-num">${invoice.invoice_number}</div>
      <div>Issue Date: ${new Date(invoice.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</div>
      <div>Due Date: <strong>${new Date(invoice.due_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</strong></div>
      <div>PO Ref: <strong>${invoice.po_number}</strong></div>
      <div style="margin-top:5px;">${statusBadge}</div>
    </div>
  </div>

  <hr/>

  <!-- Bill To / Supplier -->
  <div class="parties">
    <div>
      <div class="party-label">Bill To (Buyer)</div>
      <div class="party-name">VendorBridge Corporation</div>
      <div class="party-detail">Corporate Accounts Payable Division</div>
      <div class="party-detail">New Delhi, India</div>
      <div class="party-detail">invoices@vendorbridge.com</div>
    </div>
    <div>
      <div class="party-label">Supplier (Vendor)</div>
      <div class="party-name">${invoice.company_name}</div>
      <div class="party-detail">Contact: ${invoice.contact_person || 'N/A'}</div>
      <div class="party-detail">${invoice.vendor_email || ''}</div>
      <div class="party-detail">${invoice.vendor_phone || 'N/A'}</div>
      ${invoice.vendor_address ? `<div class="party-detail" style="font-style:italic;">${invoice.vendor_address}</div>` : ''}
    </div>
  </div>

  <hr/>

  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Requirement / Specifications</th>
        <th>Quantity</th>
        <th>Unit Rate</th>
        <th>Row Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <hr/>

  <!-- Totals + Bank -->
  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:24px;">
    <!-- Bank -->
    <div class="bank">
      <div style="font-size:8.5px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; margin-bottom:6px;">Payment Instructions</div>
      <div>Bank Name: <strong>Federal Reserve Bank</strong></div>
      <div>Account Number: <strong>1209384910293</strong></div>
      <div>SWIFT Code: <strong>VBRPINBBXXX</strong></div>
      <div>Payment Terms: <strong>Net 30 days from invoice date</strong></div>
      ${isPaid ? `
        <div class="payment-confirmed">
          <span style="font-size:14px;">✓</span>
          Payment verified and logged on ledger.
        </div>` : ''}
    </div>

    <!-- Totals -->
    <div style="min-width:240px;">
      <div class="totals-row">
        <span>Subtotal Amount:</span>
        <span>₹${parseFloat(invoice.amount).toFixed(2)}</span>
      </div>
      <div class="totals-row">
        <span>GST Tax (18%):</span>
        <span>₹${parseFloat(invoice.tax_amount).toFixed(2)}</span>
      </div>
      <div class="grand-total">
        <span class="label">Invoice Grand Total</span>
        <span class="amount">₹${parseFloat(invoice.total_amount).toFixed(2)}</span>
      </div>
    </div>
  </div>

  <!-- PAID Circular Stamp -->
  ${paidStamp}

  <hr class="dashed" style="margin-top:24px;"/>

  <!-- Footer -->
  <div class="footer">
    For payment inquiries, please email <strong>accounts.payable@vendorbridge.com</strong> quoting the Invoice Number and PO Reference.<br/>
    This is an official document generated by VendorBridge ERP System.
  </div>

</div>
<script>
  window.onload = function() {
    window.print();
    window.onafterprint = function() { window.close(); };
  };
</script>
</body>
</html>`;

    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) {
      toast.error('Pop-up blocked. Please allow pop-ups and try again.');
      return;
    }
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20">
        <div className="h-10 w-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-slate-500">Retrieving invoice details...</p>
      </div>
    );
  }

  if (!invoice) return null;

  const isUnpaid = invoice.status === 'unpaid';


  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Top Header Buttons (hidden in print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 print:hidden">
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={() => navigate('/invoices')}
            className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 font-mono tracking-wide">
                Invoice Record #{invoice.invoice_number}
              </span>
              {getStatusBadge(invoice.status)}
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">
              Ledger Invoice: {invoice.company_name}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Action buttons */}
          <button type="button"
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Download size={14} />
            <span>Download PDF</span>
          </button>

          <button type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Printer size={14} />
            <span>Print Invoice</span>
          </button>

          <button type="button"
            onClick={handleSendEmail}
            disabled={emailing}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-60"
          >
            {emailing ? (
              <div className="h-3.5 w-3.5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Mail size={14} />
            )}
            <span>Send via Email</span>
          </button>

          {isStaff && isUnpaid && (
            <button type="button"
              onClick={handleMarkAsPaid}
              disabled={updating}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-lg text-xs font-extrabold transition-all shadow-md shadow-green-600/10 cursor-pointer"
            >
              <CheckCircle size={14} />
              <span>Mark as Paid</span>
            </button>
          )}
        </div>
      </div>

      {/* Structured Document Body */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-4xl mx-auto space-y-8 print:border-none print:shadow-none print:p-0">
        
        {/* Document Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center font-bold text-white shadow-md print:bg-green-600 print:text-white">
                VB
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                VendorBridge Corp.
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Accounts Payable Department
            </p>
            <p className="text-[10px] text-slate-400 font-medium leading-none">
              New Delhi, India
            </p>
          </div>

          <div className="text-right space-y-1">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">COMMERCIAL INVOICE</h2>
            <div className="font-mono text-xs font-bold text-slate-700">{invoice.invoice_number}</div>
            <div className="text-[10px] text-slate-400">
              Issue Date: {new Date(invoice.created_at).toLocaleDateString()}
            </div>
            <div className="text-[10px] text-slate-400">
              Due Date: <span className="font-bold">{new Date(invoice.due_date).toLocaleDateString()}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              PO Ref: {invoice.po_number}
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bill to */}
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Bill To (Buyer)</h3>
            <div className="text-xs font-bold text-slate-800">VendorBridge Corporation</div>
            <div className="text-xs text-slate-500">Corporate Accounts Payable Division</div>
            <div className="text-xs text-slate-500">New Delhi, India</div>
            <div className="text-xs text-slate-500">invoices@vendorbridge.com</div>
          </div>

          {/* Supplier details */}
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Supplier (Vendor)</h3>
            <div className="text-xs font-bold text-slate-800">{invoice.company_name}</div>
            <div className="text-xs text-slate-500">Contact Person: {invoice.contact_person || 'N/A'}</div>
            <div className="text-xs text-slate-500">{invoice.vendor_email}</div>
            <div className="text-xs text-slate-500">{invoice.vendor_phone || 'N/A'}</div>
            {invoice.vendor_address && <div className="text-xs text-slate-500 italic mt-0.5">{invoice.vendor_address}</div>}
          </div>
        </div>

        {/* Invoice Itemized table */}
        <div className="border-t border-slate-100 pt-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Requirement / Specifications</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Unit Rate</th>
                <th className="py-3 px-4 text-right">Row Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{item.product_name}</div>
                    {item.specifications && (
                      <span className="text-[10px] text-slate-400 italic block mt-0.5">
                        {item.specifications}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-650">
                    {item.quantity} <span className="text-slate-400 font-medium">{item.unit}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                    ₹{parseFloat(item.unit_price).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-slate-950">
                    ₹{parseFloat(item.total_price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Bank details block */}
        <div className="border-t border-slate-100 pt-6 flex flex-col md:flex-row justify-between items-start gap-6">
          {/* Bank details placeholders */}
          <div className="space-y-2 text-xs text-slate-600">
            <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Payment Instructions</h4>
            <div className="space-y-1 font-medium text-[11px] text-slate-500 leading-normal">
              <div>Bank Name: <span className="font-bold text-slate-750">Federal Reserve Bank</span></div>
              <div>Account Number: <span className="font-bold text-slate-750">1209384910293</span></div>
              <div>SWIFT Code: <span className="font-bold text-slate-750">VBRPINBBXXX</span></div>
              <div>Payment Terms: <span className="font-bold text-slate-750">Net 30 days from invoice date</span></div>
            </div>
            {!isUnpaid && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-2.5 flex items-center gap-1.5 font-bold mt-2">
                <CheckCircle2 size={14} />
                <span>Payment verified and logged on ledger.</span>
              </div>
            )}
          </div>

          {/* Pricing totals */}
          <div className="w-full md:w-80 space-y-2.5 text-xs text-slate-650 self-end">
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">Subtotal Amount:</span>
              <span className="font-bold text-slate-800">₹{parseFloat(invoice.amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">GST Tax (18%):</span>
              <span className="font-bold text-slate-800">₹{parseFloat(invoice.tax_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-150">
              <span className="text-slate-900 font-black">Invoice Grand Total:</span>
              <span className="text-sm font-black text-green-700">₹{parseFloat(invoice.total_amount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-dashed border-slate-200 pt-6 text-[10px] text-slate-400 leading-normal text-center">
          For payment inquiries, please email accounts.payable@vendorbridge.com quoting the Invoice Number and PO Reference.
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
