import React, { Suspense, lazy, useState, useEffect } from 'react';
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
const ProfilePage   = lazy(() => import('./pages/ProfilePage'));

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

/* Darkroom film develop/overexpose and torn-paper page transition */
const pageVariants = {
  initial: (direction) => ({
    clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
    x: direction === 'backward' ? '-100%' : '0%',
    filter: 'brightness(0) sepia(1)',
    opacity: 0,
  }),
  animate: {
    clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
    x: '0%',
    filter: 'brightness(1) sepia(0.08)',
    opacity: 1,
    transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
  },
  exit: (direction) => ({
    clipPath: direction === 'forward'
      ? [
          'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          'polygon(0% 0%, 50% 0%, 45% 15%, 55% 30%, 40% 50%, 58% 70%, 45% 85%, 50% 100%, 0% 100%)',
          'polygon(0% 0%, 0% 0%, 0% 15%, 0% 30%, 0% 50%, 0% 70%, 0% 85%, 0% 100%, 0% 100%)'
        ]
      : 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
    x: direction === 'forward' ? '-40%' : '100%',
    rotate: direction === 'forward' ? -4 : 0,
    filter: direction === 'forward' ? 'brightness(1) sepia(0.08)' : 'brightness(3)',
    opacity: direction === 'forward' ? 0.9 : 0,
    transition: {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      clipPath: { duration: 0.9, times: [0, 0.45, 1], ease: 'easeInOut' }
    },
  }),
};

const PageWrapper = ({ children, direction }) => (
  <motion.div
    custom={direction}
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    style={{
      width: '100%',
      position: 'relative',
      transformOrigin: 'left bottom',
      zIndex: 1,
    }}
  >
    {children}
  </motion.div>
);

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const isPublicPage = PUBLIC_PATHS.includes(location.pathname);

  // History tracking to detect navigation direction (forward vs backward)
  const [historyStack, setHistoryStack] = useState([location.pathname]);
  const [direction, setDirection] = useState('forward');

  useEffect(() => {
    setHistoryStack((prev) => {
      const index = prev.indexOf(location.pathname);
      if (index !== -1 && index < prev.length - 1) {
        // We went back in history
        setDirection('backward');
        return prev.slice(0, index + 1);
      } else {
        // We went forward
        setDirection('forward');
        if (prev[prev.length - 1] === location.pathname) {
          return prev;
        }
        return [...prev, location.pathname];
      }
    });
  }, [location.pathname]);

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
        <AnimatePresence mode="popLayout">
          <PageWrapper key={location.pathname} direction={direction}>
            <ErrorBoundary resetKey={location.pathname}>
              <Suspense fallback={<RouteFallback />}>
                <Routes location={location}>
                  <Route path="/"       element={<GuestRoute><LandingPage /></GuestRoute>} />
                  <Route path="/login"  element={<GuestRoute><AuthPages /></GuestRoute>} />
                  <Route path="/signup" element={<GuestRoute><AuthPages /></GuestRoute>} />

                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/record"    element={<ProtectedRoute><RecordPage /></ProtectedRoute>} />
                  <Route path="/dreams/:id" element={<ProtectedRoute><DetailPage /></ProtectedRoute>} />
                  <Route path="/timeline"  element={<ProtectedRoute><TimelinePage /></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
                  <Route path="/profile"   element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </PageWrapper>
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
