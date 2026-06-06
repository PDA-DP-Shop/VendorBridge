import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Filter,
  Users,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import VendorForm from './VendorForm';
import toast from 'react-hot-toast';
import CustomSelect from '../../components/UI/CustomSelect';

const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'active':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
          Active
        </span>
      );
    case 'inactive':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
          Inactive
        </span>
      );
    case 'blacklisted':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          Blacklisted
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
          {status}
        </span>
      );
  }
};

const VendorsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Vendor lists & pagination state
  const [vendors, setVendors] = useState(null);
  const [categories, setCategories] = useState([]);
  const loading = vendors === null;
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const isAuthorized = user?.role === 'admin' || user?.role === 'procurement_officer';

  // Fetch unique categories
  const fetchCategories = async () => {
    try {
      const res = await api.get('/vendors/categories');
      if (res.data && res.data.success) {
        setCategories(res.data.categories || []);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  // Fetch vendors list based on filters
  const fetchVendors = useCallback(async () => {
    setVendors(null);
    try {
      const params = {
        page,
        limit: 8,
      };
      if (search) params.search = search;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await api.get('/vendors', { params });
      if (res.data && res.data.success) {
        setVendors(res.data.vendors || []);
        setTotalPages(res.data.pagination.pages || 1);
        setTotalItems(res.data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to load vendors:', err);
      toast.error('Failed to load vendors directory.');
      setVendors([]);
    }
  }, [page, search, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Handle pagination page shift
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Handle search submit or filter changes
  const handleFilterReset = () => {
    setSearch('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  // Soft delete click trigger
  const handleDeleteClick = async (vendorId, companyName) => {
    if (window.confirm(`Are you sure you want to deactivate vendor "${companyName}"? This will set their status to inactive.`)) {
      try {
        const res = await api.delete(`/vendors/${vendorId}`);
        if (res.data && res.data.success) {
          toast.success(`Vendor "${companyName}" deactivated successfully.`);
          fetchVendors();
        }
      } catch (err) {
        console.error('Failed to delete vendor:', err);
        toast.error('Failed to deactivate vendor.');
      }
    }
  };

  // Open Form Modal for Create or Edit
  const handleOpenForm = (vendor = null) => {
    setSelectedVendor(vendor);
    setIsFormOpen(true);
  };

  // Colored Badge Renderer

  return (
    <div className="space-y-5 font-sans">

      {/* ── Premium Hero Header ── */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden px-8 py-6 flex items-center justify-between shadow-xl shadow-slate-900/20">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        {/* Green accent glow */}
        <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-green-500/10 blur-3xl" />
        <div className="absolute -bottom-10 right-20 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded-md bg-green-500 flex items-center justify-center shadow-md shadow-green-600/40">
              <Users size={13} className="text-white" />
            </div>
            <span className="text-green-400 text-xs font-bold uppercase tracking-widest">Vendor Management</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Vendors Directory</h1>
          <p className="text-slate-400 text-xs mt-1 font-medium">Manage and audit your external supply chain partners</p>

          {/* Stats chips */}
          <div className="flex items-center gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              {totalItems} Total Vendors
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 text-slate-300 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
              <Filter size={9} />
              {categoryFilter !== 'all' || statusFilter !== 'all' ? 'Filtered view' : 'All records'}
            </span>
          </div>
        </div>

        {/* Add Vendor CTA */}
        {isAuthorized && (
          <button type="button"
            onClick={() => handleOpenForm(null)}
            className="relative z-10 flex items-center gap-2 px-5 py-3 bg-green-500 hover:bg-green-400 active:bg-green-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-600/30 hover:shadow-green-500/40 hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Vendor</span>
          </button>
        )}
      </div>



      {/* Main Vendor List Directory */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20">
            <div className="h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-xs font-semibold text-slate-400">Loading vendors directory...</p>
          </div>
        ) : vendors.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-20 text-center px-4">
            <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4">
              <FolderOpen size={22} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Vendors Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              We couldn't find any vendor listings matching your query. Adjust filters or register a new one.
            </p>
            {isAuthorized && (
              <button type="button"
                onClick={() => handleOpenForm(null)}
                className="mt-5 px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-lg transition-all"
              >
                Register First Vendor
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Company Name</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6">GST Number</th>
                    <th className="py-4 px-6">Contact Phone</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {vendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name / Contact Person info */}
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900">{vendor.company_name}</div>
                        {vendor.contact_person && (
                          <div className="text-[10px] text-slate-400 mt-0.5">Person: {vendor.contact_person}</div>
                        )}
                      </td>
                      {/* Category */}
                      <td className="py-4 px-6 font-medium text-slate-600">{vendor.category}</td>
                      {/* GST */}
                      <td className="py-4 px-6 font-mono font-medium text-slate-800">{vendor.gst_number}</td>
                      {/* Contact */}
                      <td className="py-4 px-6">
                        <div className="font-medium text-slate-800">{vendor.phone || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{vendor.email}</div>
                      </td>
                      {/* Status */}
                      <td className="py-4 px-6 text-center">{getStatusBadge(vendor.status)}</td>
                      {/* Actions */}
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          {/* View Detail button */}
                          <button type="button"
                            onClick={() => navigate(`/vendors/${vendor.id}`)}
                            title="View Details"
                            className="h-7 w-7 rounded-lg border border-slate-200/80 text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all"
                          >
                            <Eye size={14} />
                          </button>
                          
                          {/* Edit / Delete restricted to auth roles */}
                          {isAuthorized && (
                            <>
                              <button type="button"
                                onClick={() => handleOpenForm(vendor)}
                                title="Edit Vendor"
                                className="h-7 w-7 rounded-lg border border-slate-200/80 text-slate-500 hover:text-green-600 hover:bg-green-50/30 flex items-center justify-center transition-all"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button type="button"
                                onClick={() => handleDeleteClick(vendor.id, vendor.company_name)}
                                title="Deactivate Vendor"
                                disabled={vendor.status === 'inactive'}
                                className="h-7 w-7 rounded-lg border border-slate-200/80 text-slate-400 hover:text-red-600 hover:bg-red-50/30 flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">
                  Showing page <span className="font-bold text-slate-800">{page}</span> of{' '}
                  <span className="font-bold text-slate-800">{totalPages}</span> ({totalItems} records)
                </span>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="h-8 px-2.5 border border-slate-200/80 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-1 text-xs font-semibold transition-all disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>
                  <button type="button"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    className="h-8 px-2.5 border border-slate-200/80 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-1 text-xs font-semibold transition-all disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Creation/Edit Form Modal */}
      <VendorForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          fetchVendors();
          fetchCategories(); // Reload filters list
        }}
        vendor={selectedVendor}
      />
    </div>
  );
};

export default VendorsList;
