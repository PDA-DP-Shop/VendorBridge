import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import {
  ArrowLeft,
  Calendar,
  Layers,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  AlertCircle,
  Calculator,
} from 'lucide-react';
import toast from 'react-hot-toast';

const SubmitQuotation = () => {
  const { rfqId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit_id'); // If present, we are editing this quote

  const [rfq, setRfq] = useState(null);
  const [rfqItems, setRfqItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Vendor Inputs
  const [deliveryDays, setDeliveryDays] = useState('');
  const [notes, setNotes] = useState('');
  const [prices, setPrices] = useState({}); // Mapping of rfq_item_id -> unit_price

  // Load RFQ and optionally pre-fill quotation details (if in Edit Mode)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 1. Fetch RFQ details
        const rfqRes = await api.get(`/rfqs/${rfqId}`);
        if (rfqRes.data && rfqRes.data.success) {
          setRfq(rfqRes.data.rfq);
          const items = rfqRes.data.items || [];
          setRfqItems(items);

          // Initialize prices mapping
          const initialPrices = {};
          items.forEach(item => {
            initialPrices[item.id] = '';
          });
          setPrices(initialPrices);
        }

        // 2. Fetch existing quotation if editId is provided
        if (editId) {
          const quoteRes = await api.get(`/quotations/${editId}`);
          if (quoteRes.data && quoteRes.data.success) {
            const quote = quoteRes.data.quotation;
            setDeliveryDays(quote.delivery_days.toString());
            setNotes(quote.notes || '');

            // Pre-fill item prices
            const quoteItems = quoteRes.data.items || [];
            const editPrices = {};
            quoteItems.forEach(item => {
              editPrices[item.rfq_item_id] = item.unit_price.toString();
            });
            setPrices(prev => ({ ...prev, ...editPrices }));
          }
        }
      } catch (err) {
        console.error('Failed to load submit quotation page data:', err);
        toast.error('Failed to retrieve RFQ or quotation details.');
        navigate('/rfqs');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [rfqId, editId, navigate]);

  // Handle unit price change for a line item
  const handlePriceChange = (itemId, value) => {
    // Only allow decimal numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setPrices({
        ...prices,
        [itemId]: value,
      });
    }
  };

  // Dynamic calculations
  const calculateItemTotal = (itemId, quantity) => {
    const priceStr = prices[itemId] || '0';
    const price = parseFloat(priceStr) || 0;
    return quantity * price;
  };

  const calculateGrandTotal = () => {
    let grandTotal = 0;
    rfqItems.forEach(item => {
      grandTotal += calculateItemTotal(item.id, item.quantity);
    });
    return grandTotal;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Field checks
    if (!deliveryDays || parseInt(deliveryDays, 10) < 0) {
      toast.error('Please specify a valid delivery timeline in days.');
      return;
    }

    // Verify all item prices are filled and valid
    const itemsPayload = [];
    for (const item of rfqItems) {
      const priceStr = prices[item.id];
      if (!priceStr || parseFloat(priceStr) <= 0) {
        toast.error(`Please provide a valid unit price for item "${item.product_name}".`);
        return;
      }
      itemsPayload.push({
        rfq_item_id: item.id,
        unit_price: parseFloat(priceStr),
      });
    }

    setSubmitting(true);
    const payload = {
      rfq_id: parseInt(rfqId, 10),
      delivery_days: parseInt(deliveryDays, 10),
      notes,
      items: itemsPayload,
    };

    try {
      if (editId) {
        // PUT edit
        const res = await api.put(`/quotations/${editId}`, payload);
        if (res.data && res.data.success) {
          toast.success('Your quotation bid has been successfully updated!');
          navigate('/quotations');
        }
      } else {
        // POST create
        const res = await api.post('/quotations', payload);
        if (res.data && res.data.success) {
          toast.success(`Quotation bid for "${rfq.title}" submitted successfully!`);
          navigate('/quotations');
        }
      }
    } catch (err) {
      console.error('Submission failed:', err);
      const msg = err.response?.data?.message || 'Failed to submit quotation bid.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20">
        <div className="h-10 w-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-slate-500">Retrieving sourcing requirements...</p>
      </div>
    );
  }

  if (!rfq) return null;

  const grandTotal = calculateGrandTotal();

  return (
    <div className="space-y-6 font-sans">
      {/* Top Navigation */}
      <div className="flex items-center gap-3">
        <button type="button"
          onClick={() => navigate(editId ? '/quotations' : `/rfqs/${rfqId}`)}
          className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
            {editId ? 'Modify Quotation Bid' : 'Submit Quotation Bid'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {editId ? 'Adjust and re-submit your commercial offer' : 'Provide unit rates and commercial delivery timeline'}
          </p>
        </div>
      </div>

      {/* Read-Only RFQ Sourcing Summary Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
              Target Sourcing Event ({rfq.rfq_number})
            </span>
            <h2 className="text-base font-extrabold text-slate-900 mt-0.5">{rfq.title}</h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200/50 rounded-lg px-2.5 py-1">
            <Calendar size={14} className="text-slate-400" />
            <span>Deadline: <span className="font-bold text-slate-700">{new Date(rfq.deadline).toLocaleDateString()}</span></span>
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {rfq.description || 'No detailed specifications logged.'}
        </p>
      </div>

      {/* Form Submission */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Line Items Pricing Panel (col-span-2) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-2">
            <Layers size={16} className="text-slate-400" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Bidding Cost Sheet</h3>
          </div>

          <div className="divide-y divide-slate-100">
            {rfqItems.map((item, idx) => {
              const currentTotal = calculateItemTotal(item.id, item.quantity);
              return (
                <div key={item.id} className="p-5 hover:bg-slate-50/20 transition-all space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="text-left">
                      <h4 className="text-sm font-bold text-slate-800">
                        {idx + 1}. {item.product_name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        Target volume: <span className="text-slate-700 font-bold">{item.quantity} {item.unit}</span>
                      </p>
                      {item.specifications && (
                        <p className="text-[10px] text-slate-400 italic mt-1 bg-slate-50 rounded px-2 py-0.5 border border-slate-150 inline-block">
                          Specs: {item.specifications}
                        </p>
                      )}
                    </div>

                    {/* Quantity multiplier */}
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Line Total</span>
                      <span className="text-xs font-extrabold text-slate-800">
                        ₹{currentTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Pricing Input Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Unit Price (₹) *
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs font-bold">
                          ₹
                        </span>
                        <input
                          type="text"
                          value={prices[item.id] || ''}
                          onChange={(e) => handlePriceChange(item.id, e.target.value)}
                          placeholder="0.00"
                          required
                          className="w-full bg-white border border-[#e2e8f0] rounded-lg pl-7 pr-4 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Commercial terms & summary sidebar (col-span-1) */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Commercial Terms
            </h3>

            {/* Delivery Timeline Input */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Delivery Timeline (days) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Clock size={14} />
                </span>
                <input
                  type="number"
                  min="0"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                  placeholder="e.g. 15"
                  required
                  className="w-full bg-white border border-[#e2e8f0] rounded-lg pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-all"
                />
              </div>
              <span className="text-[9px] text-slate-400 mt-1 block">
                Number of days required to deliver the items after PO confirmation.
              </span>
            </div>

            {/* Notes/Comments Textarea */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Proposal Notes & Remarks
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Specify warranties, logistics notes, or pricing conditionalities..."
                rows={4}
                className="w-full bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-all"
              />
            </div>
          </div>

          {/* Grand Total cost calculator card */}
          <div className="bg-gradient-to-br from-green-700 to-green-900 text-white rounded-2xl p-6 shadow-md shadow-green-900/10 space-y-5">
            <div className="flex items-center gap-2">
              <Calculator size={18} className="text-green-300" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-green-200">
                Cost Summary
              </h3>
            </div>

            <div className="border-t border-green-600/40 pt-4">
              <span className="text-[10px] font-bold text-green-300 uppercase tracking-wider block">Grand Total Offer</span>
              <span className="text-2xl font-black tracking-tight">
                ₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Actions button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-white text-green-900 hover:bg-slate-100 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg text-xs font-extrabold transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-green-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving Quotation...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={15} />
                  <span>{editId ? 'Update Quotation' : 'Submit Quotation'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SubmitQuotation;
