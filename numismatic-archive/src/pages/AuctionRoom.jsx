import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../components/layout/AppLayout.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import CoinImage from '../components/ui/CoinImage.jsx';
import { useWindowSize, isMobile } from '../hooks/useWindowSize.js';
import { imageService } from '../services/imageService.js';
import { fetchAuctions, placeBidAPI } from '../services/coinsService.js';
import { useLocation } from 'react-router-dom';

// Ranking real derivado del historial de pujas del lote (sin postores ficticios)
function buildRankings(lot, userName) {
  const bids = [...(lot?.bids || [])].sort((a, b) => b.amount - a.amount);
  return bids.slice(0, 5).map((b, i) => ({
    rank: i + 1,
    user: b.bidder === userName ? 'Usted' : b.bidder,
    bid: b.amount,
    isUser: b.bidder === userName,
  }));
}

// ── Design tokens ──────────────────────────────────────────────
const F = {
  display: "'Playfair Display', serif",
  body: "'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
};
const C = {
  navy: '#011e4b',
  navyLight: '#1c3461',
  gold: '#785a00',
  goldLight: '#ffdf9c',
  goldDim: '#ecc15d',
  cream: '#f4ece1',
  parchment: '#fff8f2',
  inkDark: '#241a07',
  inkLight: '#44474f',
  outline: '#757780',
  outlineVar: '#c4c6d0',
  coinBg: '#e8dfd1',
};

const COIN_IMGS = [
  imageService.coin('coin-01.png'),
  imageService.coin('coin-02.png'),
  imageService.coin('coin-03.png'),
  imageService.coin('coin-04.png'),
];

const CURATOR_IMG = imageService.mascot('guardian-peru.png');

