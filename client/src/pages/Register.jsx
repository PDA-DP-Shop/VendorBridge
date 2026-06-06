import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CustomSelect from '../components/UI/CustomSelect';

const Register = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('vendor'); // Default to 'vendor'
  const [country, setCountry] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Mock photo upload handler showing local preview
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Required fields only (country is optional)
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !role) {
      setError('Please fill in all required fields: First Name, Last Name, Email, Password and Role.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const payload = {
      name: fullName,
      email: email.trim(),
      password,
      role,
      country: country.trim() || null,
      phone: phone.trim() || null,
    };

    setSubmitting(true);
    const res = await register(payload);
    setSubmitting(false);

    if (res.success) {
      setSuccess('Account created successfully! Redirecting to dashboard...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } else {
      setError(res.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans py-12 px-4 flex justify-center items-center">
      <div className="w-full max-w-2xl bg-white border border-[#e2e8f0] p-8 rounded-2xl shadow-sm">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="VendorBridge Logo" className="h-16 w-16 object-contain mb-3" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create an Account
          </h1>
          <p className="text-slate-500 text-xs mt-1">Register for VendorBridge ERP platform</p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 mb-6">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg p-3 mb-6">
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Circular Mock Photo Upload Section */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative group">
              <div className="h-24 w-24 rounded-full border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden hover:border-[#16a34a] transition-colors">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <svg className="h-8 w-8 text-slate-400 group-hover:text-green-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Choose a profile photo"
              />
            </div>
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Profile Photo Preview
            </span>
          </div>

          {/* Form Fields: Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
                First Name *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                disabled={submitting}
                className="w-full bg-white border border-[#e2e8f0] rounded-lg px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] disabled:bg-slate-50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
                Last Name *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                disabled={submitting}
                className="w-full bg-white border border-[#e2e8f0] rounded-lg px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] disabled:bg-slate-50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@company.com"
                disabled={submitting}
                className="w-full bg-white border border-[#e2e8f0] rounded-lg px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] disabled:bg-slate-50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                disabled={submitting}
                className="w-full bg-white border border-[#e2e8f0] rounded-lg px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] disabled:bg-slate-50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={submitting}
                className="w-full bg-white border border-[#e2e8f0] rounded-lg px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] disabled:bg-slate-50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
                Country *
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="United States"
                disabled={submitting}
                className="w-full bg-white border border-[#e2e8f0] rounded-lg px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] disabled:bg-slate-50 transition-all"
              />
            </div>
          </div>

          {/* Form Fields: Single Column */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
              System Role *
            </label>
            <CustomSelect
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={submitting}
              options={[
                { value: 'vendor', label: 'Vendor (Supplier)' },
                { value: 'procurement_officer', label: 'Procurement Officer' },
                { value: 'manager', label: 'Manager' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
              Additional Information
            </label>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Provide company descriptions, address info, or relevant details..."
              disabled={submitting}
              rows={3}
              className="w-full bg-white border border-[#e2e8f0] rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] disabled:bg-slate-50 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] disabled:bg-green-400 text-white font-semibold py-2.5 rounded-lg transition-all shadow-md shadow-green-600/10 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Register</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-green-600 hover:text-green-700 font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
