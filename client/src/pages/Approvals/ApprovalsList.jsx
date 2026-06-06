import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  Clock,
  User,
  ArrowRight,
  ClipboardCheck,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/UI/PageHeader';

const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
          Pending
        </span>
      );
    case 'approved':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
          Approved
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
          Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200">
          {status}
        </span>
      );
  }
};

const ApprovalsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [approvals, setApprovals] = useState(null);
  const loading = approvals === null;
  const [statusFilter, setStatusFilter] = useState('pending'); // pending, approved, rejected

  // Rejection Dialog states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [actioning, setActioning] = useState(false);

  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const fetchApprovals = useCallback(async () => {
    setApprovals(null);
    try {
      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const res = await api.get('/approvals', { params });
      if (res.data && res.data.success) {
        setApprovals(res.data.approvals || []);
      }
    } catch (err) {
      console.error('Failed to load approvals:', err);
      toast.error('Failed to retrieve approval requests.');
      setApprovals([]);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // Handle Approve Action
  const handleApprove = async (approvalId, vendorName) => {
    if (!window.confirm(`Are you sure you want to APPROVE the quotation selection from "${vendorName}"?`)) {
      return;
    }

    setActioning(true);
    try {
      const res = await api.put(`/approvals/${approvalId}/approve`, {
        remarks: 'Approved by manager.',
      });
      if (res.data && res.data.success) {
        toast.success(`Quotation from "${vendorName}" approved successfully.`);
        // Emit refresh if required
        await fetchApprovals();
      }
    } catch (err) {
      console.error('Approval failed:', err);
      const msg = err.response?.data?.message || 'Failed to approve request.';
      toast.error(msg);
    } finally {
      setActioning(false);
    }
  };

  // Open Rejection Dialog
  const handleRejectPrompt = (approvalId) => {
    setRejectingId(approvalId);
    setRemarks('');
    setShowRejectModal(true);
  };

  // Submit Rejection
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!remarks.trim()) {
      toast.error('Please provide rejection remarks.');
      return;
    }

    setActioning(true);
    try {
      const res = await api.put(`/approvals/${rejectingId}/reject`, {
        remarks: remarks.trim(),
      });
      if (res.data && res.data.success) {
        toast.success('Quotation selection rejected.');
        setShowRejectModal(false);
        setRejectingId(null);
        await fetchApprovals();
      }
    } catch (err) {
      console.error('Rejection failed:', err);
      const msg = err.response?.data?.message || 'Failed to reject request.';
      toast.error(msg);
    } finally {
      setActioning(false);
    }
  };

  // Status badge style helper

  const tabs = [
    { id: 'pending', name: 'Pending Reviews' },
    { id: 'approved', name: 'Approved' },
    { id: 'rejected', name: 'Rejected' },
    { id: 'all', name: 'All Requests' },
  ];

  return (
    <div className="space-y-5 font-sans">
      <PageHeader
        icon={<ClipboardCheck size={13} className="text-white" />}
        module="Manager Review"
        title="Approvals Center"
        description={isManager
          ? 'Authorize or reject quotation bids selected by procurement staff'
          : 'Monitor quotation approval requests submitted to managers'}
        stats={[
          { label: `${approvals?.length || 0} Requests`, icon: <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" /> },
          { label: statusFilter === 'all' ? 'All statuses' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) },
        ]}
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {tabs.map((tab) => (
          <button type="button"
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all -mb-px ${
              statusFilter === tab.id
                ? 'border-green-600 text-green-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Grid of Approval Cards (not tables) */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-20">
          <div className="h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-xs font-semibold text-slate-400">Loading approval requests...</p>
        </div>
      ) : approvals.length === 0 ? (
        <div className="flex flex-col justify-center items-center py-20 text-center bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4">
            <ClipboardCheck size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Approvals Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            There are no approval requests listed under this status filter at this time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {approvals.map((app) => (
            <div
              key={app.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wide">
                    REQ #{app.id}
                  </span>
                  {getStatusBadge(app.status)}
                </div>

                <h3 className="text-base font-bold text-slate-950 line-clamp-1 mb-1">
                  {app.rfq_title}
                </h3>
                <span className="text-[10px] text-slate-450 font-mono uppercase tracking-wider block mb-4">
                  RFQ Ref: {app.rfq_number}
                </span>

                {/* Details list */}
                <div className="space-y-2.5 text-xs border-t border-slate-50 pt-4 mb-5 text-slate-650">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">Vendor Name:</span>
                    <span className="font-bold text-slate-800">{app.company_name}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">Total Amount:</span>
                    <span className="font-black text-slate-900">
                      ₹{parseFloat(app.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">Delivery Time:</span>
                    <span className="font-bold text-slate-700">{app.delivery_days} days</span>
                  </div>

                  <div className="flex justify-between items-center border-t border-dashed border-slate-100 pt-2.5 mt-1">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <User size={12} />
                      <span>Sourcing Officer:</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-700">{app.officer_name || 'System'}</span>
                  </div>

                  {app.remarks && app.status !== 'pending' && (
                    <div className="bg-slate-50/80 border border-slate-100 p-2.5 rounded-lg text-[10px] text-slate-500 leading-normal italic mt-2">
                      Remarks: "{app.remarks}"
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="space-y-2.5">
                {isManager && app.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    {/* Approve button */}
                    <button type="button"
                      onClick={() => handleApprove(app.id, app.company_name)}
                      disabled={actioning}
                      className="flex items-center justify-center gap-1 py-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      <CheckCircle size={13} />
                      <span>Approve</span>
                    </button>

                    {/* Reject button */}
                    <button type="button"
                      onClick={() => handleRejectPrompt(app.id)}
                      disabled={actioning}
                      className="flex items-center justify-center gap-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      <XCircle size={13} />
                      <span>Reject</span>
                    </button>
                  </div>
                )}

                <button type="button"
                  onClick={() => navigate(`/approvals/${app.id}`)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg text-xs font-bold transition-colors"
                >
                  <span>View Full Details</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Remarks Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertCircle size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reject Quotation Selection</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Rejection requires clarifying comments. Specify what changes are required.
                </p>
              </div>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Rejection Remarks *
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Total price exceeds department budget limit by 15%. Re-negotiate pricing details with vendor."
                  required
                  rows={4}
                  className="w-full bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectingId(null);
                  }}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actioning}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  {actioning && <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>Reject Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalsList;