// ── Main Component ─────────────────────────────────────────────
export default function AuctionRoom() {
  const toast = useToast();
  const { width } = useWindowSize();
  const mobile = isMobile(width);

  const authUser = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem('numismatic_user') || '{}'); }
    catch { return {}; }
  }, []);

  // State
  const [bidValue, setBidValue] = useState(0);
  const [currentBid, setCurrentBid] = useState(0);
  const [rankings, setRankings] = useState([]);
  const [confirmModal, setConfirmModal] = useState(false);
  const [timeMs, setTimeMs] = useState(10067689);
  const [bidPulse, setBidPulse] = useState(false);
  const [rowHover, setRowHover] = useState(null);
  const [ofertarHover, setOfertarHover] = useState(false);
  const [bidError, setBidError] = useState('');
  const bidPulseTimer = useRef(null);

  const [lots, setLots] = useState([]);
  const [activeLot, setActiveLot] = useState(null);
  const location = useLocation();

  const [lotSearch, setLotSearch] = useState('');

  const [bidLimit, setBidLimit]       = useState(null);
  const [limitModal, setLimitModal]   = useState(false);
  const [limitInput, setLimitInput]   = useState('');
  const [limitWarned, setLimitWarned] = useState(false);

  useEffect(() => {
    fetchAuctions()
      .then(data => {
        setLots(data);
        const firstLot = location.state?.lotId
          ? data.find(l => l.id === location.state?.lotId)
          : data[0];

        if (firstLot) {
          setActiveLot(firstLot);
          setCurrentBid(firstLot.currentBid || firstLot.startingBid);
          setBidValue((firstLot.currentBid || firstLot.startingBid) + 50);
          setRankings(buildRankings(firstLot, authUser.name));

          // Restaura límite guardado para este lote
          const savedLimit = localStorage.getItem(`auction_limit_${firstLot.id}`);
          if (savedLimit) {
            setBidLimit(Number(savedLimit));
          }
        }
      })
      .catch(() => toast.error('No se pudo cargar la sala de subastas. Verifique su conexión.'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeLot?.auctionDate) return;
    const diff = new Date(activeLot.auctionDate).getTime() - Date.now();
    setTimeMs(Math.max(0, diff));
  }, [activeLot]);

  // Countdown interval
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeMs(t => Math.max(0, t - 100));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!bidLimit || limitWarned) return;
    if (currentBid >= Number(bidLimit)) {
      setLimitWarned(true);
      toast.error(`⚠️ La puja actual (S/. ${currentBid.toLocaleString('es-PE')}) superó tu límite de S/. ${Number(bidLimit).toLocaleString('es-PE')}.`);
    }
  }, [currentBid, bidLimit]);

  // Countdown display values
  const totalHrs = Math.floor(timeMs / 3600000);
  const days = Math.floor(totalHrs / 24);
  const hrs  = totalHrs % 24;
  const mins = Math.floor((timeMs % 3600000) / 60000);
  const secs = Math.floor((timeMs % 60000) / 1000);
  const countdownDisplay = days > 0
    ? `${days}d  ${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}`
    : `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  const isUrgent = timeMs < 30 * 60 * 1000; // < 30 minutes

  // Bid handlers
  const handleOfertar = () => {
    if (bidValue <= currentBid) {
      setBidError(`La puja debe superar la actual (S/. ${currentBid.toLocaleString('es-PE')})`);
      return;
    }
    if (bidValue > currentBid * 3) {
      setBidError(`Puja muy alta. Máximo recomendado: S/. ${(currentBid * 3).toLocaleString('es-PE')}`);
      return;
    }

    // ← AÑADE ESTO:
    if (bidLimit && bidValue > Number(bidLimit)) {
      setBidError(`Tu puja supera tu límite configurado de S/. ${Number(bidLimit).toLocaleString('es-PE')}. Ajusta el límite primero.`);
      return;
    }

    setBidError('');
    setConfirmModal(true);
  };

  const handleConfirmBid = async () => {
    const placed = bidValue;
    setConfirmModal(false);
    try {
      // El servidor valida y devuelve el lote con su historial de pujas
      const updatedLot = await placeBidAPI(activeLot.id, placed, authUser.name || 'Anónimo');
      setActiveLot(updatedLot);
      setLots(prev => prev.map(l => (l.id === updatedLot.id ? updatedLot : l)));
      setCurrentBid(updatedLot.currentBid);
      setRankings(buildRankings(updatedLot, authUser.name));
      setBidValue(updatedLot.currentBid + 50);
      toast.success(`¡Puja de S/. ${placed.toLocaleString('es-PE')} registrada!`);
    } catch (err) {
      // Si el servidor rechaza, el estado local NO cambia: lo que ves es lo que hay
      toast.error(err.message || 'No se pudo registrar la puja.');
    }
  };

  const handleSelectLot = (lot) => {
    setActiveLot(lot);
    setCurrentBid(lot.currentBid || lot.startingBid);
    setBidValue((lot.currentBid || lot.startingBid) + 50);
    setBidError('');
    setRankings(buildRankings(lot, authUser.name));
    setLimitWarned(false);

    // Restaura límite guardado para este lote
    const savedLimit = localStorage.getItem(`auction_limit_${lot.id}`);
    setBidLimit(savedLimit ? Number(savedLimit) : null);
  };

  return (
    <AppLayout>
      {/* ═══════════════════════════════════════════════════════
          FIXED HEADER
      ═══════════════════════════════════════════════════════ */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: mobile ? 0 : 240,
          right: 0,
          height: 64,
          backgroundColor: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(196,198,208,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: mobile ? '0 16px 0 64px' : '0 24px',
          zIndex: 40,
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', 'Playfair Display', serif", fontSize: 28, fontWeight: 600, fontStyle: 'italic',
            color: C.navy,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          EL GRAN PODIO DE PUJA
        </h1>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Search — hidden on mobile */}
          {!mobile && (
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.5)',
                borderBottom: `2px solid ${C.outlineVar}`,
                padding: '6px 12px',
              }}
            >
              <input
                type="text"
                value={lotSearch}
                onChange={e => {
                  setLotSearch(e.target.value);
                  const q = e.target.value.toLowerCase();
                  if (!q) return;
                  const match = lots.find(l =>
                    l.coinName.toLowerCase().includes(q) ||
                    l.auctionHouse?.toLowerCase().includes(q) ||
                    l.coinMint?.toLowerCase().includes(q)
                  );
                  if (match) handleSelectLot(match);
                }}
                placeholder="Buscar en los anales..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontFamily: F.body,
                  fontSize: 16,
                  fontStyle: 'italic',
                  color: C.inkDark,
                  width: 240,
                }}
              />
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20, color: C.outline, marginLeft: 8 }}
              >
                history_edu
              </span>
            </div>
          )}

          {/* Balance button */}
          <button
            onClick={() => { setLimitInput(bidLimit || ''); setLimitModal(true); }}
            title="Configurar límite de puja automática"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              backgroundColor: bidLimit ? 'rgba(120,90,0,0.1)' : 'rgba(255,255,255,0.4)',
              border: bidLimit
                ? '1px solid rgba(120,90,0,0.4)'
                : '1px solid rgba(196,198,208,0.5)',
              padding: '6px 12px', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: C.gold }}>
              {bidLimit ? 'price_check' : 'account_balance_wallet'}
            </span>
            <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: C.inkDark }}>
              {bidLimit
                ? `Límite: S/. ${Number(bidLimit).toLocaleString('es-PE')}`
                : 'Sin límite'
              }
            </span>
            {bidLimit && (
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: C.gold }}>
                edit
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
      LOTS SELECTOR BAR
      ═══════════════════════════════════════════════════════ */}
      {lots.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 64,
          left: mobile ? 0 : 240,
          right: 0,
          zIndex: 35,
          backgroundColor: 'rgba(1,30,75,0.97)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255,223,156,0.15)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          overflowX: 'auto',
          height: 56,
        }}>
          <p style={{
            fontFamily: F.mono, fontSize: 9, color: 'rgba(255,223,156,0.5)',
            textTransform: 'uppercase', letterSpacing: '0.2em',
            whiteSpace: 'nowrap', marginRight: 20, flexShrink: 0,
          }}>
            Lotes activos
          </p>

          {lots.map((lot, i) => {
            const isActive = activeLot?.id === lot.id;
            const imgSrc = lot.imageUrl ? `http://localhost:3001${lot.imageUrl}` : null;
            const matchesSearch = lotSearch &&
              (lot.coinName.toLowerCase().includes(lotSearch.toLowerCase()) ||
              lot.auctionHouse?.toLowerCase().includes(lotSearch.toLowerCase()));
            return (
              <button
                key={lot.id}
                onClick={() => handleSelectLot(lot)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0 20px', height: '100%', flexShrink: 0,
                  background: isActive ? 'rgba(255,223,156,0.12)' : 'transparent',
                  border: 'none',
                  borderBottom: isActive ? `2px solid ${C.goldLight}` : '2px solid transparent',
                  borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                  cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: matchesSearch ? `inset 0 0 0 1px ${C.goldLight}` : 'none',
                }}
              >
                {/* Mini coin */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: C.coinBg, overflow: 'hidden',
                  border: isActive ? `1px solid ${C.goldLight}` : '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {imgSrc
                    ? <img src={imgSrc} alt={lot.coinName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span className="material-symbols-outlined" style={{ fontSize: 14, color: C.gold, fontVariationSettings: "'FILL' 1" }}>toll</span>
                  }
                </div>

                {/* Info */}
                <div style={{ textAlign: 'left' }}>
                  <p style={{
                    fontFamily: F.display, fontSize: 13, fontStyle: 'italic',
                    color: isActive ? C.goldLight : 'rgba(255,255,255,0.7)',
                    margin: 0, whiteSpace: 'nowrap', maxWidth: 160,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{lot.coinName}</p>
                  <p style={{
                    fontFamily: F.mono, fontSize: 9,
                    color: isActive ? 'rgba(255,223,156,0.7)' : 'rgba(255,255,255,0.35)',
                    margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    Base S/. {Number(lot.startingBid).toLocaleString()}
                  </p>
                </div>

                {/* Active dot */}
                {isActive && (
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: C.goldLight, flexShrink: 0,
                  }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          MAIN CONTENT (below fixed header)
      ═══════════════════════════════════════════════════════ */}
      <div 
        style={{
          marginTop: lots.length > 0 ? 120 : 64,
          padding: mobile ? 16 : 24,
          backgroundImage: 'radial-gradient(circle, #C8A96E 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: mobile ? 'column' : 'row',
          gap: mobile ? 24 : 32,
          alignItems: 'flex-start',
        }}
      >
        {/* ─────────────────────────────────────────────────────
            LEFT / CENTER COLUMN
        ───────────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 32,
          }}
        >
          {/* ── Central Specimen Card ── */}
          <section
            data-tutorial="auction-lot"
            className="mounted-card"
            style={{
              backgroundColor: C.cream,
              border: '1px solid rgba(0,0,0,0.05)',
              boxShadow:
                '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
              padding: 32,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Corner tabs */}
            <div className="corner-tab corner-tl" />
            <div className="corner-tab corner-tr" />
            <div className="corner-tab corner-bl" />
            <div className="corner-tab corner-br" />

            {/* Top section: coin + text */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: 32,
                alignItems: 'flex-start',
              }}
            >
              {/* Coin display circle */}
              <div
                style={{
                  width: mobile ? 180 : 256,
                  height: mobile ? 180 : 256,
                  borderRadius: '50%',
                  backgroundColor: C.coinBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.15)',
                  border: '1px solid rgba(0,0,0,0.05)',
                }}
              >
                {activeLot?.imageUrl
                  ? <img
                      src={`http://localhost:3001${activeLot.imageUrl}`}
                      alt={activeLot.coinName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  : <CoinImage
                      src={COIN_IMGS[0]}
                      alt="8 Escudos"
                      style={{ width: '80%', height: '80%', objectFit: 'contain', transition: 'transform 0.7s ease' }}
                    />
                }
              </div>

              {/* Text content */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                {/* Registry label */}
                <p
                  style={{
                    fontFamily: F.mono,
                    fontSize: 10,
                    color: C.outline,
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                    borderBottom: `1px dotted ${C.outlineVar}`,
                    paddingBottom: 8,
                    margin: 0,
                  }}
                >
                  {activeLot ? `Lote ${activeLot.id} · ${activeLot.auctionHouse}` : 'ENTRADA DE REGISTRO #4402'}
                </p>

                {/* Lot title */}
                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond', 'Playfair Display', serif", fontSize: 36, fontStyle: 'italic', fontWeight: 700,
                    color: C.navy,
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  {activeLot ? activeLot.coinName : '8 Escudos "La Libertad"'}
                </h2>

                {/* Description label */}
                <p
                  style={{
                    fontFamily: F.mono,
                    fontSize: 10,
                    color: C.outlineVar,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    margin: 0,
                  }}
                >
                  DESCRIPCION / NOTAS DE CAMPO
                </p>

                {/* Description text */}
                <p
                  style={{
                    fontFamily: F.body,
                    fontSize: 18,
                    fontStyle: 'italic',
                    color: 'rgba(36,26,7,0.8)',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {activeLot
                    ? `${activeLot.coinMint} · ${activeLot.coinYear} · Grado ${activeLot.coinGrade}${activeLot.notes ? ' — ' + activeLot.notes : ''}`
                    : 'Ceca de Lima, año de 1821. Una pieza que respira los albores de la emancipación.'
                  }
                </p>
              </div>
            </div>

            {/* Bottom control bar */}
            <div
              style={{
                borderTop: '1px dotted rgba(196,198,208,0.6)',
                paddingTop: 32,
                marginTop: 32,
              }}
            >
              {/* 3-column grid */}
              <div
                data-tutorial="auction-bid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 24,
                  marginBottom: 24,
                }}
              >
                {/* PUJA ACTUAL */}
                <div
                  style={{
                    padding: 16,
                    backgroundColor: 'rgba(255,242,223,0.5)',
                    borderBottom: `2px solid ${C.outlineVar}`,
                  }}
                >
                  <p
                    style={{
                      fontFamily: F.mono,
                      fontSize: 10,
                      color: C.outline,
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                      margin: '0 0 4px 0',
                    }}
                  >
                    PUJA ACTUAL
                  </p>
                  <p
                    style={{
                      fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, fontStyle: 'normal',
                      color: C.navy,
                      margin: 0,
                    }}
                  >
                    S/. {Number(currentBid).toLocaleString('es-PE')}
                  </p>
                </div>

                {/* TU PUJA */}
                <div
                  style={{
                    padding: 16,
                    backgroundColor: 'white',
                    borderBottom: `2px solid ${C.gold}`,
                    transition: 'transform 0.15s',
                    position: 'relative',
                  }}
                >
                  <p style={{
                    fontFamily: F.mono, fontSize: 10, color: C.gold,
                    textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 4px 0',
                  }}>
                    TU PUJA
                    <span style={{ fontFamily: F.mono, fontSize: 8, color: C.outline,
                      marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>
                      (click para editar)
                    </span>
                  </p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{
                      fontFamily: "'Playfair Display', serif", fontSize: 26,
                      fontWeight: 700, color: C.gold,
                    }}>S/.</span>
                    <input
                      type="number"
                      value={bidValue}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setBidValue(val);
                        setBidPulse(true);
                        if (bidPulseTimer.current) clearTimeout(bidPulseTimer.current);
                        bidPulseTimer.current = setTimeout(() => setBidPulse(false), 400);

                        // Validación en tiempo real
                        if (val <= currentBid) {
                          setBidError(`La puja debe superar la actual (S/. ${currentBid.toLocaleString('es-PE')})`);
                        } else if (val > currentBid * 3) {
                          setBidError(`Puja muy alta. Máximo recomendado: S/. ${(currentBid * 3).toLocaleString('es-PE')}`);
                        } else if (bidLimit && val > Number(bidLimit)) {
                          setBidError(`Supera tu límite de S/. ${Number(bidLimit).toLocaleString('es-PE')}`);
                        } else {
                          setBidError('');
                        }
                      }}
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 26, fontWeight: 700,
                        color: bidValue <= currentBid ? '#ba1a1a' : C.gold,
                        border: 'none', outline: 'none',
                        background: 'transparent',
                        width: '100%',
                        transform: bidPulse ? 'scale(1.08)' : 'scale(1)',
                        transition: 'transform 0.15s, color 0.15s',
                        MozAppearance: 'textfield',
                      }}
                    />
                  </div>
                </div>

                {/* OFERTAR button */}
                <button
                  onClick={handleOfertar}
                  onMouseEnter={() => setOfertarHover(true)}
                  onMouseLeave={() => setOfertarHover(false)}
                  style={{
                    backgroundColor: C.navy,
                    color: C.goldLight,
                    fontFamily: F.mono,
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '16px 0',
                    filter: ofertarHover ? 'brightness(1.1)' : 'none',
                    transition: 'filter 0.15s',
                  }}
                >
                  OFERTAR
                </button>
              </div>

              {/* Range slider */}
              <input
                type="range"
                min={currentBid + 50}
                max={Math.max(currentBid * 2, currentBid + 1000)}
                step={50}
                value={bidValue}
                aria-label="Monto de tu puja en soles"
                aria-describedby="bid-error"
                onChange={e => {
                  setBidValue(parseInt(e.target.value));
                  setBidError('');
                  setBidPulse(true);
                  if (bidPulseTimer.current) clearTimeout(bidPulseTimer.current);
                  bidPulseTimer.current = setTimeout(() => setBidPulse(false), 400);
                }}
                style={{
                  width: '100%',
                  height: 6,
                  cursor: 'pointer',
                  accentColor: C.gold,
                  display: 'block',
                }}
              />

              {/* Slider labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.outline, fontStyle: 'italic' }}>
                  S/. {Number(currentBid).toLocaleString('es-PE')} PUJA ACTUAL
                </span>
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.outline, fontStyle: 'italic' }}>
                  S/. {Math.max(currentBid * 2, currentBid + 1000).toLocaleString()} PUJA MÁX.
                </span>
              </div>

              {/* Bid error */}
              {bidError && (
                <p id="bid-error" role="alert" style={{
                  color: '#ba1a1a', fontSize: 12,
                  fontFamily: F.mono,
                  marginTop: 6, display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>error</span>
                  {bidError}
                </p>
              )}
              {!bidError && <p id="bid-error" aria-hidden="true" style={{ margin: 0 }} />}
            </div>
          </section>

          {/* ── Curador Assistant ── */}
          <section
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 24,
              padding: 24,
              backgroundColor: 'rgba(255,255,255,0.4)',
              borderLeft: '4px solid rgba(120,90,0,0.5)',
            }}
          >
            {/* Wax seal avatar */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                flexShrink: 0,
                background:
                  'radial-gradient(circle, #b22222 0%, #8b0000 70%, #5e0000 100%)',
                boxShadow:
                  '4px 4px 10px rgba(0,0,0,0.4), inset 2px 2px 5px rgba(255,255,255,0.2)',
                border: `2px solid ${C.gold}`,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={CURATOR_IMG}
                alt="Arqueólogo Curador"
                style={{
                  mixBlendMode: 'overlay',
                  opacity: 0.9,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>

            {/* Speech bubble */}
            <div style={{ flex: 1, position: 'relative' }}>
              {/* CSS triangle pointer (left side) */}
              <div
                style={{
                  position: 'absolute',
                  top: 24,
                  left: -8,
                  width: 16,
                  height: 16,
                  backgroundColor: 'rgba(255,255,255,0.92)',
                  borderLeft: '1px solid rgba(0,0,0,0.05)',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                  transform: 'rotate(45deg)',
                  zIndex: 1,
                }}
              />
              <div
                style={{
                  position: 'relative',
                  backgroundColor: 'rgba(255,255,255,0.92)',
                  padding: 20,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  zIndex: 2,
                }}
              >
                {bidLimit && currentBid >= Number(bidLimit) && (
                  <p style={{
                    fontFamily: F.mono, fontSize: 10, color: '#ba1a1a',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>
                    Límite de puja superado — S/. {Number(bidLimit).toLocaleString('es-PE')}
                  </p>
                )}
                <p style={{
                  fontFamily: "'Cormorant Garamond', 'Playfair Display', serif", fontSize: 20, fontWeight: 600, fontStyle: 'italic',
                  color: C.navy,
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  {activeLot ? (
                    <>
                      &ldquo;Estimado coleccionista, el lote{' '}
                      <em>{activeLot.coinName}</em>{' '}
                      aguarda su veredicto.
                      {activeLot.auctionHouse && (
                        <> Presentado por <strong>{activeLot.auctionHouse}</strong>.</>
                      )}
                      {activeLot.auctionDate && (
                        <> Fecha de subasta:{' '}
                        <strong>{new Date(activeLot.auctionDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>.</>
                      )}
                      {activeLot.lotRef && (
                        <> Referencia de lote: <strong>{activeLot.lotRef}</strong>.</>
                      )}
                      {' '}Precio base registrado: <strong>S/. {Number(activeLot.startingBid).toLocaleString()}</strong>.
                      ¿Desea proceder con su oferta?&rdquo;
                    </>
                  ) : (
                    <>
                      &ldquo;Estimado coleccionista, la sala está inquieta. Una nueva oferta
                      ha sido registrada. ¿Desea proceder con un incremento manual o prefiere
                      el ajuste automático?&rdquo;
                    </>
                  )}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* ─────────────────────────────────────────────────────
            RIGHT COLUMN
        ───────────────────────────────────────────────────── */}
        <div
          style={{
            width: mobile ? '100%' : '40%',
            display: 'flex',
            flexDirection: 'column',
            gap: 32,
          }}
        >
          {/* ── Rankings table ── */}
          <section
            style={{
              backgroundColor: 'rgba(255,255,255,0.85)',
              border: '1px solid rgba(0,0,0,0.05)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              overflow: 'hidden',
            }}
          >
            {/* Header bar */}
            <div
              style={{
                backgroundColor: 'rgba(255,242,223,0.55)',
                padding: '16px 24px',
                borderBottom: '1px solid rgba(196,198,208,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20, color: C.gold }}
              >
                military_tech
              </span>
              <h3
                style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontStyle: 'italic', fontWeight: 600,
                  color: C.navy,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  margin: 0,
                }}
              >
                PUESTOS DE LA PUJA
              </h3>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['RANK', 'USUARIO', 'OFERTA'].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: '12px 16px',
                        fontFamily: F.mono,
                        fontSize: 10,
                        color: C.outline,
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        borderBottom: `1px dotted ${C.outlineVar}`,
                        textAlign: i === 2 ? 'right' : 'left',
                        fontWeight: 500,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rankings.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '28px 16px', textAlign: 'center', fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontStyle: 'italic', color: C.outline }}>
                      Aún no hay pujas registradas — sea el primero en ofertar.
                    </td>
                  </tr>
                )}
                {rankings.map(row => (
                  <tr
                    key={row.rank}
                    onMouseEnter={() => setRowHover(row.rank)}
                    onMouseLeave={() => setRowHover(null)}
                    style={{
                      backgroundColor: row.isUser
                        ? 'rgba(255,223,156,0.12)'
                        : rowHover === row.rank
                          ? 'rgba(1,30,75,0.04)'
                          : 'transparent',
                      borderBottom: row.isUser
                        ? '1px solid rgba(255,223,156,0.25)'
                        : `1px dotted rgba(196,198,208,0.5)`,
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <td
                      style={{
                        padding: '12px 16px',
                        fontFamily: "'Cormorant Garamond', serif", fontSize: 20,
                        fontWeight: row.isUser ? 700 : 400,
                        fontStyle: 'italic',
                        color: row.isUser ? C.navy : C.outline,
                      }}
                    >
                      #{row.rank}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontStyle: 'italic',
                          color: C.navy,
                          opacity: row.isUser ? 1 : 0.8,
                        }}
                      >
                        {row.user}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontFamily: F.mono,
                        fontSize: 14,
                        fontWeight: row.isUser ? 700 : 400,
                        fontStyle: row.isUser ? 'normal' : 'italic',
                        color: row.isUser
                          ? C.navy
                          : 'rgba(36,26,7,0.6)',
                      }}
                    >
                      S/. {Number(row.bid).toLocaleString('es-PE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* ── Countdown Timer ── */}
          <section
            style={{
              backgroundColor: C.navy,
              color: 'white',
              padding: 32,
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative',
              overflow: 'hidden',
              borderTop: `4px solid ${C.goldLight}`,
            }}
          >
            {/* Parchment overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
              }}
            />

            {/* Header row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                marginBottom: 8,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20, color: C.goldLight }}
              >
                schedule
              </span>
              <p
                style={{
                  fontFamily: F.mono,
                  fontSize: 11,
                  color: 'rgba(255,223,156,0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3em',
                  margin: 0,
                }}
              >
                TIEMPO RESTANTE
              </p>
            </div>

            {/* Countdown digits */}
            <div
              role="timer"
              aria-live="polite"
              aria-label={`Tiempo restante de subasta: ${hrs} horas ${mins} minutos ${secs} segundos`}
              style={{
                fontFamily: "'Playfair Display', serif", fontSize: 52, fontWeight: 700,
                color: isUrgent ? '#ba1a1a' : C.goldLight,
                letterSpacing: '0.1em',
                lineHeight: 1,
                position: 'relative',
                zIndex: 1,
                animation: isUrgent ? 'pulse 1s ease-in-out infinite' : 'none',
              }}
            >
              {countdownDisplay}
            </div>

            {/* Labels */}
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                justifyContent: 'center',
                gap: 40,
                position: 'relative',
                zIndex: 1,
              }}
            >
              {(days > 0 ? ['días', 'hrs.', 'min.'] : ['hrs.', 'min.', 'seg.']).map(label => (
                <span
                  key={label}
                  style={{
                    fontFamily: F.mono,
                    fontSize: 10,
                    color: 'rgba(255,223,156,0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </section>

          {/* ── Sello de Autenticidad ── */}
          <section
            style={{
              padding: 32,
              border: '2px dashed rgba(120,90,0,0.5)',
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 16,
              backgroundColor: 'rgba(255,255,255,0.45)',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)',
              position: 'relative',
            }}
          >
            {/* Wax seal circle */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, #b22222 0%, #8b0000 70%, #5e0000 100%)',
                boxShadow:
                  '4px 4px 10px rgba(0,0,0,0.4), inset 2px 2px 5px rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 32,
                  color: C.goldLight,
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                workspace_premium
              </span>
            </div>

            {/* Title */}
            <h4
              style={{
                fontFamily: F.display,
                fontSize: 14,
                color: C.navy,
                textTransform: 'uppercase',
                fontStyle: 'italic',
                letterSpacing: '0.1em',
                margin: 0,
              }}
            >
              Sello de Autenticidad
            </h4>

            {/* Quote */}
            <p
              style={{
                fontFamily: F.display,
                fontSize: 20,
                color: C.inkDark,
                fontStyle: 'italic',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              &ldquo;Certificado oficial de autenticidad numismática.&rdquo;
            </p>
          </section>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          CONFIRM MODAL
      ═══════════════════════════════════════════════════════ */}
      <Modal
        isOpen={confirmModal}
        onClose={() => setConfirmModal(false)}
        title="Confirmar Puja"
        onConfirm={handleConfirmBid}
        confirmText="Confirmar"
        cancelText="Cancelar"
      >
        <p
          style={{
            fontFamily: F.body,
            fontSize: 16,
            color: C.inkLight,
            lineHeight: 1.6,
            margin: '0 0 16px 0',
          }}
        >
          ¿Confirmar puja de{' '}
          <strong
            style={{
              fontFamily: F.mono,
              fontSize: 17,
              color: C.gold,
            }}
          >
            S/. {Number(bidValue).toLocaleString('es-PE')}
          </strong>{' '}
          para{' '}
          <em style={{ color: C.navy }}>{activeLot?.coinName || '8 Escudos "La Libertad"'}</em>?
        </p>
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(255,242,223,0.5)',
            borderBottom: `2px solid ${C.outlineVar}`,
          }}
        >
          <p
            style={{
              fontFamily: F.mono,
              fontSize: 10,
              color: C.outline,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: '0 0 4px 0',
            }}
          >
            Puja actual
          </p>
          <p
            style={{
              fontFamily: F.display,
              fontSize: 20,
              fontWeight: 700,
              color: C.navy,
              fontStyle: 'italic',
              margin: 0,
            }}
          >
            S/. {Number(currentBid).toLocaleString('es-PE')}
          </p>
        </div>
      </Modal>
      <Modal
        isOpen={limitModal}
        onClose={() => setLimitModal(false)}
        title="Límite de Puja Automática"
        onConfirm={() => {
          if (!limitInput || isNaN(limitInput) || Number(limitInput) <= 0) {
            toast.error('Ingrese un monto válido.');
            return;
          }
          const val = Number(limitInput);
          setBidLimit(val);
          setLimitWarned(false);
          setLimitModal(false);

          // Guarda en localStorage vinculado al lote activo
          if (activeLot) {
            localStorage.setItem(`auction_limit_${activeLot.id}`, String(val));
          }
          toast.success(`Límite configurado: S/. ${val.toLocaleString('es-PE')}`);
        }}
        confirmText="Confirmar Límite"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            padding: '12px 14px', background: 'rgba(120,90,0,0.05)',
            border: '1px solid rgba(120,90,0,0.2)', borderRadius: 4,
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: C.gold, flexShrink: 0 }}>info</span>
            <p style={{ fontFamily: F.mono, fontSize: 10, color: C.gold, margin: 0, lineHeight: 1.6 }}>
              El curador te avisará cuando la puja activa supere este monto. No es una puja automática — solo una alerta de control.
            </p>
          </div>

          <div>
            <label style={{
              fontFamily: F.mono, fontSize: 9, color: C.outline,
              textTransform: 'uppercase', letterSpacing: '0.15em',
              display: 'block', marginBottom: 6,
            }}>
              Monto límite (S/.)
            </label>
            <input
              className="form-input"
              type="number"
              value={limitInput}
              onChange={e => setLimitInput(e.target.value)}
              placeholder={`Puja actual: S/. ${currentBid.toLocaleString('es-PE')}`}
              autoFocus
            />
          </div>

          {bidLimit && (
            <button
              onClick={() => {
                setBidLimit(null);
                setLimitWarned(false);
                setLimitModal(false);
                if (activeLot) {
                  localStorage.removeItem(`auction_limit_${activeLot.id}`);
                }
              }}
              style={{
                padding: '8px 0', background: 'transparent',
                border: '1px solid rgba(186,26,26,0.3)', borderRadius: 3,
                cursor: 'pointer', fontFamily: F.mono, fontSize: 10,
                color: '#ba1a1a', textTransform: 'uppercase', letterSpacing: '0.08em',
              }}
            >
              Quitar límite
            </button>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
