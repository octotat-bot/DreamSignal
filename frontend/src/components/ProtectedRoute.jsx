import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DarkroomLoader from './DarkroomLoader';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [skipped, setSkipped] = useState(false);

  if (loading && !skipped) {
    return <DarkroomLoader onSkip={() => setSkipped(true)} />;
  }

  if (!isAuthenticated) {
    // Redirect to login, storing current page location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
