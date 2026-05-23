import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

let nextId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++nextId;
    setToasts(ts => [...ts, { id, message, type }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000);
  }, []);

  const dismiss = useCallback(id => setToasts(ts => ts.filter(t => t.id !== id)), []);

  const value = {
    success: msg => addToast(msg, 'success'),
    error:   msg => addToast(msg, 'error'),
    info:    msg => addToast(msg, 'info'),
  };

  const typeStyles = {
    success: { borderColor: 'var(--fixer)',     label: 'CONFIRMED',  labelColor: 'var(--fixer)'     },
    error:   { borderColor: 'var(--stamp-red)', label: 'ERROR',      labelColor: 'var(--stamp-red)' },
    info:    { borderColor: 'var(--stamp-blue)',label: 'NOTICE',     labelColor: 'var(--stamp-blue)' },
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '360px',
      }}>
        <AnimatePresence>
          {toasts.map(({ id, message, type }) => {
            const s = typeStyles[type] || typeStyles.info;
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, x: 40, filter: 'brightness(0)' }}
                animate={{ opacity: 1, x: 0, filter: 'brightness(1) sepia(0.1)' }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.5 }}
                style={{
                  backgroundColor: 'var(--paper-dark)',
                  border: `1px solid ${s.borderColor}`,
                  borderLeft: `4px solid ${s.borderColor}`,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  position: 'relative',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: '"Share Tech Mono", monospace',
                    fontSize: '0.55rem',
                    letterSpacing: '0.2em',
                    color: s.labelColor,
                    marginBottom: '4px',
                  }}>
                    {s.label}
                  </div>
                  <p style={{
                    fontFamily: '"Courier Prime", monospace',
                    fontSize: '13px',
                    color: 'var(--ink)',
                    margin: 0,
                    lineHeight: 1.6,
                  }}>
                    {message}
                  </p>
                </div>
                <button
                  onClick={() => dismiss(id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--silver)',
                    padding: '2px',
                    flexShrink: 0,
                  }}
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
