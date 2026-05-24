import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    // Minimal fallback preloader for subsequent refreshes or if loading takes longer than 7s
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', letterSpacing: '0.3em',
        fontFamily: '"Share Tech Mono", monospace', fontSize: '0.8rem',
        color: 'var(--silver)', textTransform: 'uppercase', opacity: 0.7
      }}>
        [ VERIFYING CREDENTIALS... ]
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
