import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
  FileText,
  Plus,
  Search,
  ArrowRight,
  ShoppingBag,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/UI/PageHeader';

const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'draft':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200">
          Draft
        </span>
      );
    case 'sent':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          Sent
        </span>
      );
    case 'acknowledged':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          Acknowledged
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
          Completed
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

const POList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [purchaseOrders, setPurchaseOrders] = useState(null);
  const loading = purchaseOrders === null;
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isOfficer = user?.role === 'procurement_officer' || user?.role === 'admin';

  const fetchPOs = useCallback(async () => {
    setPurchaseOrders(null);
    try {
      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const res = await api.get('/purchase-orders', { params });
      if (res.data && res.data.success) {
        setPurchaseOrders(res.data.purchaseOrders || []);
      }
    } catch (err) {
      console.error('Failed to load purchase orders:', err);
      toast.error('Failed to retrieve purchase orders.');
      setPurchaseOrders([]);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPOs();
  }, [fetchPOs]);

  // Filter based on search query
  const filteredPOs = purchaseOrders ? purchaseOrders.filter((po) => {
    const query = searchQuery.toLowerCase();
    return (
      po.po_number.toLowerCase().includes(query) ||
      po.company_name.toLowerCase().includes(query) ||
      (po.rfq_title && po.rfq_title.toLowerCase().includes(query))
    );
  }) : [];


  return (
    <div className="space-y-5 font-sans">
      <PageHeader
        icon={<ShoppingBag size={13} className="text-white" />}
        module="Procurement"
        title="Purchase Orders"
        description="Manage corporate commitments, agreements, and procurement logs released to vendors"
        stats={[
          { label: `${purchaseOrders?.length || 0} POs`, icon: <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" /> },
          { label: statusFilter === 'all' ? 'All statuses' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) },
        ]}
        action={isOfficer && (
          <button type="button"
            onClick={() => navigate('/purchase-orders/create')}
            className="flex items-center gap-2 px-5 py-3 bg-green-500 hover:bg-green-400 active:bg-green-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-600/30 hover:shadow-green-500/40 hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>Generate PO</span>
          </button>
        )}
      />

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 w-full md:w-80 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus-within:border-green-600 transition-all">
          <Search size={15} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search PO#, Vendor or RFQ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs w-full focus:outline-none text-slate-800"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto self-start md:self-auto">
          {['all', 'draft', 'sent', 'acknowledged', 'completed'].map((status) => (
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
          <p className="mt-4 text-xs font-semibold text-slate-400">Loading purchase orders...</p>
        </div>
      ) : filteredPOs.length === 0 ? (
        <div className="flex flex-col justify-center items-center py-20 text-center bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4">
            <ShoppingBag size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Purchase Orders</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            There are no purchase orders matching your search queries or status filters at this time.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">PO Number</th>
                  <th className="py-4 px-6">Vendor Name</th>
                  <th className="py-4 px-6">RFQ Title</th>
                  <th className="py-4 px-6 text-right">Subtotal</th>
                  <th className="py-4 px-6 text-right">GST (18%)</th>
                  <th className="py-4 px-6 text-right">Grand Total</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-center">Date</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredPOs.map((po) => (
                  <tr
                    key={po.id}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/purchase-orders/${po.id}`)}
                  >
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">{po.po_number}</td>
                    <td className="py-4 px-6 font-semibold text-slate-800">{po.company_name}</td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-800 line-clamp-1">{po.rfq_title || 'N/A'}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{po.rfq_number || 'N/A'}</span>
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-slate-600">
                      ₹{parseFloat(po.total_amount).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-slate-600">
                      ₹{parseFloat(po.tax_amount).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-right font-extrabold text-slate-950">
                      ₹{parseFloat(po.grand_total).toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-center">{getStatusBadge(po.status)}</td>
                    <td className="py-4 px-6 text-center text-slate-400 font-mono font-medium">
                      {new Date(po.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                      <button type="button"
                        onClick={() => navigate(`/purchase-orders/${po.id}`)}
                        className="p-1 text-slate-400 hover:text-green-600 transition-colors inline-flex items-center gap-1 font-bold text-[11px]"
                      >
                        <span>Manage</span>
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

export default POList;
