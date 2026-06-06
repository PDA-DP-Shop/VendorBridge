import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Building,
  CheckCircle,
  XCircle,
  TrendingUp,
  Layers,
  AlertCircle,
  Info,
  CheckCircle2,
  XOctagon,
  Mail,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
          Pending Review
        </span>
      );
    case 'approved':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
          Approved
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

const ApprovalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [approval, setApproval] = useState(null);
  const [items, setItems] = useState([]);
  const [rank, setRank] = useState({ position: 1, total: 1 });
  const [loading, setLoading] = useState(true);

  // Remarks state
  const [remarks, setRemarks] = useState('');
  const [actioning, setActioning] = useState(false);

  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const fetchApprovalDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/approvals/${id}`);
      if (res.data && res.data.success) {
        setApproval(res.data.approval);
        setItems(res.data.items || []);
        setRank(res.data.rank || { position: 1, total: 1 });
        setRemarks(res.data.approval.remarks || '');
      }
    } catch (err) {
      console.error('Failed to load approval details:', err);
      toast.error('Failed to retrieve approval request details.');
      navigate('/approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovalDetails();
  }, [id]);

  // Handle Approve
  const handleApprove = async () => {
    if (!window.confirm('Confirm APPROVAL of this quotation selection request?')) {
      return;
    }

    setActioning(true);
    try {
      const res = await api.put(`/approvals/${id}/approve`, {
        remarks: remarks.trim() || 'Approved by manager.',
      });
      if (res.data && res.data.success) {
        toast.success('Approval request approved successfully.');
        await fetchApprovalDetails();
      }
    } catch (err) {
      console.error('Approve failed:', err);
      const msg = err.response?.data?.message || 'Failed to approve request.';
      toast.error(msg);
    } finally {
      setActioning(false);
    }
  };

  // Handle Reject
  const handleReject = async () => {
    if (!remarks.trim()) {
      toast.error('Please specify the reasons/remarks for rejecting this request.');
      return;
    }

    if (!window.confirm('Confirm REJECTION of this quotation selection request?')) {
      return;
    }

    setActioning(true);
    try {
      const res = await api.put(`/approvals/${id}/reject`, {
        remarks: remarks.trim(),
      });
      if (res.data && res.data.success) {
        toast.success('Approval request rejected.');
        await fetchApprovalDetails();
      }
    } catch (err) {
      console.error('Reject failed:', err);
      const msg = err.response?.data?.message || 'Failed to reject request.';
      toast.error(msg);
    } finally {
      setActioning(false);
    }
  };

  // Status Badge Helper

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20">
        <div className="h-10 w-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-slate-500">Retrieving approval specs details...</p>
      </div>
    );
  }

  if (!approval) return null;

  const isPending = approval.status === 'pending';
  const showActionPanel = isManager && isPending;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={() => navigate('/approvals')}
            className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 font-mono tracking-wide">
                Approval Request #{approval.id}
              </span>
              {getStatusBadge(approval.status)}
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">
              Select Quote Approval: {approval.rfq_title}
            </h1>
          </div>
        </div>
      </div>

      {/* Grid Layout: Details vs Timeline Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left main: RFQ summaries, itemized quote list (col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* RFQ & Quote metadata summary */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Sourcing Event RFQ Details
              </h3>
              <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-slate-900 truncate">{approval.rfq_title}</div>
                <div className="font-mono text-[10px] text-slate-500">Number: {approval.rfq_number}</div>
                <div className="text-slate-500">
                  Officer: <span className="font-semibold text-slate-700">{approval.officer_name || 'System'}</span>
                </div>
                {approval.rfq_description && (
                  <p className="text-[10px] text-slate-400 leading-normal border-t border-slate-200/40 pt-2 mt-1 line-clamp-2">
                    {approval.rfq_description}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Quotation Proposal Notes
              </h3>
              <p className="text-xs text-slate-650 leading-relaxed bg-slate-50 border border-slate-200/50 p-4 rounded-xl italic min-h-[96px]">
                {approval.quotation_notes || 'No notes or logistics instructions provided by vendor.'}
              </p>
            </div>
          </div>

          {/* Table of items pricing */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <Layers size={16} className="text-slate-400" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Itemized pricing bid sheet</h3>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Product / Requirement</th>
                  <th className="py-3.5 px-6 text-right">Quantity</th>
                  <th className="py-3.5 px-6 text-right">Unit Price</th>
                  <th className="py-3.5 px-6 text-right">Total Price</th>
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
                    <td className="py-4 px-6 text-right font-semibold text-slate-650">
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

        {/* Right sidebar: Commercial terms, rank comparison, action forms, and timeline */}
        <div className="space-y-6">
          {/* Rank comparison summary badge */}
          <div className="bg-gradient-to-br from-green-700 to-green-950 text-white rounded-2xl p-6 shadow-md shadow-green-950/10 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-green-300" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-green-200">
                Sourcing Rank Check
              </h3>
            </div>

            <div className="border-t border-green-600/40 pt-4 text-xs space-y-2 text-green-100">
              <div className="flex justify-between items-center">
                <span>Quotation Position:</span>
                <span className="font-black text-sm">
                  Rank {rank.position} of {rank.total}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Grand Total:</span>
                <span className="font-black text-base text-white">
                  ₹{parseFloat(approval.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-green-600/30 pt-2 mt-1">
                <span>Lead Timeline:</span>
                <span className="font-extrabold text-white">{approval.delivery_days} days</span>
              </div>
            </div>

            {rank.position === 1 && (
              <div className="bg-green-600/50 border border-green-500/40 rounded-xl p-3 flex gap-2 items-start text-[11px] text-green-50 leading-relaxed pt-2">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-green-300" />
                <span>
                  This quotation represents the lowest total pricing offer submitted for this sourcing event.
                </span>
              </div>
            )}
          </div>

          {/* Vendor Details */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Invited Vendor details
            </h3>
            <div className="space-y-3.5 text-xs text-slate-650">
              <div className="flex items-center gap-2.5">
                <Building size={15} className="text-slate-400 shrink-0" />
                <div>
                  <h4 className="font-extrabold text-slate-800 leading-none">{approval.company_name}</h4>
                  <span className="text-[10px] text-slate-400 font-semibold">{approval.category}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <User size={15} className="text-slate-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block leading-none">Contact</span>
                  <span className="font-bold text-slate-700">{approval.contact_person || 'N/A'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail size={15} className="text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700 break-all">{approval.vendor_email}</span>
              </div>
            </div>
          </div>

          {/* Action Remarks form & approve/reject buttons */}
          {showActionPanel && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                Approval action form
              </h3>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Manager Remarks / Comments
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Approve quotation selection or specify rejection reasons..."
                  rows={4}
                  required
                  className="w-full bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-all"
                />
                <span className="text-[9px] text-slate-450 mt-1 block">
                  Remarks are required when rejecting this request.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {/* Quick approve */}
                <button type="button"
                  onClick={handleApprove}
                  disabled={actioning}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-extrabold rounded-lg transition-colors shadow-sm"
                >
                  <CheckCircle size={15} />
                  <span>Approve</span>
                </button>

                {/* Quick reject */}
                <button type="button"
                  onClick={handleReject}
                  disabled={actioning}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-lg transition-colors shadow-sm"
                >
                  <XCircle size={15} />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          )}

          {/* Timeline tracker display */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Request Timeline
            </h3>

            {/* Vertical timeline items */}
            <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 pl-1">
              {/* Event 1: Submitted */}
              <div className="flex gap-4 items-start relative text-xs">
                <div className="h-6.5 w-6.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 z-10">
                  <FileText size={12} />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800">Quotation Bid Logged</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(approval.submitted_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Event 2: Sent for approval */}
              <div className="flex gap-4 items-start relative text-xs">
                <div className="h-6.5 w-6.5 rounded-full bg-yellow-50 border border-yellow-250 text-yellow-600 flex items-center justify-center shrink-0 z-10 animate-pulse">
                  <Info size={12} />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800">Selection Sent for Approval</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Selected by {approval.officer_name || 'Procurement Officer'}
                  </p>
                </div>
              </div>

              {/* Event 3: Final action */}
              {approval.status !== 'pending' && (
                <div className="flex gap-4 items-start relative text-xs">
                  <div
                    className={`h-6.5 w-6.5 rounded-full flex items-center justify-center shrink-0 z-10 border ${
                      approval.status === 'approved'
                        ? 'bg-green-50 border-green-200 text-green-600'
                        : 'bg-red-50 border-red-200 text-red-600'
                    }`}
                  >
                    {approval.status === 'approved' ? <CheckCircle2 size={12} /> : <XOctagon size={12} />}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800">
                      Request {approval.status === 'approved' ? 'Approved' : 'Rejected'}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Processed by {approval.approver_name || 'Manager'}
                    </p>
                    {approval.remarks && (
                      <p className="text-[10px] bg-slate-50 border border-slate-100 rounded-lg p-2 text-slate-500 mt-1.5 italic leading-relaxed">
                        Remarks: "{approval.remarks}"
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalDetail;
