import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-depth flex flex-col justify-center items-center">
        {/* Cinematic pulse loader */}
        <div className="relative flex items-center justify-center">
          <div className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-accent-indigo opacity-75"></div>
          <div className="relative rounded-full h-8 w-8 bg-accent-indigo shadow-glow"></div>
        </div>
        <span className="mt-6 font-mono text-dreamText-secondary tracking-widest text-xs uppercase animate-pulse">
          Synchronizing Dream Waveform...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login, storing current page location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
