import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
  FileText,
  Search,
  ArrowRight,
  Receipt,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/UI/PageHeader';

const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'unpaid':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
          Unpaid
        </span>
      );
    case 'paid':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
          Paid
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200">
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-650 border border-slate-200">
          {status}
        </span>
      );
  }
};

const InvoicesList = () => {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState(null);
  const loading = invoices === null;
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInvoices = useCallback(async () => {
    setInvoices(null);
    try {
      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const res = await api.get('/invoices', { params });
      if (res.data && res.data.success) {
        setInvoices(res.data.invoices || []);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
      toast.error('Failed to retrieve invoices.');
      setInvoices([]);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Filter based on search query
  const filteredInvoices = invoices ? invoices.filter((inv) => {
    const query = searchQuery.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(query) ||
      inv.po_number.toLowerCase().includes(query) ||
      inv.company_name.toLowerCase().includes(query)
    );
  }) : [];


  return (
    <div className="space-y-5 font-sans">
      <PageHeader
        icon={<Receipt size={13} className="text-white" />}
        module="Finance"
        title="Ledger Invoices"
        description="Monitor accounts payable, payment terms, and vendor billing pipelines"
        stats={[
          { label: `${invoices?.length || 0} Invoices`, icon: <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" /> },
          { label: statusFilter === 'all' ? 'All statuses' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) },
        ]}
      />

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 w-full md:w-80 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus-within:border-green-600 transition-all">
          <Search size={15} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search Invoice#, PO# or Vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs w-full focus:outline-none text-slate-800"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto self-start md:self-auto">
          {['all', 'unpaid', 'paid', 'cancelled'].map((status) => (
            <button type="button"
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border shrink-0 cursor-pointer ${
                statusFilter === status
                  ? 'bg-green-50 text-green-700 border-green-200 font-extrabold'
                  : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-20">
          <div className="h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-xs font-semibold text-slate-400">Loading ledger invoices...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="flex flex-col justify-center items-center py-20 text-center bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4">
            <Receipt size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Invoices</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            There are no invoices matching your search queries or status filters at this time.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Invoice Number</th>
                  <th className="py-4 px-6">PO Number</th>
                  <th className="py-4 px-6">Vendor Company</th>
                  <th className="py-4 px-6 text-right">Subtotal</th>
                  <th className="py-4 px-6 text-right">GST (18%)</th>
                  <th className="py-4 px-6 text-right">Invoice Total</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-center">Due Date</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                  >
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                    <td className="py-4 px-6 font-mono font-semibold text-slate-650">{inv.po_number}</td>
                    <td className="py-4 px-6 font-semibold text-slate-800">{inv.company_name}</td>
                    <td className="py-4 px-6 text-right font-medium text-slate-600">
                      ₹{parseFloat(inv.amount).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-slate-600">
                      ₹{parseFloat(inv.tax_amount).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-right font-extrabold text-slate-950">
                      ₹{parseFloat(inv.total_amount).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-center">{getStatusBadge(inv.status)}</td>
                    <td className="py-4 px-6 text-center text-slate-400 font-mono font-semibold">
                      {new Date(inv.due_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                      <button type="button"
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="p-1 text-slate-400 hover:text-green-600 transition-colors inline-flex items-center gap-1 font-bold text-[11px]"
                      >
                        <span>View Details</span>
                        <ArrowRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesList;
