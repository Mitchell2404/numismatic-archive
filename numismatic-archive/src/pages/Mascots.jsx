import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { mascotsService } from '../services/mascotsService.js';
import { DS } from '../styles/tokens.js';
import { MASCOT_LIST } from '../context/MascotContext.jsx';
import { useWindowSize, isMobile, isTablet } from '../hooks/useWindowSize.js';

const RARITY_BADGE = {
  'Legendario': 'badge-gold',
  'Épico':      'badge-blue',
  'Raro':       'badge-green',
  'Común':      'badge-navy',
};

const RARITY_ICON = {
  'Legendario': 'auto_awesome',
  'Épico':      'military_tech',
  'Raro':       'diamond',
  'Común':      'shield',
};

// ── Estilo por tipo/rareza de guardián — cada rareza tiene su propio
//     color de acento, fondo con tinte y resplandor, coherentes con los
//     colores que ya usan los badges (gold/blue/green/navy) ──
const RARITY_STYLE = {
  'Legendario': {
    accent: '#785a00',
    wash:   'linear-gradient(150deg, rgba(254,209,108,0.4) 0%, #fff8f2 62%)',
    border: 'rgba(120,90,0,0.4)',
    glow:   'rgba(120,90,0,0.45)',
  },
  'Épico': {
    accent: '#2f5fd8',
    wash:   'linear-gradient(150deg, rgba(220,232,255,0.75) 0%, #fff8f2 62%)',
    border: 'rgba(47,95,216,0.35)',
    glow:   'rgba(47,95,216,0.4)',
  },
  'Raro': {
    accent: '#1a6b2e',
    wash:   'linear-gradient(150deg, rgba(208,245,217,0.75) 0%, #fff8f2 62%)',
    border: 'rgba(26,107,46,0.35)',
    glow:   'rgba(26,107,46,0.4)',
  },
  'Común': {
    accent: '#011e4b',
    wash:   'linear-gradient(150deg, rgba(1,30,75,0.09) 0%, #fff8f2 62%)',
    border: 'rgba(1,30,75,0.3)',
    glow:   'rgba(1,30,75,0.35)',
  },
};
const DEFAULT_RARITY_STYLE = RARITY_STYLE['Común'];

// ── Corner tabs helper (mismo patrón que Certification.jsx / Ledger.jsx) ──
function Corners() {
  const base = {
    position: 'absolute', width: 16, height: 16,
    border: '1px solid rgba(0,0,0,0.08)',
    background: 'rgba(120,90,0,0.06)',
    pointerEvents: 'none',
  };
  return (
    <>
      <div style={{ ...base, top: -1, left: -1, borderRight: 'none', borderBottom: 'none' }} />
      <div style={{ ...base, top: -1, right: -1, borderLeft: 'none', borderBottom: 'none' }} />
      <div style={{ ...base, bottom: -1, left: -1, borderRight: 'none', borderTop: 'none' }} />
      <div style={{ ...base, bottom: -1, right: -1, borderLeft: 'none', borderTop: 'none' }} />
    </>
  );
}

