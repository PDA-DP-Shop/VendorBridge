import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  Download,
  FileText,
  Users,
  ShoppingBag,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  BarChart2,
} from 'lucide-react';
import PageHeader from '../components/UI/PageHeader';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const Reports = () => {
  const { user } = useAuth();
  
  // Guard access - Internal staff only
  if (user?.role === 'vendor') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-800">Access Denied</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-1 leading-normal">
          You do not have permission to view corporate reports. This panel is reserved for internal procurement staff and management only.
        </p>
      </div>
    );
  }

  const [stats, setStats] = useState(null);
  const [spending, setSpending] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Sorting state for vendor performance table
  const [sortField, setSortField] = useState('total_amount');
  const [sortOrder, setSortOrder] = useState('desc');

  // Green color palette matching the app brand
  const COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#15803d', '#166534', '#14532d'];

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [statsRes, spendingRes, performanceRes] = await Promise.all([
        api.get('/reports/procurement-stats'),
        api.get('/reports/spending-summary'),
        api.get('/reports/vendor-performance'),
      ]);

      if (statsRes.data && statsRes.data.success) {
        setStats(statsRes.data.stats);
      }
      if (spendingRes.data && spendingRes.data.success) {
        setSpending(spendingRes.data);
      }
      if (performanceRes.data && performanceRes.data.success) {
        setPerformance(performanceRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  // Sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default numbers descending
    }
  };

  // Sort helper
  const getSortedPerformance = () => {
    return [...performance].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortOrder === 'asc'
          ? (valA || 0) - (valB || 0)
          : (valB || 0) - (valA || 0);
      }
    });
  };

  // Trigger export CSV download
  const handleExport = async (type) => {
    setIsExportOpen(false);
    try {
      const response = await api.get(`/reports/export?type=${type}`, {
        responseType: 'blob', // Important for file download triggers
      });

      // Construct browser blob url
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Filename formatting
      const dateStr = new Date().toISOString().slice(0, 7);
      link.setAttribute('download', `${type}_export_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Export failed for type: ${type}`, err);
    }
  };

  // Find highest vendor PO total amount to scale progress bars relatively
  const maxVendorAmount = performance.length > 0 
    ? Math.max(...performance.map(v => v.total_amount || 0)) 
    : 1;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <RefreshCw size={32} className="text-green-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Assembling analytics report structures...</p>
      </div>
    );
  }

  const sortedData = getSortedPerformance();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BarChart2 size={13} className="text-white" />}
        module="Analytics"
        title="Reports & Analytics"
        description="Real-time spend patterns, vendor scorecards, and historical KPIs"
        stats={[
          { label: `${performance.length} Vendors Tracked`, icon: <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" /> },
          { label: stats ? `${stats.total_rfqs || 0} RFQs Total` : 'Loading...' },
        ]}
        action={
          <div className="relative">
            <button type="button"
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-2 px-5 py-3 bg-green-500 hover:bg-green-400 active:bg-green-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-600/30 hover:shadow-green-500/40 hover:-translate-y-0.5 cursor-pointer"
            >
              <Download size={14} />
              <span>Export CSV</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`} />
            </button>

            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-40 overflow-hidden divide-y divide-slate-100 flex flex-col">
                  <button type="button" onClick={() => handleExport('vendors')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs text-slate-700 font-semibold cursor-pointer border-none bg-transparent">Export Vendors List</button>
                  <button type="button" onClick={() => handleExport('rfqs')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs text-slate-700 font-semibold cursor-pointer border-none bg-transparent">Export RFQs Sourcing</button>
                  <button type="button" onClick={() => handleExport('pos')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs text-slate-700 font-semibold cursor-pointer border-none bg-transparent">Export Purchase Orders</button>
                  <button type="button" onClick={() => handleExport('invoices')} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs text-slate-700 font-semibold cursor-pointer border-none bg-transparent">Export Invoices</button>
                </div>
              </>
            )}
          </div>
        }
      />

      {/* Row 1: KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total RFQs Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-sm relative group overflow-hidden">
          <div className="space-y-1.5 z-10">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total RFQs Created</span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{stats?.totalRFQs || 0}</h3>
            <p className="text-[10px] text-slate-500 font-medium">{stats?.avgQuotesPerRFQ || 0} quotes average per RFQ</p>
          </div>
          <div className="h-10 w-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center border border-green-100 group-hover:scale-105 transition-transform">
            <FileText size={18} />
          </div>
        </div>

        {/* Total Vendors Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-sm relative group overflow-hidden">
          <div className="space-y-1.5 z-10">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Vendors</span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{stats?.totalActiveVendors || 0}</h3>
            <p className="text-[10px] text-slate-500 font-medium">Onboarded profile records</p>
          </div>
          <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
            <Users size={18} />
          </div>
        </div>

        {/* Total Purchase Orders Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-sm relative group overflow-hidden">
          <div className="space-y-1.5 z-10">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total POs Issued</span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{stats?.totalPOs || 0}</h3>
            <p className="text-[10px] text-slate-500 font-medium">Approval times avg {stats?.avgApprovalTimeHours || 0} hrs</p>
          </div>
          <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100 group-hover:scale-105 transition-transform">
            <ShoppingBag size={18} />
          </div>
        </div>

        {/* Total Invoices Paid Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between shadow-sm relative group overflow-hidden">
          <div className="space-y-1.5 z-10">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Invoices Paid</span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{stats?.invoices?.paid || 0}</h3>
            <p className="text-[10px] text-slate-500 font-medium">{stats?.invoices?.unpaid || 0} ledger invoices pending payment</p>
          </div>
          <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
            <CheckCircle2 size={18} />
          </div>
        </div>
      </div>

      {/* Row 2: Side-by-Side Spending Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Monthly Spending Trends */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800 tracking-wide flex items-center gap-1.5">
              <TrendingUp size={16} className="text-green-600" />
              Monthly Spending Trends
            </h4>
            <p className="text-[10px] text-slate-400">Chronological rolling spend totals over the last 12 months.</p>
          </div>
          
          <div className="h-72 w-full">
            {spending?.monthlySpending?.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
                No PO records found to chart spending trends.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spending?.monthlySpending} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month_label" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '11px',
                    }}
                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Spent Amount']}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={{ fill: '#16a34a', strokeWidth: 1 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Spending by Category */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800 tracking-wide">Spending by Category</h4>
            <p className="text-[10px] text-slate-400">Proportional budget spending share categorized by vendor specialization.</p>
          </div>
          
          <div className="h-72 w-full flex flex-col sm:flex-row items-center justify-center gap-4">
            {spending?.categorySpending?.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
                No PO category entries logged.
              </div>
            ) : (
              <>
                <div className="h-full flex-1 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spending?.categorySpending}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        {spending?.categorySpending.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          fontSize: '11px',
                        }}
                        formatter={(value) => `₹${value.toLocaleString()}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend list panel */}
                <div className="flex flex-col gap-2 w-full sm:w-48 overflow-y-auto max-h-56 pr-2">
                  {spending?.categorySpending.map((item, idx) => (
                    <div key={item.category} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      ></span>
                      <span className="font-semibold text-slate-700 truncate max-w-[120px]">{item.category}</span>
                      <span className="text-slate-400 ml-auto font-bold text-[10px]">
                        ₹{item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Sortable Vendor Performance Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden space-y-4 p-5">
        <div>
          <h4 className="text-sm font-bold text-slate-800 tracking-wide">Vendor Performance & Scorecard</h4>
          <p className="text-[10px] text-slate-400">Scorecard metric listing top 10 vendors (ordered by amount won). Click headers to sort.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold tracking-wider select-none text-[10px]">
                {/* Vendor Name Header */}
                <th
                  onClick={() => handleSort('company_name')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors rounded-l-xl text-left"
                >
                  <div className="flex items-center gap-1">
                    <span>Vendor Name</span>
                    {sortField === 'company_name' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>
                
                {/* Category Header */}
                <th
                  onClick={() => handleSort('category')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-1">
                    <span>Category</span>
                    {sortField === 'category' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                {/* RFQs Invited Header */}
                <th
                  onClick={() => handleSort('rfqs_invited')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>RFQs Invited</span>
                    {sortField === 'rfqs_invited' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                {/* Quotes Submitted Header */}
                <th
                  onClick={() => handleSort('quotations_submitted')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Quotes Submitted</span>
                    {sortField === 'quotations_submitted' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                {/* POs Won Header */}
                <th
                  onClick={() => handleSort('pos_won')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>POs Won</span>
                    {sortField === 'pos_won' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>

                {/* Amount Won Header */}
                <th
                  onClick={() => handleSort('total_amount')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-right rounded-r-xl"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Won</span>
                    {sortField === 'total_amount' && (sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </div>
                </th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium">
                    No vendor performance metrics logged yet.
                  </td>
                </tr>
              ) : (
                sortedData.map((v) => {
                  const relativePercent = Math.min(100, Math.max(0, ((v.total_amount || 0) / maxVendorAmount) * 100));
                  
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition-colors font-medium">
                      <td className="px-4 py-3.5 font-bold text-slate-800">{v.company_name}</td>
                      <td className="px-4 py-3.5 text-slate-500">{v.category}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-700">{v.rfqs_invited}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-700">{v.quotations_submitted}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-700">{v.pos_won}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-bold text-slate-800">₹{v.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          
                          {/* Relative share horizontal progress bar */}
                          <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-green-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${relativePercent}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 4: Top Spending Months Bar Chart (Full Width) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800 tracking-wide">Top Spending Months Comparison</h4>
          <p className="text-[10px] text-slate-400">Total historical monthly spending comparing procurement commitments side by side.</p>
        </div>
        
        <div className="h-72 w-full">
          {spending?.monthlySpending?.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
              No historical PO entries logged to compare.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spending?.monthlySpending} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month_label" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '11px',
                  }}
                  formatter={(value) => [`₹${value.toLocaleString()}`, 'Monthly Spending']}
                />
                <Bar dataKey="amount" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={45}>
                  {spending?.monthlySpending.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#16a34a' : '#4ade80'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
