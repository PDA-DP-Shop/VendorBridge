import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    const res = await login(email, password);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md bg-white border border-[#e2e8f0] p-8 rounded-2xl shadow-sm">
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="VendorBridge Logo" className="h-16 w-16 object-contain mb-3" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            VendorBridge
          </h1>
          <p className="text-slate-500 text-xs mt-1">Sign in to manage your procurement pipeline</p>
        </div>

        {/* Error Notification Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 mb-6 flex items-start gap-2">
            <span className="font-semibold">Error:</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              disabled={isLoading}
              className="w-full bg-white border border-[#e2e8f0] rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] disabled:bg-slate-50 transition-all"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider">
                Password
              </label>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  toast('Contact your system administrator to reset your password.', {
                    icon: '🔐',
                    duration: 4000,
                  });
                }}
                className="text-xs text-green-600 hover:text-green-700 font-medium transition-colors"
              >
                Forgot Password?
              </a>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full bg-white border border-[#e2e8f0] rounded-lg px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a] disabled:bg-slate-50 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] disabled:bg-green-400 text-white font-semibold py-2.5 rounded-lg transition-all shadow-md shadow-green-600/10 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Signing In...</span>
              </>
            ) : (
              <span>Login</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-green-600 hover:text-green-700 font-semibold">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
