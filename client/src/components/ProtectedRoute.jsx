import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route protection wrapper component.
 * Verifies authentication state and redirects to login if unauthenticated.
 */
const ProtectedRoute = ({ children }) => {
  const { token, isLoading } = useAuth();

  // While checking the authentication token status, display a clean loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center">
        <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-slate-400">Authenticating session...</p>
      </div>
    );
  }

  // If no auth token is found, redirect to the login page
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
