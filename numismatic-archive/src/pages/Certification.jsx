import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants.js';
import AppLayout from '../components/layout/AppLayout.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { fetchCoins, createCertificationAPI, fetchCertifications, updateCertificationAPI } from '../services/coinsService.js';
import CoinImage from '../components/ui/CoinImage.jsx';
import { useWindowSize, isMobile } from '../hooks/useWindowSize.js';

// ── Design tokens ──────────────────────────────────────────────
const F = {
  display: "'Playfair Display', serif",
  body: "'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
};
const C = {
  navy: '#011e4b',
  gold: '#785a00',
  goldLight: '#ffdf9c',
  goldDim: '#ecc15d',
  cream: '#f4ece1',
  inkDark: '#241a07',
  inkLight: '#44474f',
  outline: '#757780',
  outlineVar: '#c4c6d0',
};

// ── Certification tiers ────────────────────────────────────────
const TIERS = [
  { id: 'basic',    icon: 'token',         label: 'Básica',    desc: 'Verificación estándar y encapsulado.',                        price: 45  },
  { id: 'premium',  icon: 'military_tech', label: 'Premium',   desc: 'Imágenes de alta resolución e investigación de pedigrí.',     price: 120, recommended: true },
  { id: 'standard', icon: 'diamond',       label: 'Estándar',  desc: 'Análisis metálico y procedencia completa.',                   price: 85  },
];

// ── Date helpers ───────────────────────────────────────────────
function formatDate(d) {
  const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${String(d.getDate()).padStart(2,'0')} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

// ── Colores de estado para el badge del historial ───────────────
function getStatusStyle(status) {
  const s = status?.toLowerCase() || '';
  if (s === 'aprobado') {
    return { border: 'rgba(26,107,46,0.4)', color: '#1a6b2e', background: 'rgba(240,255,244,0.9)' };
  }
  if (s === 'cancelado' || s === 'rechazado') {
    return { border: 'rgba(186,26,26,0.4)', color: '#ba1a1a', background: 'rgba(255,240,240,0.9)' };
  }
  if (s === 'en proceso' || s === 'pendiente') {
    return { border: 'rgba(180,120,0,0.45)', color: '#9a6700', background: 'rgba(255,247,224,0.95)' };
  }
  // fallback neutro
  return { border: 'rgba(0,0,0,0.15)', color: C.inkLight, background: 'rgba(255,255,255,0.6)' };
}

const today   = new Date();
const inEight = new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000);

// ── Corner tabs helper ─────────────────────────────────────────
function Corners() {
  return (
    <>
      <div className="corner-tab corner-tl" />
      <div className="corner-tab corner-tr" />
      <div className="corner-tab corner-bl" />
      <div className="corner-tab corner-br" />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
export default function Certification() {
  const toast = useToast();
  const { width } = useWindowSize();
  const mobile = isMobile(width);

  // State
  const [coins, setCoins]                 = useState([]);
  const [coinsLoading, setCoinsLoading]   = useState(true);
  const [selectedCoin, setSelectedCoin]   = useState(null);
  const [selectedTier, setSelectedTier]   = useState('premium');
  const [urgent, setUrgent]               = useState(true);
  const [coinModalOpen, setCoinModalOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [tempCoin, setTempCoin]           = useState(null);
  const [search, setSearch]               = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const [trackingId, setTrackingId]       = useState(null);
  const [certHistory, setCertHistory]     = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [notifOpen, setNotifOpen] = useState(false);
  const [approveModal, setApproveModal] = useState(null);
  const [approving, setApproving] = useState(false);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Notificaciones: certificaciones con retorno próximo (<=2 días) y últimos cambios de estado
  const notifications = certHistory
    .map(cert => {
      const returnDate = cert.returnDate ? new Date(cert.returnDate) : null;
      const daysLeft = returnDate ? Math.ceil((returnDate - today) / (1000 * 60 * 60 * 24)) : null;
      const dueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 2;

      return {
        id: cert.id,
        coinName: cert.coinName,
        status: cert.status,
        dueSoon,
        daysLeft,
        message: dueSoon
          ? `Retorno estimado en ${daysLeft === 0 ? 'hoy' : daysLeft + ' día(s)'}`
          : `Estado actual: ${cert.status}`,
      };
    })
    .filter(n => n.dueSoon || ['aprobado', 'completado', 'rechazado', 'listo para retiro'].includes(n.status?.toLowerCase()))
    .slice(0, 6);

  useEffect(() => {
    fetchCertifications()
      .then(setCertHistory)
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    fetchCoins()
      .then(data => {
        setCoins(data);
        // Selecciona la primera moneda activa (no vendida) como default
        const firstActive = data.find(c => c.status !== 'sold') || data[0];
        if (firstActive) {
          setSelectedCoin(firstActive);
          setTempCoin(firstActive.id);
        }
      })
      .catch(() => toast.error('Error al cargar el inventario.'))
      .finally(() => setCoinsLoading(false));
  }, []);

  // Pricing
  const tierPrice       = TIERS.find(t => t.id === selectedTier)?.price ?? 120;
  const urgentSurcharge = urgent ? 35 : 0;
  const insurance       = 12.50;
  const total           = tierPrice + urgentSurcharge + insurance;

  // Handlers
  const handleCoinSelect = () => {
    const found = coins.find(c => c.id === tempCoin);
    if (found) setSelectedCoin(found);
    setCoinModalOpen(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const cert = await createCertificationAPI({
        coinId: selectedCoin.id,
        coinName: selectedCoin.name,
        tier: tierObj.label,
        tierPrice,
        urgent,
        urgentSurcharge,
        insurance,
        total,
        deliveryDate: today.toISOString().slice(0, 10),
        returnDate: inEight.toISOString().slice(0, 10),
      });
      setTrackingId(cert.id);
      setCertHistory(prev => [cert, ...prev]);
      setSubmitModalOpen(false);
      toast.success(`Solicitud enviada. Número de seguimiento: #${cert.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ← NUEVO: aprobar certificación
  const handleApprove = async () => {
    if (!approveModal) return;
    setApproving(true);
    try {
      const updated = await updateCertificationAPI(approveModal.id, { status: 'Aprobado' });
      setCertHistory(prev => prev.map(c => c.id === updated.id ? updated : c));
      setApproveModal(null);
      toast.success(`Certificación #${updated.id} aprobada. La pieza fue marcada como certificada.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelModal) return;
    setCancelling(true);
    try {
      const updated = await updateCertificationAPI(cancelModal.id, { status: 'Cancelado' });
      setCertHistory(prev => prev.map(c => c.id === updated.id ? updated : c));
      setCancelModal(null);
      toast.success(`Certificación #${updated.id} cancelada.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const tierObj = TIERS.find(t => t.id === selectedTier);

  // Filtrado de historial por buscador
  const filteredHistory = certHistory.filter(cert => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      cert.coinName?.toLowerCase().includes(q) ||
      String(cert.id).toLowerCase().includes(q) ||
      cert.tier?.toLowerCase().includes(q) ||
      cert.status?.toLowerCase().includes(q)
    );
  });

  const PENDING_STATUSES = ['en proceso', 'pendiente'];

  const hasPendingCertification = certHistory.some(
    cert => cert.coinId === selectedCoin?.id && PENDING_STATUSES.includes(cert.status?.toLowerCase())
  );

  if (coinsLoading || !selectedCoin) {
    return (
      <AppLayout>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', fontFamily: F.mono, fontSize: 12, color: C.outline,
        }}>
          Cargando inventario...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* ══════════════ HEADER ══════════════ */}
      <header style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: mobile ? '0 16px 0 64px' : '0 24px',
        backgroundColor: 'rgba(255,242,223,0.55)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(196,198,208,0.4)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}>
        {/* Title */}
        <div style={{
          fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
          fontSize: 30,
          fontStyle: 'italic',
          fontWeight: 700,
          color: C.navy,
        }}>
          Certificación
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Search */}
          <div style={{ position: 'relative', width: 256 }}>
            <span className="material-symbols-outlined" style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: C.outline, fontSize: 20,
            }}>search</span>
            <input
              type="text"
              placeholder="Buscar en los archivos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 40, paddingRight: 16, paddingTop: 6, paddingBottom: 6,
                backgroundColor: 'rgba(255,255,255,0.5)',
                border: 'none',
                borderBottom: '2px solid rgba(196,198,208,0.8)',
                fontFamily: F.body, fontSize: 14,
                color: C.inkDark,
                outline: 'none',
                fontStyle: 'italic',
              }}
            />
          </div>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setNotifOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.inkLight, display: 'flex', alignItems: 'center', position: 'relative' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>notifications</span>
              {notifications.length > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: C.gold, color: 'white', borderRadius: '50%',
                  width: 16, height: 16, fontSize: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontFamily: F.mono,
                }}>
                  {notifications.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <div style={{
                position: 'absolute', top: 36, right: 0,
                width: 280,
                background: C.cream,
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                zIndex: 50,
                maxHeight: 320,
                overflowY: 'auto',
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px dotted rgba(196,198,208,0.8)',
                  fontFamily: F.mono, fontSize: 10, color: C.navy,
                  textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700,
                }}>
                  Notificaciones
                </div>

                {notifications.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', fontFamily: F.mono, fontSize: 10, color: C.outline }}>
                    Sin notificaciones nuevas
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{
                      padding: '10px 16px',
                      borderBottom: '1px dotted rgba(196,198,208,0.4)',
                      display: 'flex', flexDirection: 'column', gap: 2,
                    }}>
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: 'italic', color: C.navy }}>
                        {n.coinName}
                      </span>
                      <span style={{ fontFamily: F.body, fontSize: 11, color: n.dueSoon ? C.gold : C.inkLight }}>
                        {n.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Avatar */}
          <div style={{
            width: 34, height: 34,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #785a00 0%, #011e4b 100%)',
            border: '2px solid rgba(255,223,156,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 12, fontWeight: 700, fontStyle: 'italic',
              color: '#ffdf9c', userSelect: 'none',
            }}>DA</span>
          </div>
        </div>
      </header>

      {/* ══════════════ MAIN ══════════════ */}
      <div data-tutorial="cert-main" style={{
        backgroundImage: 'radial-gradient(circle, #C8A96E 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        backgroundColor: '#fff8f2',
        minHeight: 'calc(100vh - 64px)',
      }}>
        <div style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: mobile ? 16 : 48,
        }}>
          {/* Grid: 8fr | 4fr — single column on mobile */}
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '8fr 4fr', gap: mobile ? 24 : 40 }}>

            {/* ══ LEFT COLUMN ══ */}
            <div>

              {/* ── Section 1: Coin Identity Panel ── */}
              <section style={{
                background: C.cream,
                padding: 32,
                border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                position: 'relative',
                marginBottom: 40,
              }}>
                <Corners />

                <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
                  {/* Coin image circle */}
                  <div className="coin-showcase-frame" style={{
                    width: 192, height: 192, flexShrink: 0,
                    background: '#e8dfd1',
                    borderRadius: '50%',
                    border: '1px solid rgba(0,0,0,0.05)',
                    boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.15)',
                    outline: '8px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    <CoinImage
                      src={selectedCoin.imageUrl ? `${BACKEND_URL}${selectedCoin.imageUrl}` : null}
                      alt={selectedCoin.name}
                      style={{
                        width: '110%', height: '110%',
                        objectFit: 'contain',
                        filter: 'grayscale(20%)',
                      }}
                    />
                  </div>

                  {/* Text content */}
                  <div style={{ flex: 1 }}>
                    {/* Title + stamp */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <h2 style={{
                        fontFamily: F.display, fontSize: 30, fontStyle: 'italic',
                        color: C.navy, margin: 0, fontWeight: 600,
                      }}>
                        {selectedCoin.name}
                      </h2>
                      <span className="ink-stamp" style={{ fontSize: 9 }}>Archived</span>
                    </div>

                    {/* Description */}
                    <p style={{
                      fontFamily: F.body, fontSize: 16,
                      color: C.inkLight, fontStyle: 'italic',
                      borderLeft: '2px solid rgba(196,198,208,0.3)',
                      paddingLeft: 16,
                      marginBottom: 24,
                      lineHeight: 1.6,
                    }}>
                      {selectedCoin.description ||
                        'Pieza numismática de alto valor histórico. Identificada para proceso de certificación archival.'}
                    </p>

                    {/* Cambiar Moneda button */}
                    <button
                      onClick={() => { setTempCoin(selectedCoin.id); setCoinModalOpen(true); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 24px',
                        border: `1px solid ${C.navy}`,
                        backgroundColor: 'transparent',
                        color: C.navy,
                        fontFamily: F.mono, fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        cursor: 'pointer',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_note</span>
                      Cambiar Moneda
                    </button>
                  </div>
                </div>
              </section>

              {/* ── Section 2: Certification Tiers ── */}
              <section>
                {/* Header row */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                  marginBottom: 32,
                  borderBottom: '1px dotted rgba(196,198,208,0.8)',
                  paddingBottom: 8,
                }}>
                  <div>
                    <h3 style={{
                      fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
                      fontSize: 26, fontStyle: 'italic',
                      color: C.navy, margin: 0, fontWeight: 700,
                    }}>
                      Nivel de Certificación
                    </h3>
                    <p style={{
                      fontFamily: F.mono, fontSize: 10,
                      color: C.outline,
                      textTransform: 'uppercase',
                      letterSpacing: '0.2em',
                      marginTop: 4, marginBottom: 0,
                    }}>
                      Seleccionar Profundidad de Archivo
                    </p>
                  </div>

                  {/* Normal / Urgente toggle */}
                  <div style={{
                    display: 'flex',
                    backgroundColor: '#e8dfd1',
                    padding: 4,
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: 2,
                  }}>
                    <button
                      onClick={() => setUrgent(false)}
                      style={{
                        padding: '4px 20px',
                        backgroundColor: urgent ? 'transparent' : C.navy,
                        color: urgent ? C.inkLight : C.goldLight,
                        fontFamily: F.mono, fontSize: 10,
                        fontWeight: urgent ? 400 : 700,
                        textTransform: 'uppercase',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: urgent ? 'none' : '0 2px 8px rgba(0,0,0,0.2)',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Normal
                    </button>
                    <button
                      onClick={() => setUrgent(true)}
                      style={{
                        padding: '4px 20px',
                        backgroundColor: urgent ? C.navy : 'transparent',
                        color: urgent ? C.goldLight : C.inkLight,
                        fontFamily: F.mono, fontSize: 10,
                        fontWeight: urgent ? 700 : 400,
                        textTransform: 'uppercase',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: urgent ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Urgente
                    </button>
                  </div>
                </div>

                {/* 3-column tier cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                  {TIERS.map(tier => {
                    const active = selectedTier === tier.id;
                    return (
                      <div
                        key={tier.id}
                        className="tier-card"
                        onClick={() => setSelectedTier(tier.id)}
                        style={{
                          background: C.cream,
                          padding: 24,
                          border: active ? `2px solid ${C.navy}` : '1px solid rgba(0,0,0,0.05)',
                          boxShadow: active
                            ? '0 8px 32px rgba(0,0,0,0.12)'
                            : '0 4px 12px rgba(0,0,0,0.08)',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', textAlign: 'center',
                          cursor: 'pointer',
                          position: 'relative',
                        }}
                      >
                        {/* Recommended badge */}
                        {tier.recommended && active && (
                          <div style={{
                            position: 'absolute', top: -12, left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: C.navy, color: C.goldLight,
                            padding: '2px 12px',
                            fontSize: 9, fontFamily: F.mono,
                            fontWeight: 700, letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                          }}>
                            Recomendado
                          </div>
                        )}

                        {/* Icon */}
                        <span className="material-symbols-outlined tier-icon" style={{
                          fontSize: 28,
                          color: active ? C.navy : C.outline,
                          marginBottom: 16,
                        }}>
                          {tier.icon}
                        </span>

                        {/* Name */}
                        <h4 style={{
                          fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
                          fontSize: 20, fontStyle: 'italic',
                          color: C.navy, margin: 0, marginBottom: 8, fontWeight: 700,
                        }}>
                          {tier.label}
                        </h4>

                        {/* Description */}
                        <p style={{
                          fontFamily: F.body, fontSize: 12,
                          color: C.inkLight, marginBottom: 24, lineHeight: 1.5,
                        }}>
                          {tier.desc}
                        </p>

                        {/* Footer */}
                        <div style={{
                          marginTop: 'auto',
                          paddingTop: 16,
                          borderTop: '1px dotted rgba(196,198,208,0.8)',
                          width: '100%',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          paddingLeft: 8, paddingRight: 8,
                        }}>
                          <span className="tier-price" style={{
                            fontFamily: "'Playfair Display', serif", fontSize: 22, fontStyle: 'normal',
                            color: C.gold,
                            fontWeight: active ? 700 : 600,
                          }}>
                            ${tier.price}
                          </span>
                          <span className="material-symbols-outlined" style={{
                            fontSize: 20,
                            color: active ? C.navy : C.outlineVar,
                          }}>
                            {active ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Nota de archivo - ancla visual al final de la columna izquierda */}
                <div style={{
                  marginTop: 32, padding: '16px 20px',
                  backgroundColor: 'rgba(120,90,0,0.04)',
                  borderLeft: `3px solid ${C.gold}`,
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: C.gold, flexShrink: 0, marginTop: 1 }}>
                    history_edu
                  </span>
                  <p style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 12,
                    color: C.inkLight, lineHeight: 1.6, margin: 0, fontStyle: 'italic',
                  }}>
                    El proceso de certificación incluye verificación de autenticidad, documentación fotográfica
                    profesional y emisión de certificado con código QR de validación institucional.
                  </p>
                </div>
              </section>

              {/* ── Section 3: Historial de Certificaciones ── */}
              <section style={{ marginTop: 40 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  marginBottom: 20,
                  borderBottom: '1px dotted rgba(196,198,208,0.8)',
                  paddingBottom: 8,
                }}>
                  <span className="material-symbols-outlined" style={{ color: C.gold, fontSize: 20 }}>history</span>
                  <h3 style={{
                    fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
                    fontSize: 24, fontStyle: 'italic',
                    color: C.navy, margin: 0, fontWeight: 700,
                  }}>
                    Historial de Solicitudes
                  </h3>
                  {filteredHistory.length > 0 && (
                    <span style={{
                      background: C.gold, color: 'white', borderRadius: '50%',
                      width: 20, height: 20, fontSize: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontFamily: F.mono,
                    }}>{filteredHistory.length}</span>
                  )}
                </div>

                {historyLoading ? (
                  <p style={{ fontFamily: F.mono, fontSize: 11, color: C.outline, textAlign: 'center', padding: '24px 0' }}>
                    Cargando historial...
                  </p>
                ) : certHistory.length === 0 ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '32px 0', gap: 10, opacity: 0.5,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36, color: C.outline }}>inventory_2</span>
                    <p style={{ fontFamily: F.mono, fontSize: 10, color: C.outline, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                      Sin solicitudes registradas
                    </p>
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '32px 0', gap: 10, opacity: 0.5,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36, color: C.outline }}>search_off</span>
                    <p style={{ fontFamily: F.mono, fontSize: 10, color: C.outline, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                      Sin coincidencias para "{search}"
                    </p>
                  </div>
                ) : (
                  <div style={{
                    background: C.cream,
                    border: '1px solid rgba(0,0,0,0.05)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid rgba(1,30,75,0.1)' }}>
                          {['Fecha', 'Pieza', 'Nivel', 'Monto', 'Estado', 'Acción'].map((h, i) => (
                            <th key={h} style={{
                              padding: '12px 16px', textAlign: i === 3 ? 'right' : 'left',
                              fontFamily: F.mono, fontSize: 9, color: C.navy,
                              textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700,
                              background: 'rgba(1,30,75,0.02)',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                        <tbody>
                          {filteredHistory.map((cert, i) => (
                            <tr key={cert.id} className="history-row" style={{
                            background: i % 2 === 0 ? 'transparent' : 'rgba(120,90,0,0.02)',
                            borderBottom: '1px dotted rgba(196,198,208,0.4)',
                          }}>
                            <td style={{ padding: '12px 16px', fontFamily: F.mono, fontSize: 10, color: C.outline, whiteSpace: 'nowrap' }}>
                              {new Date(cert.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, fontStyle: 'italic', color: C.navy, margin: 0 }}>
                                {cert.coinName}
                              </p>
                              <p style={{ fontFamily: F.mono, fontSize: 9, color: C.outline, margin: '1px 0 0', textTransform: 'uppercase' }}>
                                #{cert.id}
                              </p>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                border: `1px solid rgba(120,90,0,0.4)`, color: C.gold,
                                padding: '2px 8px', fontSize: 9, fontFamily: F.mono,
                                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                                borderRadius: 2,
                              }}>
                                {cert.tier}{cert.urgent ? ' · Urgente' : ''}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: C.gold, whiteSpace: 'nowrap' }}>
                              ${Number(cert.total).toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                border: `1px solid ${getStatusStyle(cert.status).border}`,
                                color: getStatusStyle(cert.status).color,
                                background: getStatusStyle(cert.status).background,
                                padding: '2px 8px', fontSize: 9, fontFamily: F.mono,
                                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                                borderRadius: 2,
                              }}>
                                {cert.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {!['aprobado', 'cancelado', 'rechazado'].includes(cert.status?.toLowerCase()) ? (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    onClick={() => setApproveModal(cert)}
                                    title="Aprobar"
                                    aria-label="Aprobar certificación"
                                    style={{
                                      width: 30, height: 30,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      border: `1px solid ${C.navy}`,
                                      background: 'transparent',
                                      color: C.navy,
                                      cursor: 'pointer', borderRadius: 2,
                                      transition: 'background 0.15s',
                                    }}
                                    onMouseOver={e => e.currentTarget.style.background = 'rgba(1,30,75,0.08)'}
                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: 17 }}>verified</span>
                                  </button>
                                  <button
                                    onClick={() => setCancelModal(cert)}
                                    title="Cancelar"
                                    aria-label="Cancelar solicitud"
                                    style={{
                                      width: 30, height: 30,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      border: '1px solid rgba(186,26,26,0.5)',
                                      background: 'transparent',
                                      color: '#ba1a1a',
                                      cursor: 'pointer', borderRadius: 2,
                                      transition: 'background 0.15s',
                                    }}
                                    onMouseOver={e => e.currentTarget.style.background = 'rgba(186,26,26,0.08)'}
                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: 17 }}>cancel</span>
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontFamily: F.mono, fontSize: 9, color: C.outline }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            {/* ══ RIGHT COLUMN ══ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

              {/* ── Logistics Sheet ── */}
              <div style={{
                background: C.cream,
                padding: 32,
                border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                position: 'relative',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                  <span className="material-symbols-outlined" style={{ color: C.navy, fontSize: 20 }}>local_shipping</span>
                  <h3 style={{
                    fontFamily: F.mono, fontSize: 11,
                    fontWeight: 700, color: C.navy,
                    textTransform: 'uppercase', letterSpacing: '0.2em',
                    margin: 0,
                  }}>
                    Registro de Logística
                  </h3>
                </div>

                {/* Timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

                  {/* Entry 1: Fecha de Ingreso (active - navy dot) */}
                  <div style={{ position: 'relative', paddingLeft: 24, borderLeft: '2px dotted rgba(196,198,208,0.6)' }}>
                    <div style={{
                      position: 'absolute', left: -5, top: 0,
                      width: 9, height: 9, borderRadius: '50%',
                      background: C.navy,
                      outline: '4px solid rgba(255,255,255,0.5)',
                    }} />
                    <p style={{
                      fontFamily: F.mono, fontSize: 10,
                      color: C.outline, textTransform: 'uppercase',
                      letterSpacing: '0.1em', margin: 0, marginBottom: 4,
                    }}>
                      Fecha de Ingreso
                    </p>
                    <p style={{
                      fontFamily: "'Cormorant Garamond', 'Playfair Display', serif", fontStyle: 'italic',
                      fontSize: 16,
                      color: C.navy, fontWeight: 700, margin: 0,
                    }}>
                      {formatDate(today)}
                    </p>
                  </div>

                  {/* Entry 2: Retorno Est. (pending - grey dot) */}
                  <div style={{ position: 'relative', paddingLeft: 24, borderLeft: '2px dotted rgba(196,198,208,0.6)' }}>
                    <div style={{
                      position: 'absolute', left: -5, top: 0,
                      width: 9, height: 9, borderRadius: '50%',
                      background: C.outlineVar,
                    }} />
                    <p style={{
                      fontFamily: F.mono, fontSize: 10,
                      color: C.outline, textTransform: 'uppercase',
                      letterSpacing: '0.1em', margin: 0, marginBottom: 4,
                    }}>
                      Retorno Est. (Urgente)
                    </p>
                    <p style={{
                      fontFamily: "'Cormorant Garamond', 'Playfair Display', serif", fontStyle: 'italic',
                      fontSize: 16,
                      color: C.navy, fontWeight: 700, margin: 0,
                    }}>
                      {formatDate(inEight)}
                    </p>
                  </div>

                  {/* Entry 3: Punto de Entrega */}
                  <div style={{ paddingTop: 24, borderTop: '1px dotted rgba(196,198,208,0.6)' }}>
                    <p style={{
                      fontFamily: F.mono, fontSize: 10,
                      color: C.outline, textTransform: 'uppercase',
                      letterSpacing: '0.1em', margin: 0, marginBottom: 12,
                    }}>
                      Punto de Entrega
                    </p>
                    <div style={{
                      background: 'rgba(255,255,255,0.5)',
                      padding: 16,
                      border: '1px solid rgba(0,0,0,0.05)',
                      boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.06)',
                    }}>
                      <p style={{
                        fontFamily: F.body, fontSize: 12,
                        color: C.inkLight, lineHeight: 1.7,
                        margin: 0,
                      }}>
                        Central Vault Archives<br />
                        1200 Constitution Ave NW<br />
                        Washington, DC 20560
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Receipt / Summary ── */}
              <div style={{
                background: 'rgba(255,255,255,0.85)',
                padding: 32,
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                border: '1px solid rgba(0,0,0,0.1)',
                overflow: 'hidden',
                position: 'relative',
              }}>
                {/* Watermark */}
                <div style={{
                  position: 'absolute', right: -16, top: -16,
                  opacity: 0.05,
                  transform: 'rotate(12deg)',
                  pointerEvents: 'none',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 120, color: C.navy }}>verified_user</span>
                </div>

                {/* Header row */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  borderBottom: '2px solid rgba(1,30,75,0.2)',
                  paddingBottom: 16, marginBottom: 40,
                }}>
                  <div>
                    <h3 style={{
                      fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
                      fontSize: 26, fontStyle: 'italic',
                      color: C.navy, margin: 0, fontWeight: 700,
                    }}>
                      Resumen
                    </h3>
                    <span style={{
                      display: 'inline-block',
                      marginTop: 4,
                      backgroundColor: C.navy,
                      color: C.goldDim,
                      padding: '2px 8px',
                      fontFamily: F.mono, fontSize: 9,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontWeight: 700,
                    }}>
                      {trackingId ? `#${trackingId}` : 'PENDIENTE DE ENVÍO'}
                    </span>
                  </div>
                  <div style={{
                    width: 48, height: 48,
                    backgroundColor: '#fff',
                    border: '1px solid rgba(0,0,0,0.1)',
                    padding: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: C.navy }}>qr_code_2</span>
                  </div>
                </div>

                {/* Line items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 0 }}>
                  {/* Tier line */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontFamily: F.mono, fontSize: 12,
                    borderBottom: '1px dotted rgba(196,198,208,0.8)',
                    paddingBottom: 8,
                  }}>
                    <span style={{ color: C.inkLight, fontStyle: 'italic' }}>{tierObj?.label} Tier</span>
                    <span style={{ fontWeight: 700, color: C.navy }}>${tierPrice}.00</span>
                  </div>

                  {/* Express surcharge (only if urgent) */}
                  {urgent && (
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontFamily: F.mono, fontSize: 12,
                      borderBottom: '1px dotted rgba(196,198,208,0.8)',
                      paddingBottom: 8,
                    }}>
                      <span style={{ color: C.inkLight, fontStyle: 'italic' }}>Express Surcharge</span>
                      <span style={{ fontWeight: 700, color: C.navy }}>$35.00</span>
                    </div>
                  )}

                  {/* Insurance */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontFamily: F.mono, fontSize: 12,
                    borderBottom: '1px dotted rgba(196,198,208,0.8)',
                    paddingBottom: 8,
                  }}>
                    <span style={{ color: C.inkLight, fontStyle: 'italic' }}>Insurance Ledger</span>
                    <span style={{ fontWeight: 700, color: C.navy }}>$12.50</span>
                  </div>

                  {/* Total row */}
                  <div style={{
                    paddingTop: 24,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                  }}>
                    <span style={{
                      fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
                      fontSize: 26, fontStyle: 'italic',
                      color: C.navy, fontWeight: 700,
                    }}>
                      Total
                    </span>
                    <span style={{
                      fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, fontStyle: 'normal',
                      color: C.gold,
                      textDecoration: 'underline double rgba(120,90,0,0.3)',
                      textUnderlineOffset: 8,
                    }}>
                      ${total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  onClick={() => {
                    if (hasPendingCertification) {
                      toast.error('Esta pieza ya tiene una certificación en proceso.');
                      return;
                    }
                    setSubmitModalOpen(true);
                  }}
                  disabled={hasPendingCertification}
                  style={{
                    width: '100%',
                    marginTop: 24,
                    backgroundColor: hasPendingCertification ? 'rgba(1,30,75,0.3)' : C.navy,
                    color: hasPendingCertification ? '#b0a898' : C.goldLight,
                    padding: '16px 24px',
                    fontFamily: F.mono, fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                    boxShadow: hasPendingCertification ? 'none' : '0 4px 16px rgba(0,0,0,0.3)',
                    border: 'none',
                    cursor: hasPendingCertification ? 'not-allowed' : 'pointer',
                    opacity: hasPendingCertification ? 0.6 : 1,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {hasPendingCertification ? 'hourglass_top' : 'approval'}
                  </span>
                  {hasPendingCertification ? 'CERTIFICACIÓN EN PROCESO' : 'ENVIAR SOLICITUD'}
                </button>

                {/* Disclaimer */}
                <p style={{
                  marginTop: 24,
                  fontFamily: F.mono, fontSize: 10,
                  textAlign: 'center',
                  opacity: 0.4,
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                  color: C.inkDark,
                }}>
                  Al enviar, usted acepta los Términos de Depósito y los estándares de manejo archival institucional.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════ MODAL: Cambiar Moneda ══════════════ */}
      <Modal
        isOpen={coinModalOpen}
        onClose={() => setCoinModalOpen(false)}
        title="Seleccionar Moneda"
        onConfirm={handleCoinSelect}
        confirmText="Seleccionar"
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
          {coins.map(coin => (
            <div
              key={coin.id}
              onClick={() => setTempCoin(coin.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '12px 16px',
                cursor: 'pointer',
                backgroundColor: tempCoin === coin.id ? 'rgba(1,30,75,0.06)' : 'transparent',
                border: tempCoin === coin.id ? `1px solid ${C.navy}` : '1px solid rgba(0,0,0,0.05)',
                transition: 'background 0.15s',
              }}
            >
              {/* Radio indicator */}
              <span className="material-symbols-outlined" style={{
                fontSize: 20,
                color: tempCoin === coin.id ? C.navy : C.outlineVar,
                flexShrink: 0,
              }}>
                {tempCoin === coin.id ? 'radio_button_checked' : 'radio_button_unchecked'}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 15, fontStyle: 'italic', fontWeight: 600,
                  color: C.navy, margin: 0, marginBottom: 2,
                }}>
                  {coin.name}
                </p>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10, color: C.outline,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  margin: 0,
                }}>
                  {coin.id} · {coin.year} · {coin.grade}
                </p>
              </div>

              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, fontWeight: 700,
                color: C.gold,
                flexShrink: 0,
              }}>
                ${Number(coin.estimatedValue || 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </Modal>

      {/* ══════════════ MODAL: Confirmar Envío ══════════════ */}
      <Modal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        title="Confirmar Solicitud"
        onConfirm={handleSubmit}
        confirmText={submitting ? 'Enviando...' : 'Confirmar Envío'}
        size="sm"
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: 15,
            color: '#241a07', lineHeight: 1.6, marginBottom: 16,
          }}>
            ¿Confirmar envío de solicitud de certificación para{' '}
            <strong style={{ fontStyle: 'italic' }}>{selectedCoin.name}</strong>?
          </p>
          <div style={{
            backgroundColor: 'rgba(1,30,75,0.04)',
            border: '1px solid rgba(1,30,75,0.12)',
            padding: '12px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.inkLight }}>
              Total a pagar
            </span>
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 22, fontStyle: 'italic', fontWeight: 700,
              color: C.gold,
            }}>
              ${total.toFixed(2)}
            </span>
          </div>
        </div>
      </Modal>

      {/* ══════════════ MODAL: Aprobar Certificación ══════════════ */}
      <Modal
        isOpen={!!approveModal}
        onClose={() => setApproveModal(null)}
        title="Aprobar Certificación"
        onConfirm={handleApprove}
        confirmText={approving ? 'Aprobando...' : 'Sí, aprobar'}
        size="sm"
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: 15,
            color: '#241a07', lineHeight: 1.6, marginBottom: 16,
          }}>
            ¿Aprobar la certificación de{' '}
            <strong style={{ fontStyle: 'italic' }}>{approveModal?.coinName}</strong>?
          </p>
          <div style={{
            backgroundColor: 'rgba(26,107,46,0.06)',
            border: '1px solid rgba(26,107,46,0.2)',
            padding: '12px 16px',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#1a6b2e', flexShrink: 0 }}>info</span>
            <p style={{ fontFamily: F.mono, fontSize: 10, color: '#1a6b2e', margin: 0, lineHeight: 1.5 }}>
              La pieza correspondiente en el inventario quedará marcada como <strong>CERTIFICADA</strong> automáticamente.
            </p>
          </div>
        </div>
      </Modal>
      {/* ══════════════ MODAL: Cancelar Certificación ══════════════ */}
      <Modal
        isOpen={!!cancelModal}
        onClose={() => setCancelModal(null)}
        title="Cancelar Solicitud"
        onConfirm={handleCancel}
        confirmText={cancelling ? 'Cancelando...' : 'Sí, cancelar'}
        confirmVariant="danger"
        size="sm"
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: 15,
            color: '#241a07', lineHeight: 1.6, marginBottom: 16,
          }}>
            ¿Cancelar la solicitud de certificación de{' '}
            <strong style={{ fontStyle: 'italic' }}>{cancelModal?.coinName}</strong>?
          </p>
          <div style={{
            backgroundColor: 'rgba(186,26,26,0.05)',
            border: '1px solid rgba(186,26,26,0.2)',
            padding: '12px 16px',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#ba1a1a', flexShrink: 0 }}>info</span>
            <p style={{ fontFamily: F.mono, fontSize: 10, color: '#ba1a1a', margin: 0, lineHeight: 1.5 }}>
              Esta acción marcará la solicitud como <strong>CANCELADA</strong> y la pieza quedará libre para una nueva certificación.
            </p>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}