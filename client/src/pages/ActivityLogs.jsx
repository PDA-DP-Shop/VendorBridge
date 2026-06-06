import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import CustomSelect from '../components/UI/CustomSelect';
import api from '../utils/api';
import {
  Users,
  FileText,
  FileSpreadsheet,
  CheckSquare,
  ShoppingBag,
  Receipt,
  Calendar,
  User as UserIcon,
  RefreshCw,
  AlertCircle,
  Filter,
  History,
} from 'lucide-react';
import PageHeader from '../components/UI/PageHeader';

const ActivityLogs = () => {
  const { user } = useAuth();
  
  // Guard access - Admins only
  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-800">Access Denied</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-1 leading-normal">
          You do not have permission to view the system activity audit logs. This page is reserved for administrators only.
        </p>
      </div>
    );
  }

  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // Filter states
  const [userIdFilter, setUserIdFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch users for the filter dropdown
  useEffect(() => {
    const fetchUsersList = async () => {
      try {
        const res = await api.get('/auth/users');
        if (res.data && res.data.success) {
          setUsers(res.data.users || []);
        }
      } catch (err) {
        console.error('Failed to fetch users list for filters', err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsersList();
  }, []);

  // Fetch logs
  const fetchLogs = async (pageNum, isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params = {
        page: pageNum,
        limit: 15,
      };

      if (userIdFilter) params.user_id = userIdFilter;
      if (entityTypeFilter) params.entity_type = entityTypeFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await api.get('/activity-logs', { params });
      
      if (res.data && res.data.success) {
        const fetchedLogs = res.data.logs || [];
        const pagination = res.data.pagination || {};
        
        if (isLoadMore) {
          setLogs((prev) => [...prev, ...fetchedLogs]);
        } else {
          setLogs(fetchedLogs);
        }
        
        setHasMore(pageNum < pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch activity logs', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Trigger fetch when filters change
  useEffect(() => {
    setPage(1);
    fetchLogs(1, false);
  }, [userIdFilter, entityTypeFilter, startDate, endDate]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLogs(nextPage, true);
  };

  const handleResetFilters = () => {
    setUserIdFilter('');
    setEntityTypeFilter('');
    setStartDate('');
    setEndDate('');
  };

  // Helper to format date
  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Helper to get relative time ago if needed, or simple string
  const getEntityIconAndStyles = (entityType) => {
    const type = entityType.toLowerCase();
    switch (type) {
      case 'vendor':
        return {
          icon: <Users size={16} />,
          bg: 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm shadow-blue-50',
          label: 'Vendor Profile',
        };
      case 'rfq':
        return {
          icon: <FileText size={16} />,
          bg: 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm shadow-indigo-50',
          label: 'Sourcing RFQ',
        };
      case 'quotation':
        return {
          icon: <FileSpreadsheet size={16} />,
          bg: 'bg-amber-50 text-amber-600 border border-amber-100 shadow-sm shadow-amber-50',
          label: 'Vendor Bid',
        };
      case 'approval':
        return {
          icon: <CheckSquare size={16} />,
          bg: 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm shadow-emerald-50',
          label: 'Approval',
        };
      case 'purchase_order':
      case 'purchase-orders':
      case 'purchaseorder':
      case 'po':
        return {
          icon: <ShoppingBag size={16} />,
          bg: 'bg-purple-50 text-purple-600 border border-purple-100 shadow-sm shadow-purple-50',
          label: 'Purchase Order',
        };
      case 'invoice':
        return {
          icon: <Receipt size={16} />,
          bg: 'bg-rose-50 text-rose-600 border border-rose-100 shadow-sm shadow-rose-50',
          label: 'Ledger Invoice',
        };
      default:
        return {
          icon: <History size={16} />,
          bg: 'bg-slate-50 text-slate-600 border border-slate-100',
          label: 'System Activity',
        };
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<History size={13} className="text-white" />}
        module="Admin"
        title="Activity Logs"
        description="Full audit trail of all system actions performed by users"
        stats={[
          { label: `${logs?.length || 0} Log Entries`, icon: <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" /> },
          { label: 'Admin Access Only' },
        ]}
      />

      {/* Search & Filters Glassmorphism Panel */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm tracking-wide">
            <Filter size={16} className="text-slate-400" />
            <span>Audit Query Filters</span>
          </div>
          <button type="button"
            onClick={handleResetFilters}
            className="text-xs text-slate-400 hover:text-green-600 flex items-center gap-1 font-medium transition-colors cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* User Filter Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">Performed By</label>
            <CustomSelect
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              disabled={loadingUsers}
              placeholder="All Staff & Vendors"
              options={users.map((u) => ({
                value: u.id,
                label: `${u.name} (${u.role.replace('_', ' ')})`,
              }))}
            />
          </div>

          {/* Entity Type Filter Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">Entity Area</label>
            <CustomSelect
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              placeholder="All Categories"
              options={[
                { value: 'vendor', label: 'Vendor Directory' },
                { value: 'rfq', label: 'RFQs Sourcing' },
                { value: 'quotation', label: 'Quotations Bids' },
                { value: 'approval', label: 'Approvals' },
                { value: 'purchase_order', label: 'Purchase Orders' },
                { value: 'invoice', label: 'Ledger Invoices' },
              ]}
            />
          </div>

          {/* Date Range Start */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">From Date</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all font-medium"
              />
            </div>
          </div>

          {/* Date Range End */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">To Date</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline List Layout */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <RefreshCw size={24} className="text-green-600 animate-spin mb-3" />
            <p className="text-sm text-slate-500">Fetching audit history logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle size={32} className="text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No activity logs found</p>
            <p className="text-xs text-slate-400 mt-0.5">Try widening or resetting your filters.</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="relative border-l border-slate-100 pl-6 space-y-8 pb-2">
              {logs.map((log) => {
                const config = getEntityIconAndStyles(log.entity_type);
                
                return (
                  <div key={log.id} className="relative group">
                    {/* Circle Indicator on the timeline border line */}
                    <div className={`absolute -left-[35px] top-0 h-6 w-6 rounded-full flex items-center justify-center ${config.bg}`}>
                      {config.icon}
                    </div>
                    
                    {/* Log Details */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center flex-wrap gap-2 text-xs">
                          {/* User tag */}
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <span className="h-4 w-4 bg-slate-100 rounded-full flex items-center justify-center text-[10px] uppercase font-bold text-slate-600 border border-slate-200">
                              {log.user_name ? log.user_name.charAt(0) : <UserIcon size={8} />}
                            </span>
                            {log.user_name || 'System User'}
                          </span>
                          
                          <span className="text-slate-400 font-medium">
                            ({log.user_role?.replace('_', ' ') || 'unknown'})
                          </span>

                          <span className="h-1.5 w-1.5 rounded-full bg-slate-200"></span>

                          {/* Action Badge */}
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            log.action === 'CREATE'
                              ? 'bg-green-100 text-green-700'
                              : log.action === 'UPDATE'
                              ? 'bg-blue-100 text-blue-700'
                              : log.action === 'DELETE'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {log.action}
                          </span>

                          <span className="h-1.5 w-1.5 rounded-full bg-slate-200"></span>

                          {/* Area Tag */}
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight bg-slate-100 px-1.5 py-0.5 rounded">
                            {config.label}
                          </span>
                        </div>
                        
                        {/* Description Text */}
                        <p className="text-sm font-medium text-slate-700 leading-normal">
                          {log.description}
                        </p>
                      </div>

                      {/* Timestamp (Right Side) */}
                      <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 sm:self-start">
                        {formatTimestamp(log.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Load More trigger */}
            {hasMore && (
              <div className="flex items-center justify-center border-t border-slate-100 pt-6 mt-6">
                <button type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800 text-xs font-semibold rounded-xl px-5 py-2.5 flex items-center gap-2 shadow-sm transition-all duration-200 disabled:opacity-50 cursor-pointer"
                >
                  {loadingMore ? (
                    <RefreshCw size={14} className="animate-spin text-green-600" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  <span>{loadingMore ? 'Loading older entries...' : 'Load More Logs'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;
