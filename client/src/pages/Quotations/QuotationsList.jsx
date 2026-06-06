import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
  FileSpreadsheet,
  Calendar,
  DollarSign,
  Clock,
  Eye,
  Edit2,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/UI/PageHeader';

const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'submitted':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          Submitted
        </span>
      );
    case 'under_review':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200 animate-pulse">
          Under Review
        </span>
      );
    case 'selected':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
          Selected
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
          Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200">
          {status}
        </span>
      );
  }
};

const QuotationsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quotations, setQuotations] = useState(null);
  const loading = quotations === null;

  const isVendor = user?.role === 'vendor';
  const isInternal = user?.role === 'admin' || user?.role === 'procurement_officer' || user?.role === 'manager';

  const fetchQuotations = useCallback(async () => {
    setQuotations(null);
    try {
      const res = await api.get('/quotations');
      if (res.data && res.data.success) {
        setQuotations(res.data.quotations || []);
      }
    } catch (err) {
      console.error('Failed to load quotations:', err);
      toast.error('Failed to retrieve quotations.');
      setQuotations([]);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  // Status badge style helper

  return (
    <div className="space-y-5 font-sans">
      <PageHeader
        icon={<FileSpreadsheet size={13} className="text-white" />}
        module="Bidding"
        title={isVendor ? 'My Quotation Bids' : 'Supplier Quotations Registry'}
        description={isVendor
          ? 'Manage and edit your submitted pricing proposals'
          : 'Review, compare, and manage quotations received from vendors'}
        stats={[
          { label: `${quotations?.length || 0} Quotations`, icon: <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" /> },
        ]}
      />

      {/* Main Grid Card Table */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-20">
          <div className="h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-xs font-semibold text-slate-400">Loading quotations...</p>
        </div>
      ) : quotations.length === 0 ? (
        <div className="flex flex-col justify-center items-center py-20 text-center bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4">
            <FileSpreadsheet size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Quotations Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {isVendor
              ? "You haven't submitted any quotations yet. Check open RFQs in your sidebar directory to create a bid."
              : 'No quotations have been submitted by vendors for open RFQs yet.'}
          </p>
          {isVendor && (
            <button type="button"
              onClick={() => navigate('/rfqs')}
              className="mt-5 px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-lg transition-all"
            >
              Browse Open RFQs
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">RFQ Details</th>
                  {!isVendor && <th className="py-4 px-6">Vendor Name</th>}
                  <th className="py-4 px-6 text-right">Total Amount</th>
                  <th className="py-4 px-6">Delivery Days</th>
                  <th className="py-4 px-6">Date Submitted</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {quotations.map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-50/30 transition-colors">
                    {/* RFQ details */}
                    <td className="py-4 px-6">
                      <div className="text-slate-950 font-bold max-w-[200px] truncate">
                        {quote.rfq_title}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {quote.rfq_number}
                      </div>
                    </td>

                    {/* Vendor Name */}
                    {!isVendor && (
                      <td className="py-4 px-6 font-semibold text-slate-800">
                        {quote.company_name}
                        {quote.category && (
                          <span className="block text-[10px] text-slate-400 font-medium">
                            {quote.category}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Total Amount */}
                    <td className="py-4 px-6 text-right font-bold text-slate-900">
                      ₹{parseFloat(quote.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Delivery Days */}
                    <td className="py-4 px-6 font-semibold">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock size={13} className="text-slate-400" />
                        <span>{quote.delivery_days} days</span>
                      </div>
                    </td>

                    {/* Submitted At Date */}
                    <td className="py-4 px-6 text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{new Date(quote.submitted_at).toLocaleDateString()}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-6">{getStatusBadge(quote.status)}</td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* View Details */}
                        <button type="button"
                          onClick={() => navigate(`/quotations/${quote.id}`)}
                          className="p-1.5 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"
                          title="View Quotation"
                        >
                          <Eye size={14} />
                        </button>

                        {/* Edit Quotation (Only for vendors if status = 'submitted') */}
                        {isVendor && quote.status === 'submitted' && (
                          <button type="button"
                            onClick={() => navigate(`/quotations/submit/${quote.rfq_id}?edit_id=${quote.id}`)}
                            className="p-1.5 border border-slate-200 text-green-600 hover:text-green-800 hover:bg-green-50/30 rounded-lg transition-all"
                            title="Edit Bid Pricing"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}

                        {/* Side-by-Side Compare Bids link (internal officers only) */}
                        {isInternal && (
                          <button type="button"
                            onClick={() => navigate(`/quotations/compare/${quote.rfq_id}`)}
                            className="p-1.5 border border-green-200 text-green-600 hover:text-green-800 hover:bg-green-50/50 rounded-lg transition-all"
                            title="Compare Bids for this RFQ"
                          >
                            <TrendingUp size={14} />
                          </button>
                        )}
                      </div>
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

export default QuotationsList;
