import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import CustomSelect from '../../components/UI/CustomSelect';
import {
  ArrowLeft,
  Building,
  Star,
  Clock,
  TrendingUp,
  Award,
  Layers,
  ArrowUpDown,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const QuoteComparison = () => {
  const { rfqId } = useParams();
  const navigate = useNavigate();

  const [rfq, setRfq] = useState(null);
  const [rfqItems, setRfqItems] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('price'); // price, delivery
  const [selectingId, setSelectingId] = useState(null);

  const fetchComparisonData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/quotations/compare/${rfqId}`);
      if (res.data && res.data.success) {
        setRfq(res.data.rfq);
        setRfqItems(res.data.rfqItems || []);
        setQuotations(res.data.quotations || []);
        setMatrix(res.data.comparisonMatrix || []);
      }
    } catch (err) {
      console.error('Failed to load comparison details:', err);
      toast.error('Failed to retrieve quotation comparison matrix.');
      navigate('/rfqs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparisonData();
  }, [rfqId]);

  // Handle Quotation Selection for Approval Review
  const handleSelectVendorQuote = async (quoteId, vendorName, amount) => {
    if (
      !window.confirm(
        `Are you sure you want to select "${vendorName}" (₹${amount.toFixed(2)})? This will trigger the manager approval center workflow.`
      )
    ) {
      return;
    }

    setSelectingId(quoteId);
    try {
      const res = await api.post('/approvals', { quotation_id: quoteId });
      if (res.data && res.data.success) {
        toast.success(res.data.message || 'Quotation submitted for review!');
        await fetchComparisonData(); // Reload details to reflect status updates
      }
    } catch (err) {
      console.error('Failed to select quote:', err);
      const msg = err.response?.data?.message || 'Failed to select vendor quotation.';
      toast.error(msg);
    } finally {
      setSelectingId(null);
    }
  };

  // Sort quotations dynamically based on select filter
  const getSortedQuotations = () => {
    const quotes = [...quotations];
    if (sortBy === 'price') {
      return quotes.sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount));
    } else if (sortBy === 'delivery') {
      return quotes.sort((a, b) => a.delivery_days - b.delivery_days);
    }
    return quotes;
  };

  // Placeholder Stars Rating Generator
  const renderRatingStars = (vendorId) => {
    // Generate a pseudo-stable rating (e.g. 4 or 5 stars) using vendorId modulo
    const ratingCount = 4 + (vendorId % 2); 
    return (
      <div className="flex gap-0.5 text-yellow-500">
        {[...Array(5)].map((_, idx) => (
          <Star
            key={idx}
            size={12}
            fill={idx < ratingCount ? 'currentColor' : 'transparent'}
            className={idx < ratingCount ? 'text-yellow-500' : 'text-slate-200'}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20">
        <div className="h-10 w-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-slate-500">Compiling side-by-side quotations matrix...</p>
      </div>
    );
  }

  if (!rfq || quotations.length === 0) {
    return (
      <div className="space-y-6 font-sans">
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={() => navigate(`/rfqs/${rfqId}`)}
            className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-xl font-extrabold text-slate-900">Quotation Bid Comparison</h1>
        </div>
        <div className="flex flex-col justify-center items-center py-20 text-center bg-white border border-slate-200 rounded-2xl p-8">
          <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4">
            <TrendingUp size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Bids Matrix Unavailable</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            No quotations have been submitted for this sourcing event yet. Check back once suppliers submit pricing.
          </p>
        </div>
      </div>
    );
  }

  const sortedQuotes = getSortedQuotations();

  return (
    <div className="space-y-6 font-sans">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <button type="button"
            onClick={() => navigate(`/rfqs/${rfqId}`)}
            className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 font-mono tracking-wide">{rfq.rfq_number}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                Active Compare
              </span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">
              Quotation Cost Comparison Matrix
            </h1>
          </div>
        </div>

        {/* Sort select filters */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold bg-white border border-slate-200/80 rounded-lg px-3 py-2">
            <ArrowUpDown size={14} className="text-slate-400" />
            <span>Sort Columns:</span>
            <CustomSelect
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-52 inline-block"
              triggerClassName="!border-0 !bg-transparent !py-0 !px-1 !font-bold !text-slate-800 !shadow-none"
              options={[
                { value: 'price', label: 'Lowest Total Price First' },
                { value: 'delivery', label: 'Shortest Delivery Time First' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Main Side-by-Side Table Grid */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left table-fixed min-w-[800px]">
            {/* Table Columns Definition */}
            <colgroup>
              <col className="w-[280px]" /> {/* RFQ Items Column */}
              {sortedQuotes.map((q) => (
                <col key={q.id} className="w-[220px]" />
              ))}
            </colgroup>

            {/* Table Header containing Vendor Cards details */}
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-6 px-6 font-bold text-xs text-slate-500 uppercase tracking-wider">
                  Sourcing Specifications
                </th>
                {sortedQuotes.map((q) => (
                  <th
                    key={q.id}
                    className={`py-6 px-6 relative border-l border-slate-100/60 ${
                      q.is_cheapest_total ? 'bg-green-50/20' : ''
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-1">
                        <div className="font-extrabold text-slate-900 text-xs truncate max-w-[130px]" title={q.company_name}>
                          {q.company_name}
                        </div>
                        {q.is_cheapest_total && (
                          <span className="shrink-0 flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-black uppercase text-green-700 bg-green-100 rounded border border-green-200">
                            <Award size={9} />
                            <span>Best Offer</span>
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="text-[10px] text-slate-400 font-medium space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Building size={11} className="text-slate-400 shrink-0" />
                          <span>{q.category}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={11} className="text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-700">{q.delivery_days} Days Lead</span>
                        </div>
                      </div>

                      {/* Stars Rating */}
                      <div className="pt-0.5">
                        {renderRatingStars(q.vendor_id)}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body containing side-by-side pricing matrices */}
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {matrix.map((row) => (
                <tr key={row.rfq_item_id} className="hover:bg-slate-50/20 transition-colors">
                  {/* Left Column: RFQ Item Info */}
                  <td className="py-4 px-6 text-left">
                    <div className="font-bold text-slate-900">{row.product_name}</div>
                    <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Volume: {row.quantity} {row.unit}
                    </div>
                    {row.specifications && (
                      <div className="text-[9px] text-slate-400 italic truncate max-w-[240px] mt-1" title={row.specifications}>
                        {row.specifications}
                      </div>
                    )}
                  </td>

                  {/* Vendor Columns: Item Bids */}
                  {sortedQuotes.map((q) => {
                    const bid = row.bids[q.vendor_id];
                    if (!bid) {
                      return (
                        <td key={q.id} className="py-4 px-6 text-center text-slate-350 border-l border-slate-100/60 font-medium italic">
                          No Bid
                        </td>
                      );
                    }

                    return (
                      <td
                        key={q.id}
                        className={`py-4 px-6 border-l border-slate-100/60 ${
                          bid.is_lowest ? 'bg-green-50/50 text-green-700' : ''
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className={`font-extrabold ${bid.is_lowest ? 'text-green-800' : 'text-slate-900'}`}>
                            ₹{bid.unit_price.toFixed(2)} <span className="text-[9px] text-slate-400 font-normal">/ unit</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            Total: ₹{bid.total_price.toFixed(2)}
                          </div>
                          {bid.is_lowest && (
                            <span className="inline-block mt-1 text-[9px] font-black uppercase text-green-700 bg-green-100/60 px-1 py-0.2 rounded border border-green-200/50 leading-none">
                              Cheapest
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Bottom Row: Grand Total summary */}
              <tr className="bg-slate-50/50 font-bold border-t border-slate-150">
                <td className="py-5 px-6 font-bold text-slate-900 text-xs">
                  Grand Total Cost Offer
                </td>
                {sortedQuotes.map((q) => (
                  <td
                    key={q.id}
                    className={`py-5 px-6 border-l border-slate-100/60 ${
                      q.is_cheapest_total ? 'bg-green-50/60 text-green-700' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <div className={`text-sm font-black ${q.is_cheapest_total ? 'text-green-800' : 'text-slate-950'}`}>
                        ₹{parseFloat(q.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[9px] text-slate-400 uppercase tracking-wide leading-none font-bold">
                        {q.is_cheapest_total ? 'Lowest total offer' : 'Proposal quote'}
                      </div>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Action Row: Selection and Approval trigger */}
              <tr className="bg-slate-50 font-bold border-t border-slate-150">
                <td className="py-4 px-6 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  Selection Action
                </td>
                {sortedQuotes.map((q) => {
                  const isSelected = q.status === 'under_review' || q.status === 'selected';
                  return (
                    <td key={q.id} className="py-4 px-6 border-l border-slate-100/60 text-center">
                      {isSelected ? (
                        <div className="flex items-center justify-center gap-1.5 text-xs text-green-700 font-extrabold bg-green-50 border border-green-200 rounded-lg py-2">
                          <CheckCircle size={14} />
                          <span>{q.status === 'selected' ? 'Selected' : 'Sent to Manager'}</span>
                        </div>
                      ) : (
                        <button type="button"
                          onClick={() => handleSelectVendorQuote(q.id, q.company_name, parseFloat(q.total_amount))}
                          disabled={selectingId !== null}
                          className="w-full py-2 bg-[#16a34a] hover:bg-[#15803d] disabled:bg-green-400 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                        >
                          {selectingId === q.id ? (
                            <>
                              <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Selecting...</span>
                            </>
                          ) : (
                            <span>Select Vendor</span>
                          )}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QuoteComparison;
