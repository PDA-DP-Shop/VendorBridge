import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { ArrowLeft, ShoppingBag, FileText, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomSelect from '../../components/UI/CustomSelect';

const GeneratePO = () => {
  const navigate = useNavigate();

  const [approvedQuotations, setApprovedQuotations] = useState(null);
  const loading = approvedQuotations === null;
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [selectedQuoteId, setSelectedQuoteId] = useState('');
  const [quoteDetails, setQuoteDetails] = useState(null);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');

  // Fetch approved quotations and existing POs to filter out already-POed quotations
  useEffect(() => {
    const fetchData = async () => {
      setApprovedQuotations(null);
      try {
        const [quotesRes, posRes] = await Promise.all([
          api.get('/quotations'),
          api.get('/purchase-orders'),
        ]);

        if (quotesRes.data.success && posRes.data.success) {
          const allQuotes = quotesRes.data.quotations || [];
          const allPOs = posRes.data.purchaseOrders || [];

          // Filter for status === 'selected' (which means approved by manager)
          const approved = allQuotes.filter((q) => q.status === 'selected');

          // Exclude quotations that already have POs
          const poedQuoteIds = new Set(allPOs.map((po) => po.quotation_id));
          const available = approved.filter((q) => !poedQuoteIds.has(q.id));

          setApprovedQuotations(available);
        }
      } catch (err) {
        console.error('Failed to fetch initial data for PO creation:', err);
        toast.error('Failed to load approved quotations.');
        setApprovedQuotations([]);
      }
    };

    fetchData();
  }, []);

  // Fetch details when quotation selection changes
  useEffect(() => {
    if (!selectedQuoteId) {
      setQuoteDetails(null);
      setItems([]);
      return;
    }

    const fetchQuoteDetails = async () => {
      try {
        const res = await api.get(`/quotations/${selectedQuoteId}`);
        if (res.data && res.data.success) {
          setQuoteDetails(res.data.quotation);
          setItems(res.data.items || []);
        }
      } catch (err) {
        console.error('Failed to fetch quotation details:', err);
        toast.error('Failed to load details for the selected quotation.');
      }
    };

    fetchQuoteDetails();
  }, [selectedQuoteId]);

  // Calculations
  const subtotal = quoteDetails ? parseFloat(quoteDetails.total_amount) : 0;
  const gst = subtotal * 0.18;
  const grandTotal = subtotal + gst;

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedQuoteId) {
      toast.error('Please select an approved quotation.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/purchase-orders', {
        quotation_id: selectedQuoteId,
        notes: notes.trim() || undefined,
      });

      if (res.data && res.data.success) {
        toast.success(res.data.message || 'Purchase Order generated successfully.');
        navigate('/purchase-orders');
      }
    } catch (err) {
      console.error('PO generation failed:', err);
      const msg = err.response?.data?.message || 'Failed to generate Purchase Order.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Navigation */}
      <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
        <button type="button"
          onClick={() => navigate('/purchase-orders')}
          className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Generate Purchase Order</h1>
          <p className="text-xs text-slate-500 mt-1">Convert approved manager-selected quotation bids into official PO logs</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center py-20">
          <div className="h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-xs font-semibold text-slate-400">Loading approved quotations...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Quote Selection & Items (col-span-2) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Selection Selector */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">
                  Select Approved Sourcing Bid *
                </label>
                <CustomSelect
                  value={selectedQuoteId}
                  onChange={(e) => setSelectedQuoteId(e.target.value)}
                  placeholder="-- Choose an approved vendor quotation --"
                  options={approvedQuotations.map((q) => ({
                    value: q.id,
                    label: `${q.rfq_number} - ${q.rfq_title} (${q.company_name} | ₹${parseFloat(q.total_amount).toLocaleString()})`,
                  }))}
                />
                {approvedQuotations.length === 0 && (
                  <p className="text-[10px] text-slate-450 mt-1.5 flex items-center gap-1">
                    <Info size={11} className="text-slate-400" />
                    <span>No approved vendor quotations awaiting PO generation at this time.</span>
                  </p>
                )}
              </div>
            </div>

            {/* Quotation Line Items Table */}
            {quoteDetails && (
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
                <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                  <FileText size={16} className="text-slate-400" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Line Items Sourced</h3>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-6">Product / Specification</th>
                      <th className="py-3 px-6 text-right">Qty</th>
                      <th className="py-3 px-6 text-right">Unit Price</th>
                      <th className="py-3 px-6 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{item.product_name}</div>
                          {item.specifications && (
                            <span className="text-[10px] text-slate-400 italic block mt-0.5 line-clamp-1">
                              {item.specifications}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right font-semibold text-slate-650">
                          {item.quantity} <span className="text-slate-400 font-medium">{item.unit}</span>
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-slate-800">
                          ₹{parseFloat(item.unit_price).toFixed(2)}
                        </td>
                        <td className="py-4 px-6 text-right font-extrabold text-slate-950">
                          ₹{parseFloat(item.total_price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Column - Supplier Details & Calculations Summary */}
          <div className="space-y-6">
            {/* Vendor/Supplier details */}
            {quoteDetails && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                  Supplier Details
                </h3>
                <div className="text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Company Name:</span>
                    <span className="font-bold text-slate-800">{quoteDetails.company_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Category:</span>
                    <span className="font-semibold text-slate-700">{quoteDetails.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Delivery Lead:</span>
                    <span className="font-semibold text-slate-700">{quoteDetails.delivery_days} Days</span>
                  </div>
                </div>
              </div>
            )}

            {/* Pricing calculations & Notes form */}
            {quoteDetails && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                  Cost Summary
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Subtotal:</span>
                    <span className="font-bold text-slate-800">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">GST (18% by default):</span>
                    <span className="font-bold text-slate-800">₹{gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                    <span className="text-slate-500 font-extrabold">Grand Total:</span>
                    <span className="text-base font-black text-slate-950">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    PO Terms / Delivery Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Specify delivery locations, SLA terms, or corporate billing schedules..."
                    rows={4}
                    className="w-full bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-green-600/10 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={15} />
                      <span>Generate PO</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default GeneratePO;
