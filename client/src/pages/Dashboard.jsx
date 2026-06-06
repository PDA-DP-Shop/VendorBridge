import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { socket, connectSocket, disconnectSocket } from '../utils/socket';
import toast from 'react-hot-toast';
import {
  FileText,
  CheckSquare,
  IndianRupee,
  AlertCircle,
  Plus,
  UserPlus,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          Completed
        </span>
      );
    case 'acknowledged':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
          Acknowledged
        </span>
      );
    case 'approved':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
          Approved
        </span>
      );
    case 'sent':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
          Sent
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Pending
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          Cancelled
        </span>
      );
    case 'draft':
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
          Draft
        </span>
      );
  }
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    active_rfqs_count: 0,
    pending_approvals_count: 0,
    po_total_this_month: 0,
    overdue_invoices_count: 0,
    recent_pos: [],
    spending_by_month: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Function to load stats from backend API
  const fetchStats = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await api.get('/dashboard/stats');
      if (res.data && res.data.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch stats and initialize sockets
  useEffect(() => {
    fetchStats();

    // Establish Socket.io connection
    connectSocket();

    // Listen for real-time dashboard updates
    socket.on('dashboard_update', (data) => {
      console.log('Real-time dashboard update event received:', data);
      toast.success(
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-slate-800 text-xs">Real-Time Update</span>
          <span className="text-[11px] text-slate-500">Dashboard metrics updated via WebSocket.</span>
        </div>,
        { duration: 4000 }
      );
      fetchStats(true); // silent update
    });

    return () => {
      socket.off('dashboard_update');
      disconnectSocket();
    };
  }, [fetchStats]);

  // Status badge for purchase order status

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20">
        <div className="h-10 w-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-slate-500">Retrieving operational statistics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Premium Hero Dashboard Header ── */}
      <div className="relative bg-gradient-to-br from-slate-900 via-[#0f172a] to-slate-900 rounded-2xl overflow-hidden px-8 py-8 flex flex-col md:flex-row md:items-center justify-between shadow-xl shadow-slate-900/20 mb-8">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        
        {/* Animated Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>

        <div className="relative z-10 flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/5 text-emerald-400 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm shadow-sm">
              Live Operations
            </span>
            {refreshing && (
              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Syncing...
              </span>
            )}
          </div>
          
          <h1 className="text-3xl font-black text-white tracking-tight">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300">{user?.name || 'User'}</span>
          </h1>
          <p className="text-sm text-slate-400 font-medium max-w-lg mt-0.5 leading-relaxed">
            Monitor real-time requests, approvals, purchase orders, and supplier statistics across your supply chain network.
          </p>
        </div>

        {/* Refresh Action */}
        <button type="button"
          onClick={() => fetchStats()}
          disabled={refreshing}
          className="relative z-10 self-start md:self-auto mt-6 md:mt-0 flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/10 hover:border-white/20 text-white rounded-xl text-xs font-bold transition-all shadow-lg backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className={`p-1 rounded-md bg-emerald-500/20 text-emerald-400 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}>
            <RefreshCw size={14} />
          </div>
          <span>{refreshing ? 'Updating Metrics' : 'Refresh Metrics'}</span>
        </button>
      </div>

      {/* Row of 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card 1: Active RFQs */}
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active RFQs</p>
            <h3 className="text-3xl font-extrabold text-[#16a34a] mt-2 tracking-tight">
              {stats.active_rfqs_count}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">open sourcing events</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center border border-green-100">
            <FileText size={20} />
          </div>
        </div>

        {/* Card 2: Pending Approvals */}
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Approvals</p>
            <h3 className="text-3xl font-extrabold text-amber-500 mt-2 tracking-tight">
              {stats.pending_approvals_count}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">awaiting signoff</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-amber-50/70 text-amber-500 flex items-center justify-center border border-amber-100/60">
            <CheckSquare size={20} />
          </div>
        </div>

        {/* Card 3: POs This Month */}
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">POs This Month</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight flex items-center">
              <IndianRupee size={22} className="text-slate-500 mr-0.5" />
              {stats.po_total_this_month.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">total commitment value</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <IndianRupee size={20} />
          </div>
        </div>

        {/* Card 4: Overdue Invoices */}
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overdue Invoices</p>
            <h3 className="text-3xl font-extrabold text-red-600 mt-2 tracking-tight">
              {stats.overdue_invoices_count}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">payments past due</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
            <AlertCircle size={20} />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Table (60%) & Recharts (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Column (60% -> col-span-3) */}
        <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Purchase Orders</h3>
            <p className="text-xs text-slate-500 mt-1">Latest procurement logs released to vendors</p>
          </div>

          <div className="overflow-x-auto flex-1">
            {stats.recent_pos.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No recent purchase orders logged.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">PO #</th>
                    <th className="py-3.5 px-6">Vendor</th>
                    <th className="py-3.5 px-6 text-right">Amount</th>
                    <th className="py-3.5 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {stats.recent_pos.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 font-mono font-semibold text-slate-900">{po.po_number}</td>
                      <td className="py-4 px-6 font-medium">{po.vendor_name || 'N/A'}</td>
                      <td className="py-4 px-6 text-right font-bold text-slate-900">
                        ₹ {po.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6 text-center">{getStatusBadge(po.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column (40% -> col-span-2) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Spending Trends</h3>
            <p className="text-xs text-slate-500 mt-1">Last 6 months cumulative procurement spending</p>
          </div>

          {/* Bar Chart Container */}
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.spending_by_month}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                  tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000) + 'k' : val}`}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  }}
                  formatter={(value) => [`₹ ${value.toLocaleString('en-IN')}`, 'Spending']}
                />
                <Bar dataKey="amount" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Quick Action buttons */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-900">
        <div>
          <h4 className="text-sm font-bold">Quick Sourcing Actions</h4>
          <p className="text-xs text-slate-400 mt-0.5">Initialize operations inside VendorBridge pipelines instantly</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* New RFQ button */}
          <button type="button"
            onClick={() => navigate('/rfqs/create')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-green-600/10 cursor-pointer"
          >
            <Plus size={16} />
            <span>New RFQ</span>
          </button>

          {/* Add Vendor button */}
          <button type="button"
            onClick={() => navigate('/vendors')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <UserPlus size={16} />
            <span>View Vendors</span>
          </button>

          {/* View Invoices button */}
          <button type="button"
            onClick={() => navigate('/invoices')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <Receipt size={16} />
            <span>View Invoices</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
