import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CustomSelect from '../../components/UI/CustomSelect';
import api from '../../utils/api';
import {
  ArrowLeft,
  ShoppingBag,
  Printer,
  Calendar,
  Building,
  User,
  Layers,
  FileText,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

const getStatusBadge = (status) => {
  switch (status?.toLowerCase()) {
    case 'draft':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
          Draft
        </span>
      );
    case 'sent':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          Sent
        </span>
      );
    case 'acknowledged':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          Acknowledged
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
          Completed
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

const PODetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [po, setPO] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  const isStaff = user?.role === 'manager' || user?.role === 'admin' || user?.role === 'procurement_officer';

  const fetchPODetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/purchase-orders/${id}`);
      if (res.data && res.data.success) {
        setPO(res.data.purchaseOrder);
        setItems(res.data.items || []);
      }
    } catch (err) {
      console.error('Failed to load PO details:', err);
      toast.error('Failed to retrieve Purchase Order details.');
      navigate('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPODetails();
  }, [id]);

  // Handle PO Status Update
  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    if (!newStatus) return;

    setUpdatingStatus(true);
    try {
      const res = await api.put(`/purchase-orders/${id}/status`, { status: newStatus });
      if (res.data && res.data.success) {
        toast.success(res.data.message || 'Purchase Order status updated.');
        await fetchPODetails();
      }
    } catch (err) {
      console.error('Failed to update PO status:', err);
      toast.error(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Generate Invoice from PO
  const handleGenerateInvoice = async () => {
    if (!window.confirm('Are you sure you want to generate a commercial invoice from this Purchase Order?')) {
      return;
    }

    setGeneratingInvoice(true);
    try {
      const res = await api.post('/invoices', { po_id: po.id });
      if (res.data && res.data.success) {
        toast.success(res.data.message || 'Invoice generated successfully!');
        navigate(`/invoices/${res.data.invoice_id}`);
      }
    } catch (err) {
      console.error('Invoice generation failed:', err);
      toast.error(err.response?.data?.message || 'Failed to generate invoice.');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  // Print Page
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20">
        <div className="h-10 w-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-slate-500">Retrieving Purchase Order details...</p>
      </div>
    );
  }

  if (!po) return null;


  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Top Action Header (hidden during print) */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5 print:hidden">
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={() => navigate('/purchase-orders')}
            className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 font-mono tracking-wide">
                Purchase Order #{po.po_number}
              </span>
              {getStatusBadge(po.status)}
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">
              PO details: {po.rfq_title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isStaff && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
              <span>Status:</span>
              <CustomSelect
                value={po.status}
                onChange={handleStatusChange}
                disabled={updatingStatus}
                className="w-36 inline-block"
                triggerClassName="!border-0 !bg-transparent !py-0 !px-1 !font-bold !text-slate-800 !shadow-none capitalize"
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'sent', label: 'Sent' },
                  { value: 'acknowledged', label: 'Acknowledged' },
                  { value: 'completed', label: 'Completed' },
                ]}
              />
            </div>
          )}

          <button type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            <Printer size={14} />
            <span>Print PO</span>
          </button>

          {po.invoice_id ? (
            <Link
              to={`/invoices/${po.invoice_id}`}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              <span>View Invoice ({po.invoice_number})</span>
            </Link>
          ) : (
            <button type="button"
              onClick={handleGenerateInvoice}
              disabled={generatingInvoice}
              className="flex items-center gap-2 px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-green-600/10 cursor-pointer"
            >
              {generatingInvoice ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating Invoice...</span>
                </>
              ) : (
                <span>Generate Invoice</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Styled Printable Purchase Order Document Box */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-4xl mx-auto space-y-8 print:border-none print:shadow-none print:p-0">
        
        {/* PO Document Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center font-bold text-white shadow-md print:bg-green-600 print:text-white">
                VB
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                VendorBridge Corp.
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Corporate Procurement Operations Division
            </p>
            <p className="text-[10px] text-slate-400 font-medium leading-none">
              New Delhi, India
            </p>
          </div>

          <div className="text-right space-y-1">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">PURCHASE ORDER</h2>
            <div className="font-mono text-xs font-bold text-slate-700">{po.po_number}</div>
            <div className="text-[10px] text-slate-400">
              Date: {new Date(po.created_at).toLocaleDateString()}
            </div>
            <div className="text-[10px] text-slate-400 capitalize">
              Status: <span className="font-bold">{po.status}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bill to Info */}
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Bill To (Buyer)</h3>
            <div className="text-xs font-bold text-slate-800">VendorBridge Corporation</div>
            <div className="text-xs text-slate-500">Procurement Operations Division</div>
            <div className="text-xs text-slate-500">New Delhi, India</div>
            <div className="text-xs text-slate-500">procurement@vendorbridge.com</div>
          </div>

          {/* Ship to / Supplier Info */}
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Supplier (Vendor)</h3>
            <div className="text-xs font-bold text-slate-800">{po.company_name}</div>
            <div className="text-xs text-slate-500">Contact: {po.contact_person || 'N/A'}</div>
            <div className="text-xs text-slate-500">{po.vendor_email}</div>
            <div className="text-xs text-slate-500">{po.vendor_phone || 'N/A'}</div>
            {po.vendor_address && <div className="text-xs text-slate-550 italic mt-0.5">{po.vendor_address}</div>}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border-t border-slate-100 pt-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Line Items Description</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/20 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{item.product_name}</div>
                    {item.specifications && (
                      <span className="text-[10px] text-slate-400 italic block mt-0.5">
                        {item.specifications}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-650">
                    {item.quantity} <span className="text-slate-400 font-medium">{item.unit}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                    ₹{parseFloat(item.unit_price).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-slate-950">
                    ₹{parseFloat(item.total_price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculations Block */}
        <div className="border-t border-slate-100 pt-6 flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-1.5 max-w-sm">
            <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Sourcing Officer Info</h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-650">
              <User size={13} className="text-slate-400" />
              <span>Created By: <span className="font-bold text-slate-800">{po.officer_name || 'System'}</span></span>
            </div>
            {po.remarks && (
              <div className="text-[10px] bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-slate-500 italic mt-2">
                Remarks: "{po.remarks}"
              </div>
            )}
          </div>

          <div className="w-full md:w-80 space-y-2.5 text-xs text-slate-650 self-end">
            <div className="flex justify-between">
              <span className="text-slate-400">Subtotal Amount:</span>
              <span className="font-bold text-slate-800">₹{parseFloat(po.total_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">GST Tax (18%):</span>
              <span className="font-bold text-slate-800">₹{parseFloat(po.tax_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-100 pt-2.5 mt-1">
              <span className="text-slate-900 font-black">Grand Commitment Total:</span>
              <span className="text-sm font-black text-green-700">₹{parseFloat(po.grand_total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Terms footer */}
        <div className="border-t border-dashed border-slate-200 pt-6 text-[10px] text-slate-400 leading-normal text-center">
          This Purchase Order is an official agreement generated via the VendorBridge ERP Platform. All prices are fixed. Payment terms are subject to standard verification.
        </div>
      </div>
    </div>
  );
};

export default PODetail;
