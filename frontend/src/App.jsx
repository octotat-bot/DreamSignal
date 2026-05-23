import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import { AnimatePresence, motion } from 'framer-motion';

// Route-level code splitting: each page is its own chunk so the initial
// landing/login bundle stays tiny and heavy pages (Analytics + Recharts,
// DetailPage + image grid, TimelinePage + heatmap) only ship when visited.
const LandingPage   = lazy(() => import('./pages/LandingPage'));
const AuthPages     = lazy(() => import('./pages/AuthPages'));
const Dashboard     = lazy(() => import('./pages/Dashboard'));
const RecordPage    = lazy(() => import('./pages/RecordPage'));
const DetailPage    = lazy(() => import('./pages/DetailPage'));
const TimelinePage  = lazy(() => import('./pages/TimelinePage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));

/* Themed loading placeholder shown while a route chunk is being fetched.
   Matches the noir palette so the transition doesn't strobe white. */
const RouteFallback = () => (
  <div
    role="status"
    aria-live="polite"
    style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      letterSpacing: '0.3em',
      fontFamily: 'var(--font-mono, monospace)',
      fontSize: '0.8rem',
      color: 'var(--silver)',
      textTransform: 'uppercase',
      opacity: 0.7,
    }}
  >
    <span className="sr-only">Loading page…</span>
    <span aria-hidden="true">[ Developing… ]</span>
  </div>
);

const PUBLIC_PATHS = ['/', '/login', '/signup'];

/* Darkroom film develop/overexpose page transition */
const pageVariants = {
  initial: {
    filter: 'brightness(0) sepia(1)',
    opacity: 0,
  },
  animate: {
    filter: 'brightness(1) sepia(0.08)',
    opacity: 1,
    transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    filter: 'brightness(3)',
    opacity: 0,
    transition: { duration: 0.45, ease: 'easeIn' },
  },
};

const PageWrapper = ({ children }) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    style={{ width: '100%' }}
  >
    {children}
  </motion.div>
);

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const isPublicPage = PUBLIC_PATHS.includes(location.pathname);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--paper)',
      color: 'var(--ink)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      {/* Keyboard-only skip-to-main link — visible when focused, hidden otherwise. */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {isAuthenticated && !loading && <Navbar />}

      <main id="main-content" tabIndex={-1} style={{
        flex: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: isAuthenticated && !loading && !isPublicPage ? '56px' : '0',
      }}>
        <AnimatePresence mode="wait">
          <ErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<RouteFallback />}>
              <Routes location={location} key={location.pathname}>
                <Route path="/"       element={<GuestRoute><PageWrapper><LandingPage /></PageWrapper></GuestRoute>} />
                <Route path="/login"  element={<GuestRoute><PageWrapper><AuthPages  /></PageWrapper></GuestRoute>} />
                <Route path="/signup" element={<GuestRoute><PageWrapper><AuthPages  /></PageWrapper></GuestRoute>} />

                <Route path="/dashboard" element={
                  <ProtectedRoute><PageWrapper><Dashboard /></PageWrapper></ProtectedRoute>
                } />
                <Route path="/record" element={
                  <ProtectedRoute><PageWrapper><RecordPage /></PageWrapper></ProtectedRoute>
                } />
                <Route path="/dreams/:id" element={
                  <ProtectedRoute><PageWrapper><DetailPage /></PageWrapper></ProtectedRoute>
                } />
                <Route path="/timeline" element={
                  <ProtectedRoute><PageWrapper><TimelinePage /></PageWrapper></ProtectedRoute>
                } />
                <Route path="/analytics" element={
                  <ProtectedRoute><PageWrapper><AnalyticsPage /></PageWrapper></ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AnimatePresence>
      </main>
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  </BrowserRouter>
);

export default App;
