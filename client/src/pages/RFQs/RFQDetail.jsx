import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
  ArrowLeft,
  Calendar,
  Lock,
  Layers,
  Users,
  Building,
  User,
  Mail,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import toast from 'react-hot-toast';

const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'open':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
          Open
        </span>
      );
    case 'closed':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
          Closed
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
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

const RFQDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rfq, setRfq] = useState(null);
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isAuthorized = user?.role === 'admin' || user?.role === 'procurement_officer';

  // Load RFQ details
  const fetchRfqDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/rfqs/${id}`);
      if (res.data && res.data.success) {
        setRfq(res.data.rfq);
        setItems(res.data.items || []);
        setVendors(res.data.vendors || []);
      }
    } catch (err) {
      console.error('Failed to load RFQ details:', err);
      toast.error('Failed to retrieve RFQ details.');
      navigate('/rfqs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRfqDetails();
  }, [id]);

  // Handle closing RFQ sourcing timeline
  const handleCloseRFQ = async () => {
    if (!window.confirm('Are you sure you want to CLOSE this RFQ? No further quotation submissions can be entered.')) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.put(`/rfqs/${id}/close`);
      if (res.data && res.data.success) {
        toast.success(`RFQ ${rfq.rfq_number} has been closed.`);
        // Reload details
        await fetchRfqDetails();
      }
    } catch (err) {
      console.error('Failed to close RFQ:', err);
      const msg = err.response?.data?.message || 'Failed to close RFQ sourcing timeline.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Status Badge Helper

  // Vendor Quotation status color helper
  const getQuotationStatusBadge = (status) => {
    if (status === 'Submitted') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
          <CheckCircle2 size={10} />
          <span>Submitted</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
        <AlertCircle size={10} />
        <span>Pending</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20">
        <div className="h-10 w-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-slate-500">Retrieving sourcing events details...</p>
      </div>
    );
  }

  if (!rfq) return null;

  return (
    <div className="space-y-6 font-sans">
      {/* Navigation Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={() => navigate('/rfqs')}
            className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 font-mono tracking-wide">{rfq.rfq_number}</span>
              {getStatusBadge(rfq.status)}
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">{rfq.title}</h1>
          </div>
        </div>

        {/* Close Button / View Quotes (only for admin/officer) */}
        {isAuthorized && (
          <div className="flex items-center gap-3">
            {/* View quotations linked button */}
            <button type="button"
              onClick={() => navigate(`/quotations/compare/${id}`)}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200/80 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all"
            >
              <FileSpreadsheet size={15} />
              <span>View Bids</span>
            </button>

            {/* Close RFQ action */}
            {rfq.status === 'open' && (
              <button type="button"
                onClick={handleCloseRFQ}
                disabled={submitting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                <Lock size={14} />
                <span>Close RFQ</span>
              </button>
            )}
          </div>
        )}

        {/* Submit / Edit Quotation Bid (only for vendors if RFQ is open) */}
        {user?.role === 'vendor' && rfq.status === 'open' && (
          <button type="button"
            onClick={() => {
              const myVendorInfo = vendors.find((v) => v.email === user.email);
              if (myVendorInfo && myVendorInfo.quotation_status === 'Submitted') {
                navigate(`/quotations/submit/${id}?edit_id=${myVendorInfo.quotation_id}`);
              } else {
                navigate(`/quotations/submit/${id}`);
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-green-600/10"
          >
            <span>
              {vendors.find((v) => v.email === user.email)?.quotation_status === 'Submitted'
                ? 'Edit Quotation Bid'
                : 'Submit Quotation Bid'}
            </span>
          </button>
        )}
      </div>

      {/* Grid: Info Card & Line items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info & Line Items (col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sourcing details card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Sourcing Description</h3>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/60 rounded-xl p-4 border border-slate-100/50">
              {rfq.description || 'No descriptive context logged.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-slate-400" />
                <span>Deadline: <span className="font-bold text-slate-800">{new Date(rfq.deadline).toLocaleDateString()}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <User size={15} className="text-slate-400" />
                <span>Published by: <span className="font-semibold text-slate-800">{rfq.creator_name || 'System'}</span></span>
              </div>
            </div>
          </div>

          {/* Line items table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <Layers size={16} className="text-slate-400" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Required Specifications</h3>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Product / Requirement</th>
                  <th className="py-3.5 px-6 text-right">Quantity</th>
                  <th className="py-3.5 px-6">Unit</th>
                  <th className="py-3.5 px-6">Specifications</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">{item.product_name}</td>
                    <td className="py-4 px-6 text-right font-bold text-slate-800">{item.quantity}</td>
                    <td className="py-4 px-6 text-slate-500">{item.unit}</td>
                    <td className="py-4 px-6 text-slate-500 italic max-w-xs truncate" title={item.specifications}>
                      {item.specifications || 'Standard specifications'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invited Vendors List (col-span-1) */}
        {user?.role !== 'vendor' && (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <Users size={16} className="text-slate-400" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Invited Suppliers ({vendors.length})</h3>
            </div>

            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[460px]">
              {vendors.map((vendor) => (
                <div key={vendor.vendor_id} className="p-4 hover:bg-slate-50/30 transition-all flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-800 text-xs truncate max-w-[150px]" title={vendor.company_name}>
                      {vendor.company_name}
                    </div>
                    {getQuotationStatusBadge(vendor.quotation_status)}
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Building size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{vendor.category}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{vendor.email}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RFQDetail;
