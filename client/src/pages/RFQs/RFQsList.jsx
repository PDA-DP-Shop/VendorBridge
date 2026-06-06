import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
  FileText,
  Plus,
  Calendar,
  Layers,
  Users,
  Eye,
  FolderOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/UI/PageHeader';

const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'open':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
          Open
        </span>
      );
    case 'closed':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200">
          Closed
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
          Cancelled
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

const RFQsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rfqs, setRfqs] = useState(null);
  const loading = rfqs === null;
  const [statusFilter, setStatusFilter] = useState('all'); // all, open, closed, cancelled

  const isAuthorized = user?.role === 'admin' || user?.role === 'procurement_officer';

  // Fetch RFQs list
  const fetchRfqs = useCallback(async () => {
    setRfqs(null);
    try {
      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const res = await api.get('/rfqs', { params });
      if (res.data && res.data.success) {
        setRfqs(res.data.rfqs || []);
      }
    } catch (err) {
      console.error('Failed to load RFQs list:', err);
      toast.error('Failed to retrieve Requests for Quotation (RFQs).');
      setRfqs([]);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRfqs();
  }, [fetchRfqs]);

  // Status Badge Helper

  const tabs = [
    { id: 'all', name: 'All RFQs' },
    { id: 'open', name: 'Open' },
    { id: 'closed', name: 'Closed' },
    { id: 'cancelled', name: 'Cancelled' },
  ];

  return (
    <div className="space-y-5 font-sans">
      <PageHeader
        icon={<FileText size={13} className="text-white" />}
        module="Procurement"
        title="Sourcing Events (RFQs)"
        description="Generate and negotiate Requests for Quotation with your vendors"
        stats={[
          { label: `${rfqs?.length || 0} RFQs`, icon: <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" /> },
          { label: statusFilter === 'all' ? 'All statuses' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) },
        ]}
        action={isAuthorized && (
          <button type="button"
            onClick={() => navigate('/rfqs/create')}
            className="flex items-center gap-2 px-5 py-3 bg-green-500 hover:bg-green-400 active:bg-green-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-600/30 hover:shadow-green-500/40 hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus size={16} />
            <span>Create RFQ</span>
          </button>
        )}
      />

      {/* Filter Tabs */}
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

      {/* RFQ Grid Body */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-20">
          <div className="h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-xs font-semibold text-slate-400">Loading sourcing events...</p>
        </div>
      ) : rfqs.length === 0 ? (
        <div className="flex flex-col justify-center items-center py-20 text-center bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4">
            <FileText size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No RFQs Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            We couldn't find any sourcing events matching this status. Click Create RFQ to establish one.
          </p>
          {isAuthorized && (
            <button type="button"
              onClick={() => navigate('/rfqs/create')}
              className="mt-5 px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-lg transition-all"
            >
              Establish First RFQ
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rfqs.map((rfq) => (
            <div
              key={rfq.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* Header Info */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-xs font-bold text-slate-500 font-mono tracking-wide">{rfq.rfq_number}</span>
                  {getStatusBadge(rfq.status)}
                </div>
                <h3 className="text-base font-bold text-slate-900 line-clamp-1 mb-2">
                  {rfq.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                  {rfq.description || 'No description provided.'}
                </p>
              </div>

              {/* Counts & Actions */}
              <div className="border-t border-slate-100 pt-4 mt-2">
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-5">
                  <div className="flex items-center gap-1.5">
                    <Layers size={14} className="text-slate-400" />
                    <span>{rfq.items_count || 0} line items</span>
                  </div>
                  {user?.role !== 'vendor' && (
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-slate-400" />
                      <span>{rfq.vendors_count || 0} invited</span>
                    </div>
                  )}
                  <div className="col-span-2 flex items-center gap-1.5 mt-1">
                    <Calendar size={14} className="text-slate-400" />
                    <span>Due: <span className="font-semibold text-slate-700">{new Date(rfq.deadline).toLocaleDateString()}</span></span>
                  </div>
                </div>

                {/* View details */}
                <button type="button"
                  onClick={() => navigate(`/rfqs/${rfq.id}`)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg text-xs font-bold transition-colors"
                >
                  <Eye size={14} />
                  <span>View Sourcing Details</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RFQsList;
