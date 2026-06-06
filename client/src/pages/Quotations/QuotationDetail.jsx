import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
  ArrowLeft,
  Calendar,
  Layers,
  Clock,
  User,
  Mail,
  Phone,
  Building,
  CheckCircle,
  TrendingUp,
  FileText,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import toast from 'react-hot-toast';

const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'submitted':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          Submitted
        </span>
      );
    case 'under_review':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200 animate-pulse">
          Under Review
        </span>
      );
    case 'selected':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
          Selected
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          Rejected
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

const QuotationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quotation, setQuotation] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  const isInternal = user?.role === 'admin' || user?.role === 'procurement_officer';

  const fetchQuotationDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/quotations/${id}`);
      if (res.data && res.data.success) {
        setQuotation(res.data.quotation);
        setItems(res.data.items || []);
      }
    } catch (err) {
      console.error('Failed to load quotation details:', err);
      toast.error('Failed to retrieve quotation details.');
      navigate('/quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotationDetails();
  }, [id]);

  // Handle Select for Approval Trigger
  const handleSelectForApproval = async () => {
    if (
      !window.confirm(
        `Are you sure you want to select this quotation from "${quotation.company_name}" and send it to managers for approval?`
      )
    ) {
      return;
    }

    setSelecting(true);
    try {
      const res = await api.post(`/quotations/${id}/select`);
      if (res.data && res.data.success) {
        toast.success(res.data.message || 'Quotation submitted for manager approval.');
        await fetchQuotationDetails(); // Refresh details
      }
    } catch (err) {
      console.error('Failed to select quotation:', err);
      const msg = err.response?.data?.message || 'Failed to submit quotation for approval.';
      toast.error(msg);
    } finally {
      setSelecting(false);
    }
  };

  // Status Badge Helper

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20">
        <div className="h-10 w-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-slate-500">Retrieving quotation details...</p>
      </div>
    );
  }

  if (!quotation) return null;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={() => navigate('/quotations')}
            className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 font-mono tracking-wide">
                Quotation #{quotation.id}
              </span>
              {getStatusBadge(quotation.status)}
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">
              Quotation Bid: {quotation.rfq_title}
            </h1>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {/* Edit (only for vendors and status = 'submitted') */}
          {user?.role === 'vendor' && quotation.status === 'submitted' && (
            <button type="button"
              onClick={() => navigate(`/quotations/submit/${quotation.rfq_id}?edit_id=${quotation.id}`)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-all"
            >
              Edit Bid pricing
            </button>
          )}

          {/* Side-by-Side Compare Bids link */}
          {isInternal && (
            <button type="button"
              onClick={() => navigate(`/quotations/compare/${quotation.rfq_id}`)}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200/80 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all"
            >
              <TrendingUp size={14} />
              <span>Compare All Bids</span>
            </button>
          )}

          {/* Send for Approval (Internal roles, status = submitted or under_review) */}
          {isInternal && (quotation.status === 'submitted' || quotation.status === 'under_review') && (
            <button type="button"
              onClick={handleSelectForApproval}
              disabled={selecting}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] disabled:bg-green-400 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-green-600/10"
            >
              {selecting ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  <span>Send for Approval</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info summaries & item cost table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sourcing summary card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Linked Sourcing RFQ</h3>
              <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-slate-900 truncate">{quotation.rfq_title}</div>
                <div className="font-mono text-[10px] text-slate-500">Number: {quotation.rfq_number}</div>
                <div className="text-slate-500">RFQ Status: <span className="font-bold capitalize text-slate-700">{quotation.rfq_status}</span></div>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Proposal Notes & Remarks</h3>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200/50 p-4 rounded-xl italic">
                {quotation.notes || 'No notes or special conditions provided.'}
              </p>
            </div>
          </div>

          {/* Pricing list table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <Layers size={16} className="text-slate-400" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Itemized Cost sheet</h3>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Product / Specification</th>
                  <th className="py-3.5 px-6 text-right">Quantity</th>
                  <th className="py-3.5 px-6 text-right">Unit Price</th>
                  <th className="py-3.5 px-6 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{item.product_name}</div>
                      {item.specifications && (
                        <div className="text-[10px] text-slate-400 italic mt-0.5 truncate max-w-xs">
                          {item.specifications}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right font-semibold">
                      {item.quantity} <span className="text-slate-400 font-medium">{item.unit}</span>
                    </td>
                    <td className="py-4 px-6 text-right font-semibold text-slate-800">
                      ₹{parseFloat(item.unit_price).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-slate-950">
                      ₹{parseFloat(item.total_price).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Commercial summary & Vendor Details sidebar */}
        <div className="space-y-6">
          {/* Bid Summary */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Bid Summary
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block">Delivery Time</span>
                <div className="flex items-center gap-1 mt-1 text-slate-800 font-extrabold">
                  <Clock size={14} className="text-slate-400" />
                  <span>{quotation.delivery_days} days</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block">Date Bid Logged</span>
                <div className="flex items-center gap-1 mt-1 text-slate-800 font-extrabold">
                  <Calendar size={14} className="text-slate-400" />
                  <span>{new Date(quotation.submitted_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-2">
              <span className="text-slate-400 font-semibold block text-[11px] mb-0.5">Grand Total Bid</span>
              <span className="text-2xl font-black text-slate-950">
                ₹{parseFloat(quotation.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Vendor profile details (Only for internal users) */}
          {isInternal && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                Vendor Profile
              </h3>

              <div className="space-y-3.5 text-xs text-slate-600">
                <div className="flex items-center gap-2.5">
                  <Building size={15} className="text-slate-400 shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-slate-800 leading-none">{quotation.company_name}</h4>
                    <span className="text-[10px] text-slate-400 font-semibold">{quotation.category}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 border-t border-slate-100/60 pt-3">
                  <User size={15} className="text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wide block">Contact Person</span>
                    <span className="font-bold text-slate-700">{quotation.contact_person || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Mail size={15} className="text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wide block">Email</span>
                    <span className="font-semibold text-slate-700 break-all">{quotation.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Phone size={15} className="text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wide block">Contact Phone</span>
                    <span className="font-semibold text-slate-700">{quotation.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuotationDetail;
