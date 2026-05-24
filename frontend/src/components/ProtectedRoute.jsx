import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import DarkroomLoader from './DarkroomLoader';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  // Only run the cinematic loader once per session
  const [cinematicActive, setCinematicActive] = useState(() => {
    return sessionStorage.getItem('cinematic_played') !== 'true';
  });

  useEffect(() => {
    if (!cinematicActive) return;
    
    // Enforce a minimum 7-second display for the cinematic loader
    const timer = setTimeout(() => {
      setCinematicActive(false);
      sessionStorage.setItem('cinematic_played', 'true');
    }, 7000);
    return () => clearTimeout(timer);
  }, [cinematicActive]);

  const handleSkip = () => {
    setCinematicActive(false);
    sessionStorage.setItem('cinematic_played', 'true');
  };

  if (loading) {
    if (cinematicActive) {
      return createPortal(
        <DarkroomLoader onSkip={handleSkip} />,
        document.body
      );
    }
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

  return (
    <>
      {children}
      {cinematicActive && createPortal(
        <DarkroomLoader onSkip={handleSkip} />,
        document.body
      )}
    </>
  );
};

export default ProtectedRoute;
