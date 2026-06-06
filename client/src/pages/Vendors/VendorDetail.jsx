import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Building,
  FileSpreadsheet,
  FileText,
  ShoppingBag,
  Briefcase,
  Layers,
  Award,
} from 'lucide-react';
import toast from 'react-hot-toast';

const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'active':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
          Active
        </span>
      );
    case 'inactive':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
          Inactive
        </span>
      );
    case 'blacklisted':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          Blacklisted
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

const VendorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState(null);
  const [rfqs, setRfqs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rfqs'); // rfqs, quotations, pos

  useEffect(() => {
    const fetchVendorDetails = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/vendors/${id}`);
        if (res.data && res.data.success) {
          setVendor(res.data.vendor);
          setRfqs(res.data.rfqs || []);
          setQuotations(res.data.quotations || []);
          setPurchaseOrders(res.data.purchase_orders || []);
        }
      } catch (err) {
        console.error('Failed to load vendor details:', err);
        toast.error('Failed to retrieve vendor profile logs.');
        navigate('/vendors');
      } finally {
        setLoading(false);
      }
    };

    fetchVendorDetails();
  }, [id, navigate]);

  // Colored Status Badge Renderer

  // Colored RFQ Status Renderer
  const getRfqStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-600 border border-green-150">
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
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-500 border border-red-150">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-600">
            {status}
          </span>
        );
    }
  };

  // Colored Quotation Status Badge
  const getQuotationStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'selected':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
            Selected
          </span>
        );
      case 'under_review':
      case 'submitted':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-250">
            Awaiting Review
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
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-600">
            {status}
          </span>
        );
    }
  };

  // Colored Purchase Order Status Badge
  const getPoStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
            Completed
          </span>
        );
      case 'acknowledged':
      case 'sent':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Active
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200">
            Draft
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20">
        <div className="h-10 w-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-slate-500">Retrieving vendor profiles details...</p>
      </div>
    );
  }

  if (!vendor) return null;

  return (
    <div className="space-y-6 font-sans">
      {/* Back navigation header */}
      <div className="flex items-center gap-3">
        <button type="button"
          onClick={() => navigate('/vendors')}
          className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{vendor.company_name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Supplier Profile Control Panel</p>
        </div>
      </div>

      {/* Info card block at top */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row justify-between gap-6">
          <div className="space-y-4 max-w-xl">
            {/* Header info */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-bold text-slate-900">{vendor.company_name}</span>
              <span className="text-xs font-semibold bg-slate-100/80 text-slate-600 px-2 py-0.5 rounded border border-slate-200/50">
                Category: {vendor.category}
              </span>
              {getStatusBadge(vendor.status)}
            </div>

            {/* Sub fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 text-xs text-slate-600">
              <div className="flex items-center gap-2.5">
                <Building size={16} className="text-slate-400 shrink-0" />
                <span>GST: <span className="font-semibold text-slate-800 font-mono">{vendor.gst_number}</span></span>
              </div>
              <div className="flex items-center gap-2.5">
                <Award size={16} className="text-slate-400 shrink-0" />
                <span>Contact Person: <span className="font-semibold text-slate-800">{vendor.contact_person || 'N/A'}</span></span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail size={16} className="text-slate-400 shrink-0" />
                <a href={`mailto:${vendor.email}`} className="hover:text-green-600 transition-colors">{vendor.email}</a>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone size={16} className="text-slate-400 shrink-0" />
                <a href={`tel:${vendor.phone}`} className="hover:text-green-600 transition-colors">{vendor.phone || 'N/A'}</a>
              </div>
            </div>
          </div>

          {/* Address and metadata */}
          <div className="lg:max-w-xs w-full bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex gap-2.5">
            <MapPin size={18} className="text-slate-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <h4 className="font-bold text-slate-700">Office Location</h4>
              <p className="text-slate-500 mt-1 leading-relaxed">{vendor.address || 'No office address logged.'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs navigation below */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-100">
          <button type="button"
            onClick={() => setActiveTab('rfqs')}
            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'rfqs'
                ? 'border-green-600 text-green-700 bg-slate-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/20'
            }`}
          >
            <Briefcase size={16} />
            <span>RFQs ({rfqs.length})</span>
          </button>
          <button type="button"
            onClick={() => setActiveTab('quotations')}
            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'quotations'
                ? 'border-green-600 text-green-700 bg-slate-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/20'
            }`}
          >
            <FileSpreadsheet size={16} />
            <span>Quotations ({quotations.length})</span>
          </button>
          <button type="button"
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'pos'
                ? 'border-green-600 text-green-700 bg-slate-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/20'
            }`}
          >
            <ShoppingBag size={16} />
            <span>Purchase Orders ({purchaseOrders.length})</span>
          </button>
        </div>

        {/* Tab Content Panel */}
        <div className="flex-1 p-6">
          {/* 1. RFQs Tab */}
          {activeTab === 'rfqs' && (
            <div className="overflow-x-auto">
              {rfqs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No sourcing RFQ events mapped for this vendor.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-3">
                      <th className="py-3 px-4">RFQ #</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Invited On</th>
                      <th className="py-3 px-4">Deadline</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
                    {rfqs.map((rfq) => (
                      <tr key={rfq.id} className="hover:bg-slate-50/55 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">{rfq.rfq_number}</td>
                        <td className="py-3.5 px-4 font-medium">{rfq.title}</td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(rfq.invited_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(rfq.deadline).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">{getRfqStatusBadge(rfq.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* 2. Quotations Tab */}
          {activeTab === 'quotations' && (
            <div className="overflow-x-auto">
              {quotations.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No quotation bids logged from this vendor.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-3">
                      <th className="py-3 px-4">RFQ #</th>
                      <th className="py-3 px-4">RFQ Description</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4 text-center">Delivery Timeline</th>
                      <th className="py-3 px-4">Submitted At</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
                    {quotations.map((qt) => (
                      <tr key={qt.id} className="hover:bg-slate-50/55 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">{qt.rfq_number}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">{qt.rfq_title}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          ₹ {parseFloat(qt.total_amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-600">
                          {qt.delivery_days} days
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(qt.submitted_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">{getQuotationStatusBadge(qt.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* 3. POs Tab */}
          {activeTab === 'pos' && (
            <div className="overflow-x-auto">
              {purchaseOrders.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No purchase order contracts generated for this vendor.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-3">
                      <th className="py-3 px-4">PO #</th>
                      <th className="py-3 px-4 text-right">Subtotal</th>
                      <th className="py-3 px-4 text-right">Grand Total</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
                    {purchaseOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/55 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">{po.po_number}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-500">
                          ₹ {parseFloat(po.total_amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                          ₹ {parseFloat(po.grand_total).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(po.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">{getPoStatusBadge(po.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorDetail;
