import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { X, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomSelect from '../../components/UI/CustomSelect';

const VendorForm = ({ isOpen, onClose, onSuccess, vendor = null }) => {
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('Construction');
  const [gstNumber, setGstNumber] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('active');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    'Construction',
    'IT',
    'Office Supplies',
    'Manufacturing',
    'Logistics',
    'Other',
  ];

  // Sync form state if editing a vendor
  const [prevVendor, setPrevVendor] = useState(vendor);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (vendor !== prevVendor || isOpen !== prevIsOpen) {
    setPrevVendor(vendor);
    setPrevIsOpen(isOpen);
    if (vendor) {
      setCompanyName(vendor.company_name || '');
      setCategory(vendor.category || 'Construction');
      setGstNumber(vendor.gst_number || '');
      setContactPerson(vendor.contact_person || '');
      setEmail(vendor.email || '');
      setPhone(vendor.phone || '');
      setAddress(vendor.address || '');
      setStatus(vendor.status || 'active');
    } else {
      // Clear form for create action
      setCompanyName('');
      setCategory('Construction');
      setGstNumber('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setAddress('');
      setStatus('active');
    }
    setError('');
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!companyName || !category || !gstNumber || !email) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    const payload = {
      company_name: companyName,
      category,
      gst_number: gstNumber,
      contact_person: contactPerson,
      email,
      phone,
      address,
      status,
    };

    try {
      if (vendor) {
        // Edit Action
        const res = await api.put(`/vendors/${vendor.id}`, payload);
        if (res.data && res.data.success) {
          toast.success(`Vendor "${companyName}" updated successfully!`);
          onSuccess();
          onClose();
        }
      } else {
        // Create Action
        const res = await api.post('/vendors', payload);
        if (res.data && res.data.success) {
          toast.success(`Vendor "${companyName}" registered successfully!`);
          onSuccess();
          onClose();
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save vendor details.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      {/* Modal Content Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl relative z-10 animate-fade-in font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            {vendor ? 'Edit Vendor Details' : 'Register New Vendor'}
          </h3>
          <button type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg border border-slate-200/80 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Name */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
                Company Name *
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Star Logistics"
                disabled={submitting}
                className="w-full bg-white border border-[#e2e8f0] rounded-lg px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] disabled:bg-slate-50 transition-all"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
                Category *
              </label>
              <CustomSelect
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={submitting}
                options={categories}
              />
            </div>

            {/* GST Number */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
                GST Number *
              </label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="27AADCS1234F1Z5"
                disabled={submitting}
                className="w-full bg-white border border-[#e2e8f0] rounded-lg px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] disabled:bg-slate-50 transition-all"
              />
            </div>

            {/* Contact Person */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
                Contact Person
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Jane Smith"
                disabled={submitting}
                className="w-full bg-white border border-[#e2e8f0] rounded-lg px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] disabled:bg-slate-50 transition-all"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@starlogistics.com"
                disabled={submitting}
                className="w-full bg-white border border-[#e2e8f0] rounded-lg px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] disabled:bg-slate-50 transition-all"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                disabled={submitting}
                className="w-full bg-white border border-[#e2e8f0] rounded-lg px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] disabled:bg-slate-50 transition-all"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
              Office Address
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Suite 404, Business Hub, Sector 62..."
              disabled={submitting}
              rows={3}
              className="w-full bg-white border border-[#e2e8f0] rounded-lg px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] disabled:bg-slate-50 transition-all"
            />
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
              Status *
            </label>
            <div className="flex gap-4">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  checked={status === 'active'}
                  onChange={() => setStatus('active')}
                  disabled={submitting}
                  className="text-green-600 focus:ring-green-600"
                />
                Active
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  checked={status === 'inactive'}
                  onChange={() => setStatus('inactive')}
                  disabled={submitting}
                  className="text-green-600 focus:ring-green-600"
                />
                Inactive
              </label>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-200/80 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[#16a34a] hover:bg-[#15803d] disabled:bg-green-400 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm shadow-green-600/10"
            >
              {submitting ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorForm;
