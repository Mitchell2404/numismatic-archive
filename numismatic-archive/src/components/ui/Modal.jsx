import React, { useEffect } from 'react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'primary',
  size = 'md',
  hideFooter = false,
  hideCancel = false,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const maxWidth = size === 'lg' ? 720 : size === 'xl' ? 960 : size === 'sm' ? 400 : 520;

  return (
    <div
      className="modal-overlay animate-fadeIn"
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-box relative overflow-hidden"
        style={{ maxWidth, width: '100%' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Corner tabs */}
        <div className="corner-tab corner-tl" />
        <div className="corner-tab corner-tr" />
        <div className="corner-tab corner-bl" />
        <div className="corner-tab corner-br" />

        {/* Header */}
        <div className="modal-header" style={{ backgroundColor: 'rgba(1,30,75,0.04)' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#011e4b', margin: 0, fontStyle: 'italic' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            title="Cerrar (Esc)"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#44474f', display: 'flex', alignItems: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {children}
        </div>

        {/* Footer */}
        {!hideFooter && (
          <div className="modal-footer">
            {!hideCancel && (
              <button className="btn-secondary" onClick={onClose}>{cancelText}</button>
            )}
            {onConfirm ? (
              <button
                className={confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'}
                onClick={onConfirm}
                style={confirmVariant === 'warning' ? { backgroundColor: '#785a00', color: 'white', border: 'none' } : undefined}
              >
                {confirmText}
              </button>
            ) : (
              <button className="btn-primary" onClick={onClose}>Cerrar</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
