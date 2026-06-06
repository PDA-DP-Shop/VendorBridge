import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { socket, connectSocket } from '../../utils/socket';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  Users,
  FileText,
  FileSpreadsheet,
  CheckSquare,
  ShoppingBag,
  Receipt,
  BarChart2,
  History,
  LogOut,
  Bell,
  User as UserIcon,
  Menu,
} from 'lucide-react';

const MainLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Helper to format time ago
  const formatTimeAgo = (isoString) => {
    const now = new Date();
    const past = new Date(isoString);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  // Mark a single notification as read and navigate
  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await api.put(`/notifications/${notification.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    setIsNotificationsOpen(false);
    
    // Navigate based on entity_type and entity_id
    const { entity_type, entity_id } = notification;
    if (entity_type && entity_id) {
      if (entity_type === 'rfq') {
        navigate(`/rfqs/${entity_id}`);
      } else if (entity_type === 'quotation') {
        navigate(`/quotations/${entity_id}`);
      } else if (entity_type === 'approval') {
        navigate(`/approvals/${entity_id}`);
      } else if (entity_type === 'purchase_order') {
        navigate(`/purchase-orders/${entity_id}`);
      } else if (entity_type === 'invoice') {
        navigate(`/invoices/${entity_id}`);
      } else {
        navigate('/dashboard');
      }
    } else {
      navigate('/dashboard');
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  // Fetch initial notifications
  useEffect(() => {
    const fetchUserNotifications = async () => {
      if (!user) return;
      try {
        const res = await api.get('/notifications');
        if (res.data && res.data.success) {
          const list = res.data.notifications || [];
          setNotifications(list);
          const unread = list.filter((n) => !n.is_read).length;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error('Failed to fetch user notifications:', err);
      }
    };

    fetchUserNotifications();
  }, [user]);

  // Fetch initial pending approvals count for managers/admins
  useEffect(() => {
    const fetchPendingCount = async () => {
      if (!user) return;
      if (user.role === 'manager' || user.role === 'admin') {
        try {
          const res = await api.get('/approvals/pending-count');
          if (res.data && res.data.success) {
            setPendingApprovalsCount(res.data.count || 0);
          }
        } catch (err) {
          console.error('Failed to fetch pending approvals count:', err);
        }
      }
    };

    fetchPendingCount();
  }, [user]);

  // Establish global socket listeners for notifications
  useEffect(() => {
    if (!user) return;

    connectSocket();

    // Join room associated with the logged-in user
    socket.emit('join_room', `user_${user.id}`);

    // Listen for new_notification real-time event
    socket.on('new_notification', (notification) => {
      console.log('Socket notification - new_notification:', notification);
      
      setNotifications((prev) => [notification, ...prev.slice(0, 19)]);
      setUnreadCount((prev) => prev + 1);

      // Trigger custom glassmorphic toast notification
      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black/5 overflow-hidden border border-slate-100 transition-all duration-200`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="h-9 w-9 rounded-full bg-green-50 text-green-600 flex items-center justify-center border border-green-100 shadow-sm">
                  <Bell size={16} />
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-xs font-bold text-slate-800">{notification.title}</p>
                <p className="mt-0.5 text-[11px] text-slate-500 leading-normal">{notification.message}</p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-slate-100">
            <button type="button"
              onClick={() => {
                toast.dismiss(t.id);
                handleNotificationClick(notification);
              }}
              className="w-full border border-transparent rounded-none rounded-r-2xl px-4 flex items-center justify-center text-xs font-bold text-green-600 hover:text-green-700 hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
            >
              View
            </button>
          </div>
        </div>
      ), { duration: 6000 });
    });

    // Vendor added notification (for internal roles)
    const isInternal = user.role === 'admin' || user.role === 'procurement_officer';
    if (isInternal) {
      socket.on('vendor_added', (data) => {
        console.log('Socket notification - vendor_added:', data);
        toast.success(
          <div className="flex flex-col gap-0.5 text-left">
            <span className="font-bold text-slate-800 text-xs">New Vendor Added</span>
            <span className="text-[11px] text-slate-500 leading-normal">
              "{data.company_name}" ({data.category}) registered by {data.created_by_name}.
            </span>
          </div>,
          { duration: 5000 }
        );
      });

      socket.on('quotation_submitted', (data) => {
        console.log('Socket notification - quotation_submitted:', data);
        toast.success(
          <div className="flex flex-col gap-0.5 text-left">
            <span className="font-bold text-slate-800 text-xs text-green-700">New Bid Submitted!</span>
            <span className="text-[11px] text-slate-500 leading-normal">
              "{data.vendor_name}" submitted a quotation for "{data.rfq_title}" ({data.rfq_number}).
            </span>
            <Link
              to={`/quotations/${data.quotation_id}`}
              className="text-[10px] text-green-600 hover:text-green-800 font-bold mt-1 inline-block"
            >
              View Quotation &rarr;
            </Link>
          </div>,
          { duration: 6000 }
        );
      });
    }

    // RFQ Invite notification (for assigned vendor users)
    if (user.role === 'vendor') {
      socket.on('rfq_invite', (data) => {
        console.log('Socket notification - rfq_invite:', data);
        toast.success(
          <div className="flex flex-col gap-0.5 text-left">
            <span className="font-bold text-slate-800 text-xs text-green-700">Sourcing Invite Received!</span>
            <span className="text-[11px] text-slate-500 leading-normal">
              You have been invited to quote for: "{data.title}" ({data.rfq_number}).
            </span>
            <Link
              to={`/rfqs/${data.rfq_id}`}
              className="text-[10px] text-green-600 hover:text-green-800 font-bold mt-1 inline-block"
            >
              View RFQ Details &rarr;
            </Link>
          </div>,
          { duration: 7000 }
        );
      });
    }

    // Manager real-time approval count & toast notification
    const isManager = user.role === 'manager' || user.role === 'admin';
    if (isManager) {
      socket.on('approval_request', (data) => {
        console.log('Socket notification - approval_request:', data);
        toast.success(`New approval request for ${data.rfq_title}`, { duration: 6000 });
        setPendingApprovalsCount((prev) => prev + 1);
      });

      socket.on('approval_processed', (data) => {
        console.log('Socket notification - approval_processed:', data);
        setPendingApprovalsCount((prev) => Math.max(0, prev - 1));
      });
    }

    // Officer real-time approval status toast notification
    const isOfficer = user.role === 'procurement_officer' || user.role === 'admin';
    if (isOfficer) {
      socket.on('approval_done', (data) => {
        console.log('Socket notification - approval_done:', data);
        toast.success('Your quotation selection was approved', { duration: 6000 });
      });

      socket.on('approval_rejected', (data) => {
        console.log('Socket notification - approval_rejected:', data);
        toast.error('Your quotation selection was rejected', { duration: 6000 });
      });
    }

    return () => {
      socket.off('new_notification');
      socket.off('vendor_added');
      socket.off('rfq_invite');
      socket.off('quotation_submitted');
      socket.off('approval_request');
      socket.off('approval_processed');
      socket.off('approval_done');
      socket.off('approval_rejected');
    };
  }, [user]);

  // Map route path to clean human-readable headers
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Dashboard';
    if (path.includes('/vendors')) return 'Vendors Directory';
    if (path.includes('/rfqs')) return 'Requests for Quotation (RFQs)';
    if (path.includes('/quotations')) return 'Quotations Bids';
    if (path.includes('/approvals')) return 'Approval Center';
    if (path.includes('/purchase-orders')) return 'Purchase Orders';
    if (path.includes('/invoices')) return 'Ledger Invoices';
    if (path.includes('/reports')) return 'Analytics Reports';
    if (path.includes('/activity-logs')) return 'Activity Audit Logs';
    return 'VendorBridge ERP';
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Vendors', path: '/vendors', icon: Users },
    { name: 'RFQs', path: '/rfqs', icon: FileText },
    { name: 'Quotations', path: '/quotations', icon: FileSpreadsheet },
    { name: 'Approvals', path: '/approvals', icon: CheckSquare },
    { name: 'Purchase Orders', path: '/purchase-orders', icon: ShoppingBag },
    { name: 'Invoices', path: '/invoices', icon: Receipt },
    { name: 'Reports', path: '/reports', icon: BarChart2 },
    { name: 'Activity Logs', path: '/activity-logs', icon: History },
  ];

  // Restrict sidebar items: Activity Logs admin only, Reports internal staff only
  const filteredNavItems = navItems.filter(item => {
    if (item.path === '/activity-logs') {
      return user?.role === 'admin';
    }
    if (item.path === '/reports') {
      return user?.role !== 'vendor';
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans flex text-slate-800">
      {/* Fixed Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-60 bg-white border-r border-slate-200/80 flex flex-col justify-between z-30">
        <div>
          {/* Logo Brand Header */}
          <div className="h-16 border-b border-slate-100 flex items-center gap-3 px-6">
            <img src="/logo.png" alt="VendorBridge Logo" className="h-9 w-9 object-contain" />
            <span className="text-lg font-bold tracking-tight text-slate-900">
              VendorBridge
            </span>
          </div>

          {/* User Profile Card */}
          <div className="p-5 border-b border-slate-100/60 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-green-700 font-bold uppercase shadow-sm">
                {user?.name ? user.name.charAt(0) : <UserIcon size={18} />}
              </div>
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-slate-800 truncate">{user?.name || 'Session User'}</h4>
                <p className="text-[10px] text-slate-500 font-medium capitalize mt-0.5 tracking-wide bg-slate-200/60 rounded px-1.5 py-0.5 inline-block truncate max-w-full">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isDashboard = item.path === '/dashboard';
              const isVendors = item.path === '/vendors';
              const isRfqs = item.path === '/rfqs';
              const isQuotations = item.path === '/quotations';
              const isApprovals = item.path === '/approvals';
              const isPurchaseOrders = item.path === '/purchase-orders';
              const isInvoices = item.path === '/invoices';
              const isActivityLogs = item.path === '/activity-logs';
              const isReports = item.path === '/reports';
              const isRouteActive = 
                (isDashboard && location.pathname.startsWith('/dashboard')) || 
                (isVendors && location.pathname.startsWith('/vendors')) ||
                (isRfqs && location.pathname.startsWith('/rfqs')) ||
                (isQuotations && location.pathname.startsWith('/quotations')) ||
                (isApprovals && location.pathname.startsWith('/approvals')) ||
                (isPurchaseOrders && location.pathname.startsWith('/purchase-orders')) ||
                (isInvoices && location.pathname.startsWith('/invoices')) ||
                (isActivityLogs && location.pathname.startsWith('/activity-logs')) ||
                (isReports && location.pathname.startsWith('/reports'));

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group ${
                      isRouteActive
                        ? 'bg-green-50 text-green-700 shadow-sm shadow-green-600/5'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon
                    size={18}
                    className={`transition-colors ${
                      isRouteActive
                        ? 'text-[#16a34a]'
                        : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  />
                  <span>{item.name}</span>
                  {isApprovals && pendingApprovalsCount > 0 && (
                    <span className="ml-auto bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Logout Button */}
        <div className="p-4 border-t border-slate-100">
          <button type="button"
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors group cursor-pointer"
          >
            <LogOut size={18} className="text-red-400 group-hover:text-red-600 transition-colors" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Right Content Area */}
      <div className="flex-1 pl-60 min-h-screen flex flex-col">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-200/80 bg-white sticky top-0 z-20 flex items-center justify-between px-8">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              {getPageTitle()}
            </h2>
          </div>

          {/* Right Header Navigation Panel */}
          <div className="flex items-center gap-5">
            {/* Notification Bell */}
            <div className="relative">
              <button type="button"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="h-9 w-9 rounded-lg border border-slate-200/80 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all relative cursor-pointer"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30 cursor-default"
                    onClick={() => setIsNotificationsOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-40 overflow-hidden divide-y divide-slate-100 flex flex-col max-h-[480px]">
                    <div className="px-4 py-3 flex items-center justify-between bg-slate-50/50">
                      <span className="text-xs font-bold text-slate-800 tracking-wide flex items-center gap-1.5">
                        <Bell size={14} className="text-slate-400" />
                        Notifications
                        {unreadCount > 0 && (
                          <span className="bg-red-500/10 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {unreadCount} unread
                          </span>
                        )}
                      </span>
                      {unreadCount > 0 && (
                        <button type="button"
                          onClick={handleMarkAllAsRead}
                          className="text-[10px] font-bold text-green-600 hover:text-green-700 transition-colors cursor-pointer border-none bg-transparent"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="overflow-y-auto divide-y divide-slate-100 flex-1 max-h-[360px]">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center flex flex-col items-center justify-center">
                          <Bell size={24} className="text-slate-300 mb-1.5" />
                          <span className="text-[11px] text-slate-400 font-medium">
                            No notifications yet
                          </span>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button type="button"
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`w-full px-4 py-3 text-left transition-colors cursor-pointer flex flex-col gap-0.5 ${
                              !n.is_read
                                ? 'bg-blue-50/30 hover:bg-blue-50/60'
                                : 'bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-xs font-bold ${
                                  !n.is_read ? 'text-blue-900' : 'text-slate-800'
                                }`}
                              >
                                {n.title}
                              </span>
                              {!n.is_read && (
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 flex-shrink-0"></span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 leading-normal line-clamp-2">
                              {n.message}
                            </p>
                            <span className="text-[9px] font-semibold text-slate-400 mt-1 block">
                              {formatTimeAgo(n.created_at)}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Topbar User Avatar Indicator */}
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold uppercase border border-slate-200 text-xs shadow-sm">
                {user?.name ? user.name.substring(0, 2) : <UserIcon size={14} />}
              </div>
            </div>
          </div>
        </header>

        {/* Content Panel */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
