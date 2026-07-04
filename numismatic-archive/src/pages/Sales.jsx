import React, { useState, useEffect, useRef } from 'react';
import { BACKEND_URL } from '../utils/constants.js';
import AppLayout from '../components/layout/AppLayout.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useWindowSize, isMobile } from '../hooks/useWindowSize.js';
import { fetchCoins, updateCoin } from '../services/coinsService.js';
import { useLocation } from 'react-router-dom';
import { fetchSales, createSaleAPI, updateSaleAPI } from '../services/coinsService.js';

/* ── Design tokens (alineados a Ledger) ─────────────────────────── */
const F = {
  display: "'Cormorant Garamond', 'Playfair Display', serif",
  body:    "'Inter', sans-serif",
  mono:    "'JetBrains Mono', monospace",
};
const C = {
  navy:       '#011e4b',
  gold:       '#785a00',
  goldLight:  '#ffdf9c',
  cream:      '#f4ece1',
  bg:         '#fff8f2',
  inkDark:    '#241a07',
  inkLight:   '#44474f',
  outline:    '#757780',
  outlineVar: '#c4c6d0',
  error:      '#ba1a1a',
  success:    '#1a6b2e',
};

const EMPTY_SALE_FORM = {
  coinId: '',
  coinName: '',
  buyer: '',
  salePrice: '',
  date: '',
  status: 'Pendiente',
  paymentMethod: 'Transferencia Bancaria',
  notes: '',
};

/* ── Helpers ─────────────────────────────────────────────────────── */
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' });
}

function badgeStyle(status) {
  if (status === 'Completada') return { border: '1px solid rgba(26,107,46,0.4)', color: C.success, background: 'rgba(240,255,244,0.9)' };
  if (status === 'Cancelada')  return { border: '1px solid rgba(186,26,26,0.4)', color: C.error,   background: 'rgba(255,241,241,0.9)' };
  return { border: '1px solid rgba(120,90,0,0.4)', color: C.gold, background: 'rgba(255,251,235,0.9)' };
}

/* ── Corner tabs ─────────────────────────────────────────────────── */
function CornerTabs({ gold = false }) {
  const base = {
    position: 'absolute', width: 18, height: 18,
    border: `1px solid ${gold ? 'rgba(120,90,0,0.3)' : 'rgba(0,0,0,0.1)'}`,
    background: gold ? 'rgba(120,90,0,0.08)' : 'rgba(255,255,255,0.4)',
  };
  return (
    <>
      <div style={{ ...base, top: 0, left: 0, borderRight: 'none', borderBottom: 'none' }} />
      <div style={{ ...base, top: 0, right: 0, borderLeft: 'none', borderBottom: 'none' }} />
      <div style={{ ...base, bottom: 0, left: 0, borderRight: 'none', borderTop: 'none' }} />
      <div style={{ ...base, bottom: 0, right: 0, borderLeft: 'none', borderTop: 'none' }} />
    </>
  );
}