export default function Mascots() {
  const navigate = useNavigate();
  const toast = useToast();
  const { width } = useWindowSize();
  const mobile = isMobile(width);
  const tablet = isTablet(width);

  const [selectedId, setSelectedId] = useState(() => localStorage.getItem('numismatic_mascot') || null);
  const [pendingId, setPendingId]   = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rarityFilter, setRarityFilter] = useState('all');
  const [mascots, setMascots] = useState([]);

  // Catálogo real desde /api/mascots; con aviso si se usa la copia local
  useEffect(() => {
    mascotsService.getAll().then(({ data, fromFallback }) => {
      setMascots(data);
      if (fromFallback) toast.error('Sin conexión con el servidor: mostrando catálogo local de guardianes.');
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (id) => {
    setPendingId(id);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setSelectedId(pendingId);
    localStorage.setItem('numismatic_mascot', pendingId);
    setConfirmOpen(false);
    const mascot = mascots.find(m => m.id === pendingId);
    toast.success(`"${mascot?.name}" seleccionado como tu Guardián del Archivo.`);
  };

  const pendingMascot = mascots.find(m => m.id === pendingId);

  const RARITY_OPTIONS = ['all', 'Legendario', 'Épico', 'Raro', 'Común'];
  const filteredMascots = rarityFilter === 'all'
    ? mascots
    : mascots.filter(m => m.rarity === rarityFilter);

  const gridCols = mobile ? 'repeat(1, 1fr)' : tablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)';

  return (
    <AppLayout>
      {/* ── Header ── */}
      <div style={{
        padding: mobile ? '20px 16px' : '20px 32px',
        borderBottom: `1px solid ${DS.parchmentDim}`,
        display: 'flex', alignItems: mobile ? 'flex-start' : 'center',
        flexDirection: mobile ? 'column' : 'row',
        gap: mobile ? 8 : 0,
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,248,242,0.9)',
        position: 'sticky', top: 0, zIndex: 30, backdropFilter: 'blur(8px)',
      }}>
        <div>
          <div style={{ fontFamily: DS.fontMono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, color: DS.outline, marginBottom: 4 }}>
            Archivo › Mascotas
          </div>
          <h1 style={{ fontFamily: DS.fontDisplay, fontSize: mobile ? 24 : 28, fontWeight: 700, color: DS.navy, margin: 0, fontStyle: 'italic' }}>
            Guardianes del Archivo
          </h1>
        </div>
        <p style={{ fontFamily: DS.fontMono, fontSize: 10, letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase', color: DS.gold, margin: 0 }}>
          {filteredMascots.length} de {mascots.length} guardianes
        </p>
      </div>

      {/* ── Description ── */}
      <div style={{ padding: mobile ? '14px 16px' : '16px 32px', backgroundColor: DS.parchmentLow, borderBottom: `1px solid rgba(196,198,208,0.3)` }}>
        <p style={{ fontFamily: DS.fontBody, fontSize: 14, color: DS.inkLight, fontStyle: 'italic', margin: 0 }}>
          Selecciona tu guardián numismático. Cada mascota representa una tradición numismática única y te acompañará en el Archivo.
        </p>
      </div>

      {/* ── Rarity filter bar ── */}
      <div style={{
        padding: mobile ? '12px 16px' : '14px 32px',
        backgroundColor: DS.parchment,
        borderBottom: '1px solid rgba(196,198,208,0.25)',
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{ fontFamily: DS.fontMono, fontSize: 9, color: DS.outline, textTransform: 'uppercase', letterSpacing: '0.12em', marginRight: 4 }}>
          Filtrar:
        </span>
        {RARITY_OPTIONS.map(option => {
          const active = rarityFilter === option;
          return (
            <button
              key={option}
              onClick={() => setRarityFilter(option)}
              style={{
                padding: '5px 14px',
                borderRadius: 99,
                border: active ? `1px solid ${DS.gold}` : '1px solid rgba(196,198,208,0.5)',
                backgroundColor: active ? DS.gold : 'transparent',
                color: active ? DS.white : DS.inkLight,
                fontFamily: DS.fontMono, fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {option === 'all' ? 'Todos' : option}
            </button>
          );
        })}
      </div>

      {/* ── Grid ── */}
      <div style={{
        padding: mobile ? '20px 16px' : '32px',
        backgroundImage: 'radial-gradient(circle, #C8A96E 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        minHeight: 'calc(100vh - 220px)',
      }}>
        {filteredMascots.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: 64, gap: 12, opacity: 0.5,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: DS.outline }}>search_off</span>
            <p style={{ fontFamily: DS.fontMono, fontSize: 11, color: DS.outline, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Sin guardianes de esta rareza
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: mobile ? 16 : 24, maxWidth: 1040, margin: '0 auto' }}>
            {filteredMascots.map((mascot) => {
              const originalIndex = mascots.findIndex(m => m.id === mascot.id);
              const visual = MASCOT_LIST.find(v => v.id === mascot.id) || MASCOT_LIST[originalIndex % MASCOT_LIST.length];
              const isActive = selectedId === mascot.id;
              const rs = RARITY_STYLE[mascot.rarity] || DEFAULT_RARITY_STYLE;
              return (
                <div
                  key={mascot.id}
                  onClick={() => handleSelect(mascot.id)}
                  className={isActive ? 'active-mascot-card' : ''}
                  style={{
                    position: 'relative',
                    background: rs.wash,
                    border: isActive ? `2px solid ${rs.accent}` : `1px solid ${rs.border}`,
                    borderRadius: 8, padding: 28, cursor: 'pointer',
                    boxShadow: isActive ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                    transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
                    transform: isActive ? 'scale(1.015)' : 'scale(1)',
                    display: 'flex', flexDirection: 'column', gap: 14,
                    '--glow-color': rs.glow,
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = rs.accent;
                      e.currentTarget.style.boxShadow = `0 6px 20px ${rs.glow}`;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = rs.border;
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <Corners />

                  {/* Etiqueta "Guardián Actual" — solo en el elegido */}
                  {isActive && (
                    <div style={{
                      position: 'absolute', top: 18, left: -6, zIndex: 3,
                      background: rs.accent, color: '#ffffff',
                      fontFamily: DS.fontMono, fontSize: 8, fontWeight: 700,
                      letterSpacing: '0.14em', textTransform: 'uppercase',
                      padding: '4px 10px 4px 14px', borderRadius: '0 4px 4px 0',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    }}>
                      Guardián Actual
                    </div>
                  )}

                  {/* Selected checkmark */}
                  {isActive && (
                    <div style={{
                      position: 'absolute', top: -10, right: -10, width: 30, height: 30,
                      borderRadius: '50%', backgroundColor: rs.accent, color: DS.white,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.25)', border: `2px solid ${DS.parchmentLow}`,
                      zIndex: 2,
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 17, fontVariationSettings: "'FILL' 1" }}>check</span>
                    </div>
                  )}

                  {/* Country & Flag */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: DS.fontMono, fontSize: 9, letterSpacing: '0.14em', fontWeight: 700, textTransform: 'uppercase', color: rs.accent }}>
                      {visual.country}
                    </span>
                    <span style={{ fontSize: 18 }}>{visual.flag}</span>
                  </div>

                  {/* Image */}
                  <div style={{
                    aspectRatio: '1', backgroundColor: DS.cream, borderRadius: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', border: `1px solid ${isActive ? rs.accent : DS.outlineVar}`,
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.08)',
                    position: 'relative',
                  }}>
                    <img src={visual.imgUrl} alt={mascot.name} style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                    {/* Sello tipo "expediente" en la esquina de la imagen */}
                    <span style={{
                      position: 'absolute', bottom: 8, right: 8,
                      fontFamily: DS.fontMono, fontSize: 8,
                      color: 'rgba(36,26,7,0.35)', textTransform: 'uppercase',
                      letterSpacing: '0.1em', border: '1px solid rgba(36,26,7,0.2)',
                      padding: '1px 6px', borderRadius: 2, background: 'rgba(255,255,255,0.5)',
                    }}>
                      {mascot.id}
                    </span>
                  </div>

                  {/* Name & Symbol */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 6, lineHeight: 1 }}>{mascot.symbol}</div>
                    <h3 style={{ fontFamily: DS.fontDisplay, fontSize: 21, fontWeight: 700, color: isActive ? rs.accent : DS.navy, fontStyle: 'italic', margin: 0, marginBottom: 8 }}>
                      {mascot.name}
                    </h3>
                    <span className={`badge ${RARITY_BADGE[mascot.rarity] || 'badge-navy'}`} style={{
                      marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                        {RARITY_ICON[mascot.rarity] || 'shield'}
                      </span>
                      {mascot.rarity}
                    </span>
                    <p style={{ fontFamily: DS.fontBody, fontSize: 13, color: DS.inkLight, lineHeight: 1.5, margin: 0 }}>
                      {mascot.description}
                    </p>
                  </div>

                  {/* Select Button */}
                  <button
                    onClick={e => { e.stopPropagation(); handleSelect(mascot.id); }}
                    style={{
                      width: '100%', padding: '10px 0', marginTop: 4,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      backgroundColor: isActive ? rs.accent : 'transparent',
                      color: isActive ? DS.white : rs.accent,
                      border: `1px solid ${rs.accent}`,
                      borderRadius: 4, cursor: 'pointer',
                      fontFamily: DS.fontMono, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      transition: 'background-color 0.15s, color 0.15s',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 15, fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                      {isActive ? 'check_circle' : 'shield_person'}
                    </span>
                    {isActive ? 'Guardián Seleccionado' : 'Seleccionar Guardián'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Confirm Modal ── */}
      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirmar Guardián" onConfirm={handleConfirm} confirmText="Confirmar Selección">
        <div style={{ textAlign: 'center' }}>
          {pendingMascot && (
            <>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{pendingMascot.symbol}</div>
              <h3 style={{ fontFamily: DS.fontDisplay, fontSize: 22, fontWeight: 700, color: DS.navy, fontStyle: 'italic', marginBottom: 8 }}>
                {pendingMascot.name}
              </h3>
              <span className={`badge ${RARITY_BADGE[pendingMascot.rarity] || 'badge-navy'}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                  {RARITY_ICON[pendingMascot.rarity] || 'shield'}
                </span>
                {pendingMascot.rarity}
              </span>
              <p style={{ fontFamily: DS.fontBody, fontSize: 15, color: DS.inkLight, lineHeight: 1.6, marginBottom: 8 }}>
                {pendingMascot.description}
              </p>
              <p style={{ fontFamily: DS.fontMono, fontSize: 12, color: DS.outline, fontStyle: 'italic', marginTop: 16 }}>
                "{pendingMascot.personality}"
              </p>
            </>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}