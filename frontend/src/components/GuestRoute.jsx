import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Mirror image of ProtectedRoute — sends already-authenticated users
 * AWAY from public-only pages (landing, login, signup) and onto the
 * dashboard. Without this, a logged-in user who types `localhost:5173/`
 * straight into the address bar would land on the marketing page even
 * though the navbar is visible above them.
 *
 * While auth state is still resolving (e.g. a token refresh is in
 * flight) we render `null` so we don't briefly flash the public page
 * before swapping it out — same pattern as ProtectedRoute, just
 * without the elaborate loader since this is the unauthenticated path.
 */
const GuestRoute = ({ children, redirectTo = '/dashboard' }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (isAuthenticated) return <Navigate to={redirectTo} replace />;
  return children;
};

export default GuestRoute;