/* ── Status Badge ────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const icons = { Completada: 'task_alt', Cancelada: 'cancel', Pendiente: 'pending' };
  return (
    <span className={status === 'Pendiente' ? 'status-badge-pending' : undefined} style={{
      ...badgeStyle(status),
      fontFamily: F.mono, fontSize: 9, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.1em',
      padding: '3px 10px', borderRadius: 3,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>
        {icons[status] || 'circle'}
      </span>
      {status}
    </span>
  );
}

/* ── Pending Sale Card ───────────────────────────────────────────── */
function PendingSaleCard({ sale, onView, onComplete, onCancel, coin }) {
  const [hov, setHov] = useState(false);
  const imgSrc = coin?.imageUrl ? `${BACKEND_URL}${coin.imageUrl}` : null;

  return (
    <div
      className="pending-card"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: C.cream, position: 'relative', padding: 20,
        border: hov ? '1px solid rgba(120,90,0,0.3)' : '1px solid rgba(0,0,0,0.06)',
        boxShadow: hov ? '0 8px 24px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.07)',
        transform: hov ? 'translateY(-2px)' : 'none',
        transition: 'all 0.2s',
      }}
    >
      <CornerTabs gold />

      {/* PENDIENTE stamp */}
      <div style={{ position: 'absolute', top: 10, right: 10 }}>
        <span className="pending-stamp" style={{
          border: '2px solid rgba(120,90,0,0.5)', color: C.gold,
          padding: '2px 8px', fontSize: 8, fontFamily: F.mono,
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em',
          display: 'inline-block', transform: 'rotate(-3deg)',
          background: 'rgba(255,251,235,0.8)',
        }}>Pendiente</span>
      </div>

      {/* Coin image + info */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'flex-start' }}>
        <div className="pending-coin-avatar" style={{
          width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
          background: '#e8dfd1', overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {imgSrc
            ? <img src={imgSrc} alt={sale.coinName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span className="material-symbols-outlined" style={{ fontSize: 24, color: C.gold, fontVariationSettings: "'FILL' 1" }}>token</span>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: F.mono, fontSize: 9, color: C.outline, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 3 }}>
            {sale.buyer.split(' ')[0]}
          </p>
          <p style={{
            fontFamily: F.display, fontSize: 18, fontStyle: 'italic', color: C.navy,
            marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{sale.coinName}</p>
          <p className="pending-price" style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: C.gold }}>
            S/ {Number(sale.salePrice).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Footer actions */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
        paddingTop: 14, borderTop: '1px dotted rgba(196,198,208,0.4)',
      }}>
        <PendingBtn label="Ver Detalle" icon="visibility" onClick={() => onView(sale)} outlined />
        <PendingBtn label="Marcar Pagada" icon="check_circle" onClick={() => onComplete(sale)} />
      </div>
    </div>
  );
}

function PendingBtn({ label, icon, onClick, outlined = false }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        padding: '8px 0',
        border: outlined ? `1px solid ${C.navy}` : 'none',
        background: outlined
          ? (hov ? C.navy : 'transparent')
          : (hov ? '#1c3461' : C.navy),
        color: outlined ? (hov ? C.goldLight : C.navy) : C.goldLight,
        fontFamily: F.mono, fontSize: 9, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.12em',
        cursor: 'pointer', transition: 'all 0.15s',
        boxShadow: outlined ? 'none' : '0 2px 6px rgba(1,30,75,0.25)',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{icon}</span>
      {label}
    </button>
  );
}

