import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import { AnimatePresence, motion } from 'framer-motion';

import LandingPage   from './pages/LandingPage';
import AuthPages     from './pages/AuthPages';
import Dashboard     from './pages/Dashboard';
import RecordPage    from './pages/RecordPage';
import DetailPage    from './pages/DetailPage';
import TimelinePage  from './pages/TimelinePage';
import AnalyticsPage from './pages/AnalyticsPage';

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
            <Routes location={location} key={location.pathname}>
              <Route path="/"       element={<PageWrapper><LandingPage /></PageWrapper>} />
              <Route path="/login"  element={<PageWrapper><AuthPages  /></PageWrapper>} />
              <Route path="/signup" element={<PageWrapper><AuthPages  /></PageWrapper>} />

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
