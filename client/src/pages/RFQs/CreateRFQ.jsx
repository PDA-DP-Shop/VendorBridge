import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Check,
  Search,
  AlertCircle,
  Briefcase,
  Layers,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CustomSelect from '../../components/UI/CustomSelect';

const CreateRFQ = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1: Basic details state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');

  // Step 2: Line items state
  const [items, setItems] = useState([
    { product_name: '', quantity: 1, unit: 'pcs', specifications: '' },
  ]);

  // Step 3: Assigned vendors state
  const [vendorsList, setVendorsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendors, setSelectedVendors] = useState([]); // Array of vendor ids
  const [loadingVendors, setLoadingVendors] = useState(false);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch all vendors for assignment
  useEffect(() => {
    const fetchVendors = async () => {
      setLoadingVendors(true);
      try {
        const res = await api.get('/vendors', { params: { limit: 100 } });
        if (res.data && res.data.success) {
          setVendorsList(res.data.vendors || []);
        }
      } catch (err) {
        console.error('Failed to load vendors for RFQ mapping:', err);
        toast.error('Failed to retrieve vendors directory list.');
      } finally {
        setLoadingVendors(false);
      }
    };
    fetchVendors();
  }, []);

  // Step 2 Handlers
  const handleAddItemRow = () => {
    setItems([...items, { product_name: '', quantity: 1, unit: 'pcs', specifications: '' }]);
  };

  const handleRemoveItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // Step 3 Handlers
  const handleToggleVendor = (vendorId) => {
    if (selectedVendors.includes(vendorId)) {
      setSelectedVendors(selectedVendors.filter((id) => id !== vendorId));
    } else {
      setSelectedVendors([...selectedVendors, vendorId]);
    }
  };

  const handleSelectAllFilteredVendors = (filteredIds) => {
    const allSelected = filteredIds.every((id) => selectedVendors.includes(id));
    if (allSelected) {
      setSelectedVendors(selectedVendors.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedVendors([...new Set([...selectedVendors, ...filteredIds])]);
    }
  };

  // Validation
  const validateStep1 = () => {
    if (!title || !deadline) {
      setError('Title and deadline are required fields.');
      return false;
    }
    const selectedDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      setError('Deadline cannot be set in the past.');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep2 = () => {
    for (const item of items) {
      if (!item.product_name || !item.quantity || !item.unit) {
        setError('All line items must contain a product name, quantity, and unit.');
        return false;
      }
      if (parseInt(item.quantity, 10) <= 0) {
        setError('Line item quantities must be greater than zero.');
        return false;
      }
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // Submit Handler
  const handleSubmit = async () => {
    setError('');
    if (selectedVendors.length === 0) {
      setError('Please assign at least one vendor to this RFQ sourcing invite.');
      return;
    }

    setSubmitting(true);
    const payload = {
      title,
      description,
      deadline,
      items,
      vendor_ids: selectedVendors,
    };

    try {
      const res = await api.post('/rfqs', payload);
      if (res.data && res.data.success) {
        toast.success(`RFQ "${title}" published and vendors notified!`);
        navigate('/rfqs');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to publish RFQ sourcing event.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter vendors list by inline search
  const filteredVendors = vendorsList.filter(
    (v) =>
      v.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredVendorIds = filteredVendors.map((v) => v.id);

  // Steps indicator configuration
  const stepsConfig = [
    { num: 1, label: 'Basic Details', icon: Briefcase },
    { num: 2, label: 'Add Line Items', icon: Layers },
    { num: 3, label: 'Assign Vendors', icon: Users },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button type="button"
          onClick={() => navigate('/rfqs')}
          className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Create Sourcing Event</h1>
          <p className="text-xs text-slate-500 mt-0.5">Establish line item requests and publish to supplier rooms</p>
        </div>
      </div>

      {/* Steps Horizontal Navigation Indicators */}
      <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex justify-between items-center max-w-3xl mx-auto">
        {stepsConfig.map((item, idx) => {
          const Icon = item.icon;
          return (
            <React.Fragment key={item.num}>
              <div className="flex items-center gap-3">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                    step === item.num
                      ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-600/10'
                      : step > item.num
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-slate-50 text-slate-400 border-slate-200/80'
                  }`}
                >
                  {step > item.num ? <Check size={14} /> : item.num}
                </div>
                <div className="hidden sm:block text-left">
                  <h4 className={`text-xs font-bold ${step === item.num ? 'text-slate-800' : 'text-slate-400'}`}>
                    {item.label}
                  </h4>
                </div>
              </div>
              {idx < stepsConfig.length - 1 && (
                <div className="flex-1 max-w-[60px] h-0.5 bg-slate-100 mx-2"></div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Error alert banner */}
      {error && (
        <div className="max-w-3xl mx-auto bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3.5 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Step panels wrapper */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm max-w-3xl mx-auto overflow-hidden">
        {/* Step 1 panel: Basic Details */}
        {step === 1 && (
          <div className="p-8 space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
                RFQ Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Supply of Industrial Castings and Joints"
                className="w-full bg-white border border-[#e2e8f0] rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
                Deadline Date *
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-white border border-[#e2e8f0] rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
                Detailed Sourcing Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about structural standards, quality, shipping terms..."
                rows={5}
                className="w-full bg-white border border-[#e2e8f0] rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] transition-all"
              />
            </div>
          </div>
        )}

        {/* Step 2 panel: Dynamic Sourcing Items */}
        {step === 2 && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Required Line Items</h3>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 hover:bg-green-100/50 rounded-lg text-[11px] font-bold transition-all"
              >
                <Plus size={14} />
                <span>Add Item Row</span>
              </button>
            </div>

            {/* Dynamic Items mapping */}
            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="bg-slate-50/50 border border-slate-200/60 p-4 rounded-xl space-y-3 relative group"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Item Name */}
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        value={item.product_name}
                        onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                        placeholder="Steel Rebar 12mm"
                        className="w-full bg-white border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1"
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full bg-white border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1"
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Unit *
                      </label>
                      <CustomSelect
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        options={[
                          { value: 'pcs', label: 'pcs' },
                          { value: 'kg', label: 'kg' },
                          { value: 'ton', label: 'ton' },
                          { value: 'metre', label: 'metre' },
                          { value: 'litre', label: 'litre' },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Specifications */}
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Technical Specifications / Remarks
                      </label>
                      <input
                        type="text"
                        value={item.specifications}
                        onChange={(e) => handleItemChange(index, 'specifications', e.target.value)}
                        placeholder="Grade 500, length 12m, certification required..."
                        className="w-full bg-white border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1"
                      />
                    </div>

                    {/* Delete button (hidden if only 1 row) */}
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(index)}
                        className="h-8 w-8 rounded-lg border border-slate-200 hover:border-red-200 text-slate-400 hover:text-red-600 hover:bg-red-50/20 flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 panel: Searchable Checkbox Vendors List */}
        {step === 3 && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Assign Target Vendors</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Select which suppliers will receive this sourcing invite</p>
              </div>

              {/* Inline Search */}
              <div className="relative w-full md:max-w-xs">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter vendors by name, category..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#16a34a] focus:ring-1"
                />
              </div>
            </div>

            {loadingVendors ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading suppliers listing directory...
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No vendors found matching your filter parameters.
              </div>
            ) : (
              <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                {/* Select Header toggle */}
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Vendor Name & Category</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAllFilteredVendors(filteredVendorIds)}
                    className="text-green-600 hover:text-green-700"
                  >
                    Toggle Select All
                  </button>
                </div>

                {/* Checkbox Rows list */}
                <div className="max-h-[260px] overflow-y-auto divide-y divide-slate-100">
                  {filteredVendors.map((vendor) => {
                    const isSelected = selectedVendors.includes(vendor.id);
                    return (
                      <label
                        key={vendor.id}
                        className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors text-xs font-semibold ${
                          isSelected ? 'bg-green-50/30' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleVendor(vendor.id)}
                            className="text-green-600 focus:ring-green-500 rounded border-slate-300"
                          />
                          <div className="text-left">
                            <h4 className="text-slate-800">{vendor.company_name}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">Person: {vendor.contact_person || 'N/A'}</p>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 border border-slate-200/50 text-slate-500 rounded font-medium">
                          {vendor.category}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="text-xs text-right text-slate-500 font-bold">
              Total assigned: <span className="text-[#16a34a]">{selectedVendors.length} vendors</span>
            </div>
          </div>
        )}

        {/* Wizard Controls Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1 || submitting}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all disabled:opacity-40"
          >
            <ChevronLeft size={14} />
            <span>Back</span>
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              <span>Next Step</span>
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] disabled:bg-green-400 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-green-600/10"
            >
              {submitting ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Publish RFQ</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateRFQ;