/* ── Table Row ───────────────────────────────────────────────────── */
function SaleRow({ sale, onView, onCancel, coin, index }) {
  const [hov, setHov] = useState(false);
  const imgSrc = coin?.imageUrl ? `${BACKEND_URL}${coin.imageUrl}` : null;
  const isCancelled = sale.status === 'Cancelada';

  return (
    <tr
      className="sale-row"
      style={{
        background: hov ? 'rgba(1,30,75,0.04)' : index % 2 === 0 ? 'transparent' : 'rgba(120,90,0,0.02)',
        transition: 'background 0.15s',
        cursor: 'pointer',
        opacity: isCancelled ? 0.6 : 1,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onView(sale)}
    >
      {/* Fecha */}
      <td style={{ padding: '14px 16px', fontFamily: F.mono, fontSize: 11, color: C.outline, whiteSpace: 'nowrap' }}>
        {fmtDate(sale.date)}
      </td>

      {/* Pieza */}
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="sale-avatar" style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: '#e8dfd1', overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {imgSrc
              ? <img src={imgSrc} alt={sale.coinName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span className="material-symbols-outlined" style={{ fontSize: 16, color: C.gold, fontVariationSettings: "'FILL' 1" }}>toll</span>
            }
          </div>
          <div>
            <p style={{ fontFamily: F.display, fontSize: 15, fontStyle: 'italic', color: C.navy, margin: 0 }}>
              {sale.coinName}
            </p>
            {sale.coinId && (
              <p style={{ fontFamily: F.mono, fontSize: 9, color: C.outline, margin: '1px 0 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {sale.coinId}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Comprador */}
      <td style={{ padding: '14px 16px', fontFamily: F.body, fontSize: 13, color: C.inkLight }}>
        {sale.buyer}
      </td>

      {/* Monto */}
      <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: C.gold, whiteSpace: 'nowrap' }}>
        <span className="sale-amount">S/ {Number(sale.salePrice).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
      </td>

      {/* Estado */}
      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
        <StatusBadge status={sale.status} />
      </td>

      {/* Acciones */}
      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
          <ActionIconBtn icon="visibility" title="Ver detalle" onClick={() => onView(sale)} hovered={hov} />
          {sale.status === 'Pendiente' && (
            <ActionIconBtn icon="cancel" title="Cancelar venta" onClick={() => onCancel(sale)} danger />
          )}
        </div>
      </td>
    </tr>
  );
}

function ActionIconBtn({ icon, title, onClick, danger = false, hovered = false }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      className="action-icon-btn"
      onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 30, height: 30, borderRadius: '50%',
        border: danger
          ? `1px solid ${hov ? 'rgba(186,26,26,0.6)' : 'rgba(186,26,26,0.3)'}`
          : `1px solid ${hov ? 'rgba(1,30,75,0.4)' : 'rgba(1,30,75,0.2)'}`,
        background: danger
          ? (hov ? 'rgba(186,26,26,0.1)' : 'rgba(255,255,255,0.5)')
          : (hov ? C.navy : 'transparent'),
        color: danger ? C.error : (hov ? '#fff' : C.navy),
        cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{icon}</span>
    </button>
  );
}

/* ── Summary KPI cards ───────────────────────────────────────────── */
function KpiCard({ label, value, icon, sub }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.85)', padding: '16px 20px', position: 'relative',
      border: '1px solid rgba(0,0,0,0.05)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <CornerTabs />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontFamily: F.mono, fontSize: 9, color: C.outline, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>{label}</p>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: C.gold, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, fontStyle: 'normal', color: C.navy, margin: 0 }}>{value}</p>
      {sub && <p style={{ fontFamily: F.mono, fontSize: 9, color: C.outline, margin: 0 }}>{sub}</p>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function Sales() {
  const toast = useToast();
  const { width } = useWindowSize();
  const mobile = isMobile(width);

  // ── State ──
  const [items, setItems] = useState([]);
  const [salesLoading, setSalesLoading] = useState(true);

  useEffect(() => {
    sessionStorage.setItem('sales_data', JSON.stringify(items));
  }, [items]);

  const [availableCoins, setAvailableCoins] = useState([]);
  const [coinsLoading, setCoinsLoading]     = useState(true);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState([]);
  const [filterOpen, setFilterOpen]   = useState(false);

  const [detailSale, setDetailSale]   = useState(null);
  const [newSaleModal, setNewSaleModal] = useState(false);
  const [newSale, setNewSale]         = useState(EMPTY_SALE_FORM);
  const [cancelModal, setCancelModal] = useState(null);
  const [completeModal, setCompleteModal] = useState(null);
  const [saving, setSaving]           = useState(false);

  const filterBtnRef = useRef(null);

  const location = useLocation();

  useEffect(() => {
    Promise.all([
      fetchCoins().then(data => setAvailableCoins(data)),
      fetchSales().then(data => setItems(data.map((s, i) => ({ ...s, _key: s.id || i })))),
    ])
      .catch(() => toast.error('Error al cargar datos.'))
      .finally(() => { setCoinsLoading(false); setSalesLoading(false); });
  }, []);

  useEffect(() => {
    if (!location.state?.newSale) return;
    fetchSales()
      .then(data => setItems(data.map((s, i) => ({ ...s, _key: s.id || i }))))
      .catch(() => {});
    window.history.replaceState({}, '');
  }, [location.state]);

  // ── Coin lookup helper ──
  const getCoin = (coinId) => availableCoins.find(c => c.id === coinId) || null;

  // ── Pending (left column) ──
  const pending = items.filter(s => s.status === 'Pendiente');

  // ── Filtered history (right column) ──
  const sellableCoins = availableCoins.filter(c => c.status !== 'sold');

  const historyItems = items.filter(s => {
    const q = search.toLowerCase();
    const matchQ = !q || s.coinName.toLowerCase().includes(q) || s.buyer.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
    const matchStatus = statusFilter.length === 0 || statusFilter.includes(s.status);
    return matchQ && matchStatus;
  });

  // ── KPIs ──
  const totalCompleted = items.filter(s => s.status === 'Completada').reduce((a, s) => a + Number(s.salePrice), 0);
  const totalPending   = items.filter(s => s.status === 'Pendiente').length;
  const totalSales     = items.length;

  // ── Handlers ──
  const handleAddSale = async () => {
    if (!newSale.coinName || !newSale.buyer || !newSale.salePrice) {
      toast.error('Complete los campos obligatorios.');
      return;
    }
    setSaving(true);
    try {
      if (newSale.coinId && newSale.status === 'Completada') {
        await updateCoin(newSale.coinId, { status: 'sold' });
        setAvailableCoins(prev => prev.map(c => c.id === newSale.coinId ? { ...c, status: 'sold' } : c));
      }

      const created = await createSaleAPI({
        coinId: newSale.coinId, coinName: newSale.coinName,
        buyer: newSale.buyer, salePrice: Number(newSale.salePrice),
        date: newSale.date, status: newSale.status,
        paymentMethod: newSale.paymentMethod, notes: newSale.notes,
      });
      setItems(prev => [{ ...created, _key: created.id }, ...prev]);
      setNewSaleModal(false);
      setNewSale(EMPTY_SALE_FORM);
      toast.success(`Venta de "${newSale.coinName}" registrada.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    const sale = completeModal;
    setCompleteModal(null);
    try {
      if (sale.coinId) {
        await updateCoin(sale.coinId, { status: 'sold' });
        setAvailableCoins(prev => prev.map(c => c.id === sale.coinId ? { ...c, status: 'sold' } : c));
      }
      const updated = await updateSaleAPI(sale.id, { status: 'Completada' });
      setItems(prev => prev.map(s => s.id === sale.id ? { ...s, ...updated } : s));
      if (detailSale?.id === sale.id) setDetailSale(p => ({ ...p, status: 'Completada' }));
      toast.success(`"${sale.coinName}" marcada como completada.`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCancel = async () => {
    const sale = cancelModal;
    setCancelModal(null);
    try {
      const updated = await updateSaleAPI(sale.id, { status: 'Cancelada' });
      setItems(prev => prev.map(s => s.id === sale.id ? { ...s, ...updated } : s));
      if (detailSale?.id === sale.id) setDetailSale(p => ({ ...p, status: 'Cancelada' }));
      toast.success(`Venta de "${sale.coinName}" cancelada.`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Cuando se selecciona moneda del dropdown en el form
  const handleCoinSelect = (coinId) => {
    if (!coinId) {
      setNewSale(p => ({ ...p, coinId: '', coinName: '' }));
      return;
    }
    const coin = availableCoins.find(c => c.id === coinId);
    if (coin) {
      setNewSale(p => ({
        ...p,
        coinId: coin.id,
        coinName: coin.name,
        salePrice: coin.estimatedValue || '',
      }));
    }
  };

  const STATUS_FILTERS = ['all', 'Pendiente', 'Completada', 'Cancelada'];
  const STATUS_LABELS  = { all: 'Todos', Pendiente: 'Pendiente', Completada: 'Completada', Cancelada: 'Cancelada' };

  return (
    <AppLayout>

      {/* ══════════ HEADER ══════════ */}
      <header style={{
        height: 72,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: mobile ? '0 16px 0 64px' : '0 24px',
        backgroundColor: 'rgba(255,242,223,0.55)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(196,198,208,0.4)',
        position: 'sticky', top: 0, zIndex: 20, flexShrink: 0,
      }}>
        <div>
          <p style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.inkLight, marginBottom: 2 }}>
            Archivo Histórico / Ventas
          </p>
          <h1 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 600, fontStyle: 'italic', color: C.navy, margin: 0, lineHeight: 1.1 }}>
            Registro de Transacciones
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined" style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: 18, color: C.outline, pointerEvents: 'none',
            }}>history_edu</span>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar en el libro de registro..."
              style={{
                paddingLeft: 34, paddingRight: search ? 32 : 14, paddingTop: 7, paddingBottom: 7,
                background: 'rgba(255,255,255,0.5)', border: 'none',
                borderBottom: `2px solid ${C.outlineVar}`,
                fontFamily: F.body, fontSize: 13, color: C.inkDark,
                outline: 'none', fontStyle: 'italic', width: 200,
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{
                position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: C.outline,
                display: 'flex', alignItems: 'center', padding: 2,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            )}
          </div>

          {/* Filter */}
          {!mobile && (
            <div style={{ position: 'relative' }}>
              <button
                ref={filterBtnRef}
                onClick={() => setFilterOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                  border: filterOpen || statusFilter.length > 0
                    ? '1px solid rgba(120,90,0,0.5)' : '1px solid rgba(196,198,208,0.5)',
                  background: filterOpen || statusFilter.length > 0 ? 'rgba(120,90,0,0.08)' : 'transparent',
                  cursor: 'pointer', borderRadius: 4,
                  fontFamily: F.mono, fontSize: 11,
                  color: statusFilter.length > 0 ? C.gold : C.inkLight,
                  transition: 'all 0.15s',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>filter_alt</span>
                Filtrar
                {statusFilter.length > 0 && (
                  <span style={{
                    background: C.gold, color: 'white', borderRadius: '50%',
                    width: 15, height: 15, fontSize: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                  }}>{statusFilter.length}</span>
                )}
              </button>

              {filterOpen && (
                <div className="filter-panel-enter" style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 30,
                  background: '#ffffff',
                  border: '1px solid rgba(196,179,145,0.4)',
                  borderRadius: 10, padding: 14, minWidth: 200,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <p style={{ fontFamily: F.mono, fontSize: 9, color: C.outline, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Estado</p>
                    <button onClick={() => setFilterOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex', padding: 2 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
                    </button>
                  </div>
                  {STATUS_FILTERS.filter(s => s !== 'all').map(s => {
                    const checked = statusFilter.includes(s);
                    return (
                      <button key={s} onClick={() => {
                        setStatusFilter(prev =>
                          prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                        );
                      }} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', width: '100%',
                        background: checked ? 'rgba(120,90,0,0.1)' : 'transparent',
                        border: checked ? '1px solid rgba(120,90,0,0.3)' : '1px solid transparent',
                        borderRadius: 3, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                      }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                          border: checked ? `2px solid ${C.gold}` : `2px solid ${C.outlineVar}`,
                          background: checked ? C.gold : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}>
                          {checked && <span className="material-symbols-outlined" style={{ fontSize: 10, color: 'white', fontVariationSettings: "'FILL' 1" }}>check</span>}
                        </div>
                        <span style={{
                          fontFamily: F.mono, fontSize: 10,
                          color: checked ? C.gold : C.inkLight,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>{STATUS_LABELS[s]}</span>
                      </button>
                    );
                  })}
                  {statusFilter.length > 0 && (
                    <button onClick={() => setStatusFilter([])} style={{
                      marginTop: 8, width: '100%', padding: '6px 0',
                      background: 'transparent', border: '1px solid rgba(186,26,26,0.3)',
                      borderRadius: 3, cursor: 'pointer',
                      fontFamily: F.mono, fontSize: 10,
                      color: C.error, textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>
                      Limpiar filtros
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Nueva Venta */}
          <button
            onClick={() => setNewSaleModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: mobile ? '8px' : '8px 16px',
              background: C.navy, color: '#fff', border: 'none',
              cursor: 'pointer', borderRadius: 4,
              fontFamily: F.mono, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            {!mobile && 'NUEVA VENTA'}
          </button>
        </div>
      </header>

      {/* ══════════ KPI BAR ══════════ */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
        borderBottom: '1px solid rgba(196,198,208,0.3)',
        background: 'rgba(196,198,208,0.2)',
        flexShrink: 0,
      }}>
        <KpiCard
          label="Total recaudado"
          value={`S/ ${totalCompleted.toLocaleString('es-PE', { minimumFractionDigits: 0 })}`}
          icon="paid"
          sub="ventas completadas"
        />
        <KpiCard
          label="En proceso"
          value={`${totalPending} venta${totalPending !== 1 ? 's' : ''}`}
          icon="pending_actions"
          sub="pagos pendientes"
        />
        <KpiCard
          label="Transacciones"
          value={totalSales}
          icon="receipt_long"
          sub="registros totales"
        />
      </div>

      {/* ══════════ MAIN ══════════ */}
      <div data-tutorial="sales-main" style={{
        flex: 1, overflowY: 'auto',
        backgroundColor: '#f6f1eb',
        background: 'linear-gradient(160deg, #faf6f0 0%, #f0e9df 100%)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: mobile ? '1fr' : '320px 1fr',
          gap: 0,
          minHeight: '100%',
        }}>

          {/* ── LEFT: Ventas Activas ── */}
          <aside style={{
            borderRight: mobile ? 'none' : '1px solid rgba(196,198,208,0.3)',
            padding: mobile ? 16 : 20,
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px dotted ' + C.outlineVar }}>
              <span className="material-symbols-outlined" style={{ color: C.gold, fontSize: 20, fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, fontStyle: 'normal', color: C.navy, margin: 0 }}>
                Ventas Activas
              </h2>
              {pending.length > 0 && (
                <span style={{
                  background: C.gold, color: 'white', borderRadius: '50%',
                  width: 18, height: 18, fontSize: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                  fontFamily: F.mono,
                }}>{pending.length}</span>
              )}
            </div>

            {/* Cards */}
            {pending.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '32px 0', gap: 10, opacity: 0.5,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 40, color: C.outline }}>inbox</span>
                <p style={{ fontFamily: F.mono, fontSize: 10, color: C.outline, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                  Sin ventas pendientes
                </p>
              </div>
            ) : (
              pending.map(sale => (
                <PendingSaleCard
                  key={sale._key}
                  sale={sale}
                  coin={getCoin(sale.coinId)}
                  onView={setDetailSale}
                  onComplete={s => setCompleteModal(s)}
                  onCancel={s => setCancelModal(s)}
                />
              ))
            )}
          </aside>

          {/* ── RIGHT: Historial ── */}
          <section style={{ padding: mobile ? 16 : 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px dotted ' + C.outlineVar }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: C.gold, fontSize: 20 }}>history</span>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, fontStyle: 'normal', color: C.navy, margin: 0 }}>
                  Historial de Transacciones
                </h2>
              </div>
              {statusFilter.length > 0 && statusFilter.map(s => (
                <button key={s} onClick={() => setStatusFilter(prev => prev.filter(x => x !== s))} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'rgba(120,90,0,0.08)', border: '1px solid rgba(120,90,0,0.3)',
                  borderRadius: 99, padding: '3px 10px', cursor: 'pointer',
                  fontFamily: F.mono, fontSize: 9, color: C.gold,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {STATUS_LABELS[s]}
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span>
                </button>
              ))}
            </div>

            {/* Table card */}
            <div style={{
              background: 'rgba(255,255,255,0.88)',
              border: '1px solid rgba(0,0,0,0.05)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Ledger paper lines */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.025,
                backgroundImage: 'repeating-linear-gradient(#000 0, #000 1px, transparent 1px, transparent 40px)',
              }} />

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', position: 'relative', zIndex: 1 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(1,30,75,0.15)' }}>
                      {[
                        { label: 'Fecha',     align: 'left'   },
                        { label: 'Pieza',     align: 'left'   },
                        { label: 'Comprador', align: 'left'   },
                        { label: 'Monto',     align: 'right'  },
                        { label: 'Estado',    align: 'center' },
                        { label: 'Acciones',  align: 'center' },
                      ].map(col => (
                        <th key={col.label} style={{
                          fontFamily: F.mono, fontSize: 9, textTransform: 'uppercase',
                          letterSpacing: '0.2em', fontWeight: 700, color: C.navy,
                          padding: '14px 16px', textAlign: col.align,
                          background: 'rgba(1,30,75,0.02)',
                        }}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historyItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{
                          textAlign: 'center', padding: 48,
                          fontFamily: F.mono, fontSize: 11,
                          textTransform: 'uppercase', letterSpacing: '0.1em', color: C.outline,
                        }}>
                          {search || statusFilter !== 'all' ? 'Sin resultados para los filtros aplicados' : 'Sin transacciones registradas'}
                        </td>
                      </tr>
                    ) : (
                      historyItems.map((sale, i) => (
                        <SaleRow
                          key={sale._key}
                          sale={sale}
                          coin={getCoin(sale.coinId)}
                          index={i}
                          onView={setDetailSale}
                          onCancel={s => setCancelModal(s)}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <div style={{
                padding: '16px 24px',
                borderTop: `1px dotted ${C.outlineVar}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(120,90,0,0.02)',
              }}>
                <span style={{ fontFamily: F.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.25em', color: C.outline }}>
                  Registros verificados por el curador
                </span>
                <span style={{ fontFamily: F.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.25em', color: C.outline }}>
                  {historyItems.length} registro{historyItems.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ══════════════════ MODALS ══════════════════ */}

      {/* Detail Modal */}
      <Modal
        isOpen={!!detailSale}
        onClose={() => setDetailSale(null)}
        title="Detalle de Transacción"
        hideCancel
      >
        {detailSale && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Coin info banner */}
            {getCoin(detailSale.coinId) && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', marginBottom: 20,
                background: 'rgba(120,90,0,0.05)', border: '1px solid rgba(120,90,0,0.2)',
                borderRadius: 4,
              }}>
                {getCoin(detailSale.coinId)?.imageUrl && (
                  <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <img src={`${BACKEND_URL}${getCoin(detailSale.coinId).imageUrl}`} alt={detailSale.coinName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div>
                  <p style={{ fontFamily: F.display, fontSize: 15, fontStyle: 'italic', color: C.navy, margin: 0 }}>{detailSale.coinName}</p>
                  <p style={{ fontFamily: F.mono, fontSize: 9, color: C.outline, margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {detailSale.coinId} · {getCoin(detailSale.coinId)?.grade}
                  </p>
                </div>
              </div>
            )}

            {/* Fields */}
            {[
              ['ID de Transacción', detailSale.id],
              ['Comprador',         detailSale.buyer],
              ['Monto',             `S/ ${Number(detailSale.salePrice).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`],
              ['Fecha',             fmtDate(detailSale.date)],
              ['Método de Pago',    detailSale.paymentMethod],
            ].map(([label, val]) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: `1px dashed ${C.outlineVar}`, padding: '11px 0',
              }}>
                <span style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.outline }}>{label}</span>
                <span style={{
                  fontFamily: label === 'ID de Transacción' ? F.mono : F.body,
                  fontSize: 13, fontWeight: 600,
                  color: label === 'Monto' ? C.gold : C.inkDark,
                }}>{val}</span>
              </div>
            ))}

            {/* Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 11 }}>
              <span style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.outline }}>Estado</span>
              <StatusBadge status={detailSale.status} />
            </div>

            {detailSale.notes && (
              <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(120,90,0,0.04)', border: '1px solid rgba(120,90,0,0.15)', borderRadius: 4 }}>
                <p style={{ fontFamily: F.mono, fontSize: 9, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Notas</p>
                <p style={{ fontFamily: F.body, fontSize: 13, color: C.inkLight, lineHeight: 1.6, margin: 0 }}>{detailSale.notes}</p>
              </div>
            )}

            {/* Actions */}
            {detailSale.status === 'Pendiente' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
                <button onClick={() => { setDetailSale(null); setCompleteModal(detailSale); }} style={{
                  padding: '10px 0', background: C.navy, color: C.goldLight, border: 'none',
                  cursor: 'pointer', fontFamily: F.mono, fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                  Marcar Pagada
                </button>
                <button onClick={() => { setDetailSale(null); setCancelModal(detailSale); }} style={{
                  padding: '10px 0', background: 'transparent', color: C.error,
                  border: `1px solid ${C.error}`,
                  cursor: 'pointer', fontFamily: F.mono, fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>cancel</span>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Nueva Venta Modal */}
      <Modal
        isOpen={newSaleModal}
        onClose={() => { setNewSaleModal(false); setNewSale(EMPTY_SALE_FORM); }}
        title="Registrar Nueva Venta"
        onConfirm={handleAddSale}
        confirmText={saving ? 'Registrando...' : 'Registrar Venta'}
        size="lg"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Selector de moneda del inventario */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Pieza del Inventario</label>
            {coinsLoading ? (
              <p style={{ fontFamily: F.mono, fontSize: 11, color: C.outline }}>Cargando inventario...</p>
            ) : (
              <select
                className="form-input"
                value={newSale.coinId}
                onChange={e => handleCoinSelect(e.target.value)}
              >
                <option value="">— Seleccionar pieza del inventario —</option>
                {sellableCoins.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id}) · {c.grade} · S/ {Number(c.estimatedValue).toLocaleString()}
                  </option>
                ))}
                <option value="__manual__" disabled style={{ color: C.outline }}>── o ingresar manualmente ──</option>
              </select>
            )}
          </div>

          {/* Nombre manual si no seleccionó del inventario */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Nombre de la pieza *</label>
            <input
              className="form-input"
              value={newSale.coinName}
              onChange={e => setNewSale(p => ({ ...p, coinName: e.target.value, coinId: p.coinId }))}
              placeholder="Ej: Real de a Ocho — Columnario"
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Comprador *</label>
            <input
              className="form-input"
              value={newSale.buyer}
              onChange={e => setNewSale(p => ({ ...p, buyer: e.target.value }))}
              placeholder="Nombre del comprador o institución"
            />
          </div>

          <div>
            <label className="form-label">Monto (S/) *</label>
            <input
              className="form-input" type="number"
              value={newSale.salePrice}
              onChange={e => setNewSale(p => ({ ...p, salePrice: e.target.value }))}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="form-label">Fecha de Venta</label>
            <input
              className="form-input" type="date"
              value={newSale.date}
              onChange={e => setNewSale(p => ({ ...p, date: e.target.value }))}
            />
          </div>

          <div>
            <label className="form-label">Estado</label>
            <select className="form-input" value={newSale.status} onChange={e => setNewSale(p => ({ ...p, status: e.target.value }))}>
              <option>Pendiente</option>
              <option>Completada</option>
              <option>Cancelada</option>
            </select>
          </div>

          <div>
            <label className="form-label">Método de Pago</label>
            <select className="form-input" value={newSale.paymentMethod} onChange={e => setNewSale(p => ({ ...p, paymentMethod: e.target.value }))}>
              <option>Transferencia Bancaria</option>
              <option>Transferencia Internacional</option>
              <option>Cheque Certificado</option>
              <option>Efectivo</option>
              <option>Depósito en Garantía</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Notas</label>
            <textarea
              className="form-input" rows={3}
              value={newSale.notes}
              onChange={e => setNewSale(p => ({ ...p, notes: e.target.value }))}
              placeholder="Canal de venta, condiciones, observaciones..."
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Warning si seleccionó moneda y estado Completada */}
          {newSale.coinId && newSale.status === 'Completada' && (
            <div style={{
              gridColumn: '1 / -1', padding: '10px 14px',
              background: 'rgba(26,107,46,0.06)', border: '1px solid rgba(26,107,46,0.25)',
              borderRadius: 4, display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: C.success, flexShrink: 0 }}>info</span>
              <p style={{ fontFamily: F.mono, fontSize: 10, color: C.success, margin: 0, lineHeight: 1.5 }}>
                Al registrar, la pieza <strong>{newSale.coinName}</strong> cambiará a estado <strong>VENDIDA</strong> en el inventario automáticamente.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Complete Confirm Modal */}
      <Modal
        isOpen={!!completeModal}
        onClose={() => setCompleteModal(null)}
        title="Confirmar Pago Recibido"
        onConfirm={handleComplete}
        confirmText="Confirmar Pago"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontFamily: F.body, fontSize: 15, color: C.inkLight, lineHeight: 1.6, margin: 0 }}>
            ¿Confirma que se recibió el pago por{' '}
            <strong style={{ color: C.inkDark }}>"{completeModal?.coinName}"</strong>?
          </p>
          <div style={{
            padding: '12px 14px', background: 'rgba(26,107,46,0.06)',
            border: '1px solid rgba(26,107,46,0.2)', borderRadius: 4,
          }}>
            <p style={{ fontFamily: F.mono, fontSize: 10, color: C.success, textTransform: 'uppercase', marginBottom: 4 }}>¿Qué ocurre?</p>
            <p style={{ fontFamily: F.body, fontSize: 13, color: C.inkLight, margin: 0 }}>
              La transacción se marcará como <strong>Completada</strong>
              {completeModal?.coinId ? ' y la pieza se actualizará a "Vendida" en el inventario.' : '.'}
            </p>
          </div>
        </div>
      </Modal>

      {/* Cancel Confirm Modal */}
      <Modal
        isOpen={!!cancelModal}
        onClose={() => setCancelModal(null)}
        title="Cancelar Venta"
        onConfirm={handleCancel}
        confirmText="Sí, cancelar"
        confirmVariant="danger"
      >
        <p style={{ fontFamily: F.body, fontSize: 15, color: C.inkLight, lineHeight: 1.6 }}>
          ¿Confirma la cancelación de la venta de{' '}
          <strong style={{ color: C.inkDark }}>"{cancelModal?.coinName}"</strong>?
          La pieza volverá a estar disponible en el inventario.
        </p>
      </Modal>

    </AppLayout>
  );
}