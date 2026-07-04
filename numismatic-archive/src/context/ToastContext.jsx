import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

const BORDER_COLORS = {
  success: '#1a6b2e',
  error:   '#ba1a1a',
  warning: '#785a00',
  info:    '#011e4b',
};

function ToastItem({ t, onRemove }) {
  return (
    <div className={`toast toast-${t.type}`} style={{ position: 'relative', borderLeft: `4px solid ${BORDER_COLORS[t.type] || '#011e4b'}`, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 3,
          backgroundColor: BORDER_COLORS[t.type] || '#011e4b',
          opacity: 0.35,
          animation: 'toastProgress 4s linear forwards',
        }}
      />
      <span className="material-symbols-outlined" style={{ fontSize: 18, flexShrink: 0 }}>
        {({ success: 'check_circle', error: 'error', warning: 'warning', info: 'info' })[t.type] || 'info'}
      </span>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 14 }}>{t.message}</span>
        {t.action && (
          <button
            onClick={() => { t.action.fn(); onRemove(t.id); }}
            style={{ display: 'block', marginTop: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', textDecoration: 'underline' }}
          >
            {t.action.label}
          </button>
        )}
      </div>
      <button onClick={() => onRemove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.6, flexShrink: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000, action = null) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, action }].slice(-4));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', action = null) => {
    addToast(message, type, 4000, action);
  }, [addToast]);

  const toast = {
    success: (msg, action) => addToast(msg, 'success', 4000, action),
    error:   (msg, action) => addToast(msg, 'error', 4000, action),
    warning: (msg, action) => addToast(msg, 'warning', 4000, action),
    info:    (msg, action) => addToast(msg, 'info', 4000, action),
    showToast,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <ToastItem key={t.id} t={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
