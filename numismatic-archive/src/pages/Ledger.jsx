import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { GRADE_DESCRIPTIONS } from '../data/mockData.js'; // ← CAMBIO: ya no importamos `coins`
import CoinImage from '../components/ui/CoinImage.jsx';
import { useWindowSize, isMobile, isTablet } from '../hooks/useWindowSize.js';
import { imageService } from '../services/imageService.js';
import { createSaleAPI, createAuctionAPI } from '../services/coinsService.js';
import {
  fetchCoins,
  createCoin,
  updateCoin,
  deleteCoin,
  uploadCoinImage,
} from '../services/coinsService.js';

const COIN_IMGS = [
  imageService.coin('coin-01.png'),
  imageService.coin('coin-02.png'),
  imageService.coin('coin-03.png'),
  imageService.coin('coin-04.png'),
];

const EMPTY_FORM = {
  name: '', year: '', mint: '', grade: 'MS-63',
  estimatedValue: '', status: 'active', description: '',
  imagePreview: null,  // base64 para la preview local
  imageFile: null,     // ← CAMBIO: File object para subir al servidor
};

const STATUS_OPTIONS = ['all', 'active', 'certified', 'sold'];
const STATUS_LABELS  = { all: 'Todos', active: 'Activa', certified: 'Certificada', sold: 'Vendida' };

// Enriquece las monedas con una imagen de fallback si no tienen imageUrl
function enrichCoin(coin, index = 0) {
  return {
    ...coin,
    img: COIN_IMGS[index % COIN_IMGS.length],
    private: coin.private ?? false,
  };
}

// ─── Corner tab helper ─────────────────────────────────────────────────────────
function CornerTabs({ active }) {
  const base = {
    position: 'absolute', width: 20, height: 20,
    border: '1px solid rgba(0,0,0,0.1)',
    background: active ? 'rgba(120,90,0,0.18)' : 'rgba(255,255,255,0.4)',
    backdropFilter: 'blur(1px)',
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

// ─── Coin Card (grid view) ─────────────────────────────────────────────────────
function CoinCard({ coin, isSelected, onClick, onDelete, onPrivate, onUnlock, isFirst }) {
  const [hovered, setHovered] = useState(false);
  const isPrivate = coin.private === true;
  // ← CAMBIO: la imagen ahora puede venir de imageUrl (servidor) o imagePreview (base64 temporal)
  const imgSrc = coin.imagePreview || (coin.imageUrl ? `http://localhost:3001${coin.imageUrl}` : null);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#f4ece1', padding: 10, position: 'relative',
        border: isSelected ? '2px solid #785a00' : '1px solid rgba(0,0,0,0.07)',
        boxShadow: isSelected
          ? '0 8px 24px rgba(0,0,0,0.15)'
          : hovered ? '0 6px 18px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.07)',
        borderRadius: 4, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        transition: 'all 0.2s',
        transform: isSelected || hovered ? 'translateY(-3px)' : 'none',
      }}
    >
      <CornerTabs active={isSelected} />

      {coin.status === 'certified' && (
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
          <span style={{
            border: '2px solid #8e0000', color: '#8e0000',
            padding: '2px 8px', textTransform: 'uppercase', fontWeight: 'bold',
            display: 'inline-block', transform: 'rotate(-5deg)', opacity: 0.8,
            fontFamily: "'JetBrains Mono', monospace", borderRadius: 2, fontSize: 9,
          }}>CERTIFICADA</span>
        </div>
      )}

      {isPrivate && (
        <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10 }}>
          <span style={{
            backgroundColor: 'rgba(0,0,0,0.55)', color: 'white',
            padding: '2px 7px', fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase',
            borderRadius: 2, display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 10 }}>lock</span>
            PRIVADA
          </span>
        </div>
      )}

      <div style={{
        width: '90%', aspectRatio: '1 / 1', flexShrink: 0,
        backgroundColor: '#e8dfd1', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.06)',
        alignSelf: 'center', position: 'relative',
      }}>
        {imgSrc ? (
          <img src={imgSrc} alt={coin.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <CoinImage src={coin.img} alt={coin.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {isPrivate && (
          <div style={{
            position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.72)',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', backdropFilter: 'blur(3px)',
          }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 28, color: 'rgba(0,0,0,0.35)', fontVariationSettings: "'FILL' 1",
            }}>lock</span>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', width: '100%' }}>
        <h3 style={{
          fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
          fontSize: 18, fontStyle: 'italic', fontWeight: 700, color: '#011e4b',
          margin: '0 0 8px', lineHeight: 1.3,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', padding: '0 4px',
        }}>{coin.name}</h3>

        <div data-tutorial={isFirst ? 'ledger-actions' : undefined}
          style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          <ActionBtn icon="visibility" title="Ver detalle" label="Ver detalle de la pieza"
            onClick={e => { e.stopPropagation(); onClick(); }} />
          <ActionBtn
            icon={isPrivate ? 'lock_open' : 'lock'}
            title={isPrivate ? 'Hacer pública' : 'Marcar como privada'}
            label={isPrivate ? 'Desbloquear pieza' : 'Privatizar pieza'}
            active={isPrivate}
            onClick={e => { e.stopPropagation(); isPrivate ? onUnlock(coin) : onPrivate(coin); }}
          />
          <ActionBtn icon="delete" title="Eliminar pieza" label="Eliminar pieza del inventario"
            danger onClick={e => { e.stopPropagation(); onDelete(coin); }} />
        </div>
      </div>
    </div>
  );
}

// ─── Coin Row (list view) ──────────────────────────────────────────────────────
function CoinRow({ coin, isSelected, onClick, onDelete, onPrivate, onUnlock }) {
  const [hovered, setHovered] = useState(false);
  const isPrivate = coin.private === true;
  const imgSrc = coin.imagePreview || (coin.imageUrl ? `http://localhost:3001${coin.imageUrl}` : null);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '10px 14px',
        background: isSelected ? 'rgba(120,90,0,0.08)' : hovered ? 'rgba(120,90,0,0.04)' : 'rgba(255,255,255,0.5)',
        border: isSelected ? '1px solid rgba(120,90,0,0.4)' : '1px solid rgba(0,0,0,0.06)',
        borderRadius: 4, cursor: 'pointer', transition: 'all 0.15s',
        borderLeft: isSelected ? '3px solid #785a00' : '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
        overflow: 'hidden', background: '#e8dfd1',
        boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.1)',
      }}>
        {imgSrc
          ? <img src={imgSrc} alt={coin.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <CoinImage src={coin.img} alt={coin.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
          fontSize: 15, fontStyle: 'italic', color: '#011e4b',
          margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{coin.name}</p>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: '#757780', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>{coin.mint} · {coin.year} · {coin.grade}</p>
      </div>

      <p style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
        color: '#785a00', fontWeight: 700, margin: 0, whiteSpace: 'nowrap',
      }}>${coin.estimatedValue?.toLocaleString()}</p>

      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <ActionBtn icon="visibility" title="Ver detalle" label="Ver detalle"
          onClick={() => onClick()} small />
        <ActionBtn icon={isPrivate ? 'lock_open' : 'lock'}
          title={isPrivate ? 'Hacer pública' : 'Privatizar'}
          label={isPrivate ? 'Desbloquear' : 'Privatizar'}
          active={isPrivate} onClick={() => isPrivate ? onUnlock(coin) : onPrivate(coin)} small />
        <ActionBtn icon="delete" title="Eliminar" label="Eliminar pieza"
          danger onClick={() => onDelete(coin)} small />
      </div>
    </div>
  );
}

// ─── Botón de acción reutilizable ──────────────────────────────────────────────
function ActionBtn({ icon, title, label, onClick, danger = false, active = false, small = false }) {
  const [hov, setHov] = useState(false);
  const size = small ? 28 : 32;
  return (
    <button
      onClick={onClick} title={title} aria-label={label}
      onMouseOver={() => setHov(true)} onMouseOut={() => setHov(false)}
      style={{
        width: size, height: size,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 4,
        border: danger
          ? `1px solid ${hov ? 'rgba(186,26,26,0.6)' : 'rgba(186,26,26,0.3)'}`
          : active ? '1px solid rgba(120,90,0,0.5)'
          : `1px solid ${hov ? 'rgba(1,30,75,0.5)' : 'rgba(1,30,75,0.25)'}`,
        background: danger
          ? (hov ? 'rgba(186,26,26,0.1)' : 'rgba(255,255,255,0.55)')
          : active
            ? (hov ? 'rgba(254,209,108,0.45)' : 'rgba(254,209,108,0.25)')
            : (hov ? 'rgba(1,30,75,0.07)' : 'rgba(255,255,255,0.55)'),
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <span className="material-symbols-outlined" style={{
        fontSize: small ? 14 : 16,
        color: danger ? '#ba1a1a' : active ? '#785a00' : '#011e4b',
        fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
      }}>{icon}</span>
    </button>
  );
}

// ─── Empty velvet slot ─────────────────────────────────────────────────────────
function EmptySlot({ label }) {
  return (
    <div style={{
      background: '#2d0a0a', border: '4px solid #3d1a1a', borderRadius: 12,
      boxShadow: 'inset 0 2px 16px rgba(0,0,0,0.5)', opacity: 0.55,
      aspectRatio: '3/4', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,0,0,0.4)',
        border: '2px dashed rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'rgba(255,255,255,0.1)' }}>add</span>
      </div>
      <p style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        color: 'rgba(255,255,255,0.25)', marginTop: 16,
        textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: 'center',
      }}>{label}</p>
    </div>
  );
}

// ─── Detail Panel ──────────────────────────────────────────────────────────────
function DetailPanel({ coin, onEdit, onSell, onAuction }) {
  if (!coin) {
    return (
      <aside style={{
        width: 420, backgroundColor: '#fafaf9',
        borderLeft: '1px solid rgba(196,179,145,0.25)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
        height: '100%',
        position: 'absolute',
        right: 0, top: 0, bottom: 0,
      }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'rgba(120,90,0,0.2)', display: 'block', marginBottom: 16 }}>menu_book</span>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(120,90,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            Seleccione una pieza
          </p>
        </div>
      </aside>
    );
  }

  // ← CAMBIO: construye la URL de la imagen correctamente
  const imgSrc = coin.imagePreview || (coin.imageUrl ? `http://localhost:3001${coin.imageUrl}` : coin.img);

  return (
    <aside style={{
      width: 420, backgroundColor: '#fafaf9',
      borderLeft: '1px solid rgba(196,179,145,0.25)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
      position: 'absolute', inset: 0,   // ← ESTO
    }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, minHeight: 0 }} className="custom-scrollbar">
        <div style={{
          aspectRatio: '1/1', backgroundColor: '#f0e8d8',
          border: '1px solid rgba(196,198,208,0.5)', padding: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          position: 'relative', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          <img src={imgSrc} alt={coin.name}
            style={{ width: '100%', height: '100%', objectFit: coin.imageUrl ? 'cover' : 'contain', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))' }} />
          <button onClick={() => onEdit(coin)} title="Editar pieza" aria-label="Editar datos de la pieza"
            style={{
              position: 'absolute', top: 12, left: 12, width: 36, height: 36,
              borderRadius: '50%', background: 'rgba(1,30,75,0.75)', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)', transition: 'background 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(1,30,75,0.95)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(1,30,75,0.75)'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#ffdf9c' }}>edit</span>
          </button>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.85)', padding: 24,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.05)', position: 'relative',
        }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
            fontSize: 22, fontStyle: 'italic', color: '#011e4b', margin: '0 0 6px',
          }}>{coin.name}</h2>
          <p style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: '#757780', textTransform: 'uppercase', letterSpacing: '0.2em',
            marginBottom: 20, paddingBottom: 8, borderBottom: '1px dotted #c4c6d0',
          }}>Ref: {coin.id}</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
            {[
              { label: 'ORIGEN', value: coin.mint },
              { label: 'AÑO/ERA', value: coin.year },
              { label: 'GRADO', value: coin.grade },
              { label: 'ESTADO', value: coin.status === 'certified' ? 'Certificada' : coin.status === 'sold' ? 'Vendida' : 'Activa' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontFamily: "'JetBrains Mono'", fontSize: 9, color: '#b0a898', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2 }}>{label}</p>
                <p style={{ fontFamily: "'Inter'", fontSize: 13, color: '#241a07', fontWeight: 600, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          {coin.description && (
            <div style={{ paddingTop: 14, marginTop: 14, borderTop: '1px dotted #c4c6d0' }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, 
                textTransform: 'uppercase', letterSpacing: '0.1em', color: '#785a00', marginBottom: 3 }}>
                Descripción
              </p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#241a07', 
                lineHeight: 1.6, margin: 0 }}>
                {coin.description}
              </p>
            </div>
          )}

          <div style={{
            background: 'rgba(120,90,0,0.05)', border: '1px solid rgba(120,90,0,0.2)',
            borderRadius: 4, padding: 14, marginTop: 18,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#757780', textTransform: 'uppercase', marginBottom: 4 }}>TASACIÓN ACTUAL</p>
              <p style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#785a00', margin: 0 }}>
                ${coin.estimatedValue?.toLocaleString()}
              </p>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#785a00' }}>workspace_premium</span>
          </div>
        </div>
      </div>

      <div style={{
        padding: '16px 20px', borderTop: '1px solid rgba(196,198,208,0.3)',
        background: 'rgba(243,224,192,0.8)', display: 'flex', gap: 12, flexShrink: 0,
      }}>
        <button
          onClick={onSell}
          disabled={coin.status === 'sold'}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '11px 0',
            border: '1px solid #011e4b',
            color: coin.status === 'sold' ? '#b0a898' : '#011e4b',
            background: coin.status === 'sold' ? 'rgba(0,0,0,0.04)' : 'transparent',
            cursor: coin.status === 'sold' ? 'not-allowed' : 'pointer',
            borderRadius: 2,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
            opacity: coin.status === 'sold' ? 0.5 : 1,
          }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            {coin.status === 'sold' ? 'sell' : 'edit_note'}
          </span>
          {coin.status === 'sold' ? 'VENDIDA' : 'VENDER'}
        </button>

        <button
          onClick={onAuction}
          disabled={coin.status === 'sold'}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '11px 0',
            border: 'none',
            color: coin.status === 'sold' ? '#b0a898' : '#ffdf9c',
            background: coin.status === 'sold' ? 'rgba(1,30,75,0.3)' : '#011e4b',
            cursor: coin.status === 'sold' ? 'not-allowed' : 'pointer',
            borderRadius: 2,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
            boxShadow: coin.status === 'sold' ? 'none' : '0 4px 12px rgba(1,30,75,0.3)',
            opacity: coin.status === 'sold' ? 0.5 : 1,
          }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>gavel</span>
          SUBASTAR
        </button>
      </div>
    </aside>
  );
}

function FilterBar({ activeStatus, setActiveStatus, onClose, buttonRef }) {
  const STATUS_ONLY = STATUS_OPTIONS.filter(s => s !== 'all');

  const toggle = (s) => {
    setActiveStatus(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  return (
    <div style={{
      position: 'absolute',
      top: buttonRef?.current
        ? buttonRef.current.offsetTop + buttonRef.current.offsetHeight + 8
        : 76,
      left: buttonRef?.current ? buttonRef.current.offsetLeft : 24,
      zIndex: 30,
      background: '#ffffff',
      border: '1px solid rgba(196,179,145,0.4)',
      borderRadius: 10, padding: 16, minWidth: 220,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#757780', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>
          FILTRAR POR ESTADO
        </p>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#757780', display: 'flex', padding: 2 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {STATUS_ONLY.map(s => {
          const checked = activeStatus.includes(s);
          return (
            <button key={s} onClick={() => toggle(s)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              background: checked ? 'rgba(120,90,0,0.1)' : 'transparent',
              border: checked ? '1px solid rgba(120,90,0,0.3)' : '1px solid transparent',
              borderRadius: 3, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
            }}>
              <div style={{
                width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                border: checked ? '2px solid #785a00' : '2px solid #c4c6d0',
                background: checked ? '#785a00' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
                {checked && <span className="material-symbols-outlined" style={{ fontSize: 10, color: 'white', fontVariationSettings: "'FILL' 1" }}>check</span>}
              </div>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                color: checked ? '#785a00' : '#44474f',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>{STATUS_LABELS[s]}</span>
            </button>
          );
        })}
      </div>
      {activeStatus.length > 0 && (
        <button onClick={() => setActiveStatus([])} style={{
          marginTop: 12, width: '100%', padding: '6px 0',
          background: 'transparent', border: '1px solid rgba(186,26,26,0.3)',
          borderRadius: 3, cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: '#ba1a1a', textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

// ─── Image Upload Field ────────────────────────────────────────────────────────
function ImageUploadField({ preview, onChange }) {
  const fileRef = useRef(null);

  // ← CAMBIO: guarda tanto el base64 (preview) como el File object
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result, file); // pasa ambos
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="form-label">Imagen de la pieza</label>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

      {preview ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            overflow: 'hidden', flexShrink: 0,
            border: '2px solid rgba(120,90,0,0.3)',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.1)',
          }}>
            <img src={preview} alt="Vista previa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={() => fileRef.current?.click()} style={{
              padding: '6px 14px', background: 'transparent',
              border: '1px solid rgba(1,30,75,0.35)', borderRadius: 3,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: '#011e4b', cursor: 'pointer',
            }}>Cambiar imagen</button>
            <button onClick={() => onChange(null, null)} style={{
              padding: '6px 14px', background: 'transparent',
              border: '1px solid rgba(186,26,26,0.3)', borderRadius: 3,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: '#ba1a1a', cursor: 'pointer',
            }}>Quitar imagen</button>
          </div>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()} style={{
          width: '100%', padding: '20px 0',
          border: '2px dashed rgba(120,90,0,0.25)',
          borderRadius: 4, background: 'rgba(120,90,0,0.02)',
          cursor: 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 8, transition: 'all 0.15s',
        }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(120,90,0,0.06)'; e.currentTarget.style.borderColor = 'rgba(120,90,0,0.4)'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(120,90,0,0.02)'; e.currentTarget.style.borderColor = 'rgba(120,90,0,0.25)'; }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'rgba(120,90,0,0.4)' }}>add_photo_alternate</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#785a00', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Subir fotografía
          </span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#757780' }}>
            JPG, PNG o WEBP — máx. 5 MB
          </span>
        </button>
      )}
    </div>
  );
}

// ─── Main Ledger page ──────────────────────────────────────────────────────────
export default function Ledger() {
  const toast = useToast();
  const { width } = useWindowSize();
  const mobile = isMobile(width);
  const tablet = isTablet(width);

  const [panelOpen, setPanelOpen]   = useState(true);
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [search, setSearch]         = useState('');
  const [viewMode, setViewMode]     = useState('grid');
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState([]);

  const [deleteModal, setDeleteModal]   = useState(null);
  const [privateModal, setPrivateModal] = useState(null);
  const [unlockModal, setUnlockModal]   = useState(null);
  const [addModal, setAddModal]         = useState(false);
  const [newCoin, setNewCoin]           = useState(EMPTY_FORM);
  const [editModal, setEditModal]       = useState(null);
  const [saving, setSaving]             = useState(false);
  const filterBtnRef = useRef(null);

  const [sellModal, setSellModal]    = useState(false);
  const [auctionModal, setAuctionModal] = useState(false);

  const navigate = useNavigate();

  const EMPTY_SELL_FORM = { buyer: '', salePrice: '', date: '', paymentMethod: 'Transferencia Bancaria', notes: '' };
  const [sellForm, setSellForm] = useState(EMPTY_SELL_FORM);

  const EMPTY_AUCTION_FORM = {
    auctionHouse: '', startingBid: '', auctionDate: '', lotRef: '', notes: ''
  };
  const [auctionForm, setAuctionForm] = useState(EMPTY_AUCTION_FORM);

  // ← CAMBIO: carga las monedas desde el backend al montar
  useEffect(() => {
    fetchCoins()
      .then(data => setItems(data.map((c, i) => enrichCoin(c, i))))
      .catch(() => toast.error('No se pudo conectar con el servidor.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.mint.toLowerCase().includes(q);
    const matchStatus = activeStatus.length === 0 || activeStatus.includes(c.status);
    return matchSearch && matchStatus;
  });

  // ← CAMBIO: eliminar llama al backend
  const confirmDelete = async () => {
    const deleted = deleteModal;
    setDeleteModal(null);
    try {
      await deleteCoin(deleted.id);
      setItems(prev => prev.filter(c => c.id !== deleted.id));
      if (selected?.id === deleted.id) setSelected(null);
      toast.success(`"${deleted.name}" eliminada del inventario.`, {
        label: 'Deshacer',
        fn: async () => {
          // Re-crea la moneda en el servidor para deshacer
          try {
            const restored = await createCoin({
              name: deleted.name, year: deleted.year, mint: deleted.mint,
              grade: deleted.grade, estimatedValue: deleted.estimatedValue,
              status: deleted.status, description: deleted.description,
              imageUrl: deleted.imageUrl,
            });
            setItems(prev => [enrichCoin(restored, prev.length), ...prev]);
            toast.info('Eliminación deshecha.');
          } catch {
            toast.error('No se pudo deshacer la eliminación.');
          }
        },
      });
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ← CAMBIO: privatizar actualiza en el backend
  const confirmPrivate = async () => {
    const coin = privateModal;
    setPrivateModal(null);
    try {
      const updated = await updateCoin(coin.id, { private: true });
      setItems(prev => prev.map(c => c.id === coin.id ? enrichCoin({ ...c, ...updated }, 0) : c));
      if (selected?.id === coin.id) setSelected(p => ({ ...p, private: true }));
      toast.success(`"${coin.name}" marcada como privada.`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confirmUnlock = async () => {
    const coin = unlockModal;
    setUnlockModal(null);
    try {
      const updated = await updateCoin(coin.id, { private: false });
      setItems(prev => prev.map(c => c.id === coin.id ? enrichCoin({ ...c, ...updated }, 0) : c));
      if (selected?.id === coin.id) setSelected(p => ({ ...p, private: false }));
      toast.success(`"${coin.name}" ahora es pública.`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ← CAMBIO: editar sube la nueva imagen si cambió y luego guarda datos
  const handleEdit = async () => {
    if (!editModal.name || !editModal.year || !editModal.mint) {
      toast.error('Complete los campos obligatorios.');
      return;
    }
    setSaving(true);
    try {
      let imageUrl = editModal.imageUrl; // mantiene la URL existente por defecto

      // Si eligieron una imagen nueva (imageFile), subirla primero
      if (editModal.imageFile) {
        const { url } = await uploadCoinImage(editModal.imageFile);
        imageUrl = url;
      } else if (editModal.imagePreview === null) {
        // Usuario quitó la imagen
        imageUrl = null;
      }

      const updated = await updateCoin(editModal.id, {
        name: editModal.name, year: editModal.year, mint: editModal.mint,
        grade: editModal.grade, estimatedValue: editModal.estimatedValue,
        status: editModal.status, description: editModal.description,
        imageUrl,
      });

      const enriched = enrichCoin({ ...editModal, ...updated, imageUrl, imagePreview: null }, 0);
      setItems(prev => prev.map(c => c.id === editModal.id ? enriched : c));
      setSelected(enriched);
      setEditModal(null);
      toast.success(`"${updated.name}" actualizada.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ← CAMBIO: registrar sube la imagen primero y luego crea la moneda
  const handleRegister = async () => {
    if (!newCoin.name || !newCoin.year || !newCoin.mint) {
      toast.error('Complete los campos obligatorios (Nombre, Año, Casa Monetaria).');
      return;
    }
    setSaving(true);
    try {
      let imageUrl = null;

      // Si hay un File (imagen elegida), subirlo al servidor
      if (newCoin.imageFile) {
        const result = await uploadCoinImage(newCoin.imageFile);
        imageUrl = result.url;
      }

      const created = await createCoin({
        name: newCoin.name, year: newCoin.year, mint: newCoin.mint,
        grade: newCoin.grade, estimatedValue: newCoin.estimatedValue,
        status: newCoin.status, description: newCoin.description,
        imageUrl,
      });

      setItems(prev => [enrichCoin(created, 0), ...prev]);
      setAddModal(false);
      setNewCoin(EMPTY_FORM);
      toast.success(`"${created.name}" registrada en el inventario.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSell = async () => {
    if (!sellForm.buyer || !sellForm.salePrice) {
      toast.error('Complete los campos obligatorios (Comprador y Precio).');
      return;
    }
    setSaving(true);
    try {
      await updateCoin(selected.id, { status: 'sold' });
      setItems(prev => prev.map(c =>
        c.id === selected.id ? enrichCoin({ ...c, status: 'sold' }, 0) : c
      ));
      setSelected(prev => ({ ...prev, status: 'sold' }));
      const newSaleEntry = {
        id: `VTA-${Date.now()}`,
        coinId: selected.id,
        coinName: selected.name,
        buyer: sellForm.buyer,
        salePrice: Number(sellForm.salePrice),
        date: sellForm.date || new Date().toISOString().slice(0, 10),
        status: 'Completada',
        paymentMethod: sellForm.paymentMethod,
        notes: sellForm.notes,
        _key: Date.now(),
      };
      setSellModal(false);
      setSellForm(EMPTY_SELL_FORM);
      toast.success(`"${selected.name}" vendida. Redirigiendo a Ventas...`);
      await createSaleAPI({
        coinId: selected.id,
        coinName: selected.name,
        buyer: sellForm.buyer,
        salePrice: Number(sellForm.salePrice),
        date: sellForm.date || new Date().toISOString().slice(0, 10),
        status: 'Completada',
        paymentMethod: sellForm.paymentMethod,
        notes: sellForm.notes || '',
      });
      setTimeout(() => navigate('/sales', { state: { newSale: newSaleEntry } }), 800);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAuction = async () => {
    if (!auctionForm.auctionHouse || !auctionForm.startingBid) {
      toast.error('Complete los campos obligatorios (Casa de Subastas y Precio Base).');
      return;
    }
    setSaving(true);
    try {
      await updateCoin(selected.id, { status: 'certified' });
      setItems(prev => prev.map(c =>
        c.id === selected.id ? enrichCoin({ ...c, status: 'certified' }, 0) : c
      ));
      setSelected(prev => ({ ...prev, status: 'certified' }));

      await createAuctionAPI({
        coinId:       selected.id,
        coinName:     selected.name,
        coinGrade:    selected.grade,
        coinMint:     selected.mint,
        coinYear:     selected.year,
        imageUrl:     selected.imageUrl || null,
        auctionHouse: auctionForm.auctionHouse,
        startingBid:  Number(auctionForm.startingBid),
        auctionDate:  auctionForm.auctionDate,
        lotRef:       auctionForm.lotRef,
        notes:        auctionForm.notes,
      });

      setAuctionModal(false);
      setAuctionForm(EMPTY_AUCTION_FORM);
      toast.success(`"${selected.name}" registrada en subasta. Ingresa a Subasta para verla.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const gridCols = mobile ? 'repeat(1, 1fr)' : tablet ? 'repeat(2, 1fr)' : panelOpen ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)';

  return (
    <AppLayout>
      <div style={{ height: mobile ? 'auto' : '100vh', display: 'flex', overflow: mobile ? 'auto' : 'hidden' }}>
        <div style={{
          display: 'flex', flex: 1, overflow: mobile ? 'visible' : 'hidden',
          flexDirection: mobile ? 'column' : 'row', position: 'relative',
        }}>

          {/* ── LEFT: Grid / List ── */}
          <section style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            backgroundImage: 'radial-gradient(circle, #C8A96E 1px, transparent 1px)',
            backgroundSize: '24px 24px', backgroundColor: '#fff8f2',
            borderRight: mobile ? 'none' : '1px solid rgba(196,198,208,0.3)',
            overflow: 'hidden', position: 'relative',
          }}>

            {/* Top bar */}
            <div style={{
              height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: mobile ? `0 56px 0 16px` : '0 24px',
              background: 'rgba(255,242,223,0.5)', borderBottom: '1px solid rgba(196,198,208,0.4)',
              zIndex: 20, backdropFilter: 'blur(4px)', flexShrink: 0,
            }}>
              <div style={{ flex: 1, maxWidth: 480, position: 'relative', marginLeft: mobile ? 48 : 0 }}>
                <span className="material-symbols-outlined" style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: '#757780', fontSize: 20, pointerEvents: 'none',
                }}>history_edu</span>
                <input
                  type="text" placeholder="Buscar en el libro de registro..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', paddingLeft: 40, paddingRight: search ? 36 : 16,
                    paddingTop: 8, paddingBottom: 8,
                    background: 'rgba(255,255,255,0.5)', border: 'none',
                    borderBottom: '2px solid #c4c6d0',
                    fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#241a07',
                    outline: 'none', fontStyle: 'italic', boxSizing: 'border-box',
                  }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                    color: '#757780', display: 'flex', alignItems: 'center',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: mobile ? 6 : 10, marginLeft: 14 }}>
                {!mobile && (
                  <button ref={filterBtnRef} onClick={() => setFilterOpen(v => !v)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    border: filterOpen || activeStatus.length > 0
                      ? '1px solid rgba(120,90,0,0.5)' : '1px solid rgba(196,198,208,0.5)',
                    background: filterOpen || activeStatus !== 'all'
                      ? 'rgba(120,90,0,0.08)' : 'transparent',
                    cursor: 'pointer', borderRadius: 4,
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                    color: activeStatus.length > 0 ? '#785a00' : '#44474f',
                    transition: 'all 0.15s',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>filter_alt</span>
                    Filtrar
                    {activeStatus.length > 0 && (
                      <span style={{
                        background: '#785a00', color: 'white', borderRadius: '50%',
                        width: 16, height: 16, fontSize: 9, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                      }}>{activeStatus.length}</span>
                    )}
                  </button>
                )}

                {!mobile && (
                  <div style={{
                    display: 'flex', border: '1px solid rgba(196,198,208,0.5)',
                    borderRadius: 4, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                  }}>
                    {[{ mode: 'grid', icon: 'grid_view' }, { mode: 'list', icon: 'view_agenda' }].map(({ mode, icon }) => (
                      <button key={mode} onClick={() => setViewMode(mode)}
                        title={mode === 'grid' ? 'Vista en cuadrícula' : 'Vista en lista'}
                        style={{
                          padding: '6px 8px',
                          background: viewMode === mode ? '#785a00' : 'rgba(255,255,255,0.5)',
                          border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center',
                          color: viewMode === mode ? '#fff' : '#44474f',
                          transition: 'all 0.15s',
                        }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
                      </button>
                    ))}
                  </div>
                )}

                <button onClick={() => setAddModal(true)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: mobile ? '8px' : '8px 16px',
                  background: '#011e4b', color: '#ffffff', border: 'none',
                  cursor: 'pointer', borderRadius: 4,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                  {!mobile && 'REGISTRAR PIEZA'}
                </button>
              </div>
            </div>

            {activeStatus.length > 0 && (
              <div style={{
                padding: '6px 24px', background: 'rgba(120,90,0,0.06)',
                borderBottom: '1px solid rgba(120,90,0,0.15)',
                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
              }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#785a00', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Filtrando por:
                </span>
                {activeStatus.map(s => (
                  <span key={s} style={{
                    background: '#785a00', color: 'white', padding: '2px 10px',
                    borderRadius: 99, fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {STATUS_LABELS[s]}
                    <button onClick={() => setActiveStatus(prev => prev.filter(x => x !== s))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white',
                        display: 'flex', alignItems: 'center', padding: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span>
                    </button>
                  </span>
                ))}
                <button onClick={() => setActiveStatus([])} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#785a00', display: 'flex', alignItems: 'center', padding: 0,
                  fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                  Limpiar
                </button>
              </div>
            )}

            {filterOpen && !mobile && (
              <FilterBar
                activeStatus={activeStatus}
                setActiveStatus={setActiveStatus}
                onClose={() => setFilterOpen(false)}
                buttonRef={filterBtnRef}
              />
            )}

            {/* ← CAMBIO: spinner de carga */}
            <div style={{ flex: 1, overflowY: 'auto', padding: mobile ? 16 : 20 }} className="custom-scrollbar">
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 64 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#c4c6d0', animation: 'spin 1s linear infinite' }}>autorenew</span>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: 64, gap: 16, opacity: 0.6,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#757780' }}>search_off</span>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#757780', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>
                    No se encontraron piezas
                  </p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#757780', margin: 0, fontStyle: 'italic' }}>
                    {search ? 'Intente con otro término de búsqueda' : items.length === 0 ? 'Registre la primera pieza con el botón de arriba' : 'No hay piezas con ese estado'}
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <div data-tutorial="ledger-grid" style={{ display: 'grid', gridTemplateColumns: gridCols, gap: mobile ? 12 : 14 }}>
                  {filtered.map((coin, index) => (
                    <CoinCard
                      key={coin.id} coin={coin} isFirst={index === 0}
                      isSelected={selected?.id === coin.id}
                      onClick={() => setSelected(coin)}
                      onDelete={c => setDeleteModal(c)}
                      onPrivate={c => setPrivateModal(c)}
                      onUnlock={c => setUnlockModal(c)}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {filtered.map(coin => (
                    <CoinRow
                      key={coin.id} coin={coin}
                      isSelected={selected?.id === coin.id}
                      onClick={() => setSelected(coin)}
                      onDelete={c => setDeleteModal(c)}
                      onPrivate={c => setPrivateModal(c)}
                      onUnlock={c => setUnlockModal(c)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ── TOGGLE BUTTON ── */}
          {!mobile && (
            <button onClick={() => setPanelOpen(v => !v)}
              title={panelOpen ? 'Ocultar panel' : 'Mostrar detalle'}
              style={{
                position: 'absolute', right: panelOpen ? 420 : 0,
                top: '50%', transform: 'translateY(-50%)',
                zIndex: 20, width: 28, height: 52,
                backgroundColor: '#011e4b', border: 'none',
                borderRadius: '5px 0 0 5px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 2,
                boxShadow: '-2px 0 8px rgba(0,0,0,0.18)',
                transition: 'right 0.3s ease',
              }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#ffdf9c' }}>
                {panelOpen ? 'chevron_right' : 'chevron_left'}
              </span>
            </button>
          )}

          {/* ── RIGHT PANEL ── */}
          {mobile ? (
            selected && <div style={{ flexShrink: 0 }}><DetailPanel coin={selected} onEdit={c => setEditModal({ ...c })} onSell={c => setSellModal({ ...c })} onAuction={c => setAuctionModal({ ...c })} /></div>
          ) : (
            <div style={{
              width: panelOpen ? 420 : 0, minWidth: panelOpen ? 420 : 0,
              transition: 'width 0.3s ease, min-width 0.3s ease',
              overflow: 'hidden', position: 'relative', flexShrink: 0,
              alignSelf: 'stretch',
            }}>
              <DetailPanel coin={selected} onEdit={c => setEditModal({ ...c })} onSell={c => setSellModal({ ...c })} onAuction={c => setAuctionModal({ ...c })} />
            </div>
          )}
        </div>
      </div>

      {/* ── Modales ── */}
      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)}
        title="Eliminar Pieza" onConfirm={confirmDelete}
        confirmText="Eliminar del Inventario" confirmVariant="danger">
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: '#44474f', lineHeight: 1.6 }}>
          ¿Está seguro que desea eliminar <strong style={{ color: '#241a07' }}>"{deleteModal?.name}"</strong> del inventario? Esta acción puede deshacerse.
        </p>
      </Modal>

      <Modal isOpen={!!privateModal} onClose={() => setPrivateModal(null)}
        title="Privatizar Pieza" onConfirm={confirmPrivate}
        confirmText="Sí, marcar como privada" confirmVariant="warning">
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: '#44474f', lineHeight: 1.6 }}>
          <p>¿Desea marcar <strong style={{ color: '#241a07' }}>"{privateModal?.name}"</strong> como <strong>privada</strong>?</p>
          <div style={{ marginTop: 14, padding: '12px 16px', backgroundColor: '#fff2df', border: '1px solid rgba(120,90,0,0.25)', borderRadius: 4 }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#785a00', textTransform: 'uppercase', marginBottom: 4 }}>¿Qué ocurre?</p>
            <p style={{ fontSize: 13, color: '#44474f', margin: 0 }}>La imagen se ocultará con un velo y aparecerá marcada como PRIVADA.</p>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!unlockModal} onClose={() => setUnlockModal(null)}
        title="Hacer Pública la Pieza" onConfirm={confirmUnlock}
        confirmText="Sí, hacer pública">
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: '#44474f', lineHeight: 1.6 }}>
          <p>¿Desea hacer <strong>"{unlockModal?.name}"</strong> pública nuevamente?</p>
          <div style={{ marginTop: 14, padding: '12px 16px', backgroundColor: '#f0fff4', border: '1px solid rgba(26,107,46,0.25)', borderRadius: 4 }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#1a6b2e', textTransform: 'uppercase', marginBottom: 4 }}>¿Qué ocurre?</p>
            <p style={{ fontSize: 13, color: '#44474f', margin: 0 }}>La imagen volverá a ser visible y el velo de privacidad se eliminará.</p>
          </div>
        </div>
      </Modal>

      {/* ── Modal Registrar ── */}
      <Modal isOpen={addModal}
        onClose={() => { setAddModal(false); setNewCoin(EMPTY_FORM); }}
        title="Registrar Nueva Pieza"
        onConfirm={handleRegister}
        confirmText={saving ? 'Guardando...' : 'Registrar en el Archivo'}
        size="lg"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            {/* ← CAMBIO: onChange ahora recibe (base64, file) */}
            <ImageUploadField
              preview={newCoin.imagePreview}
              onChange={(base64, file) => setNewCoin(p => ({ ...p, imagePreview: base64, imageFile: file }))}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Nombre *</label>
            <input className="form-input" value={newCoin.name}
              onChange={e => setNewCoin(p => ({ ...p, name: e.target.value }))}
              placeholder="Ej: Real de a Ocho" />
          </div>
          <div>
            <label className="form-label">Año *</label>
            <input className="form-input" value={newCoin.year}
              onChange={e => setNewCoin(p => ({ ...p, year: e.target.value }))}
              placeholder="Ej: 1772" />
          </div>
          <div>
            <label className="form-label">Casa Monetaria *</label>
            <input className="form-input" value={newCoin.mint}
              onChange={e => setNewCoin(p => ({ ...p, mint: e.target.value }))}
              placeholder="Ej: Real Casa de Moneda" />
          </div>
          <div>
            <label className="form-label">Valor Estimado ($)</label>
            <input className="form-input" value={newCoin.estimatedValue}
              onChange={e => setNewCoin(p => ({ ...p, estimatedValue: e.target.value }))}
              placeholder="Ej: 5000" />
          </div>
          <div>
            <label className="form-label">Grado</label>
            <select className="form-input" value={newCoin.grade}
              onChange={e => setNewCoin(p => ({ ...p, grade: e.target.value }))}>
              {['MS-65','MS-64','MS-63','XF-45','EF-40','VF-30','F-15'].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Estado</label>
            <select className="form-input" value={newCoin.status}
              onChange={e => setNewCoin(p => ({ ...p, status: e.target.value }))}>
              <option value="active">Activa</option>
              <option value="certified">Certificada</option>
              <option value="sold">Vendida</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Descripción</label>
            <textarea className="form-input" rows={3} value={newCoin.description}
              onChange={e => setNewCoin(p => ({ ...p, description: e.target.value }))}
              placeholder="Descripción histórica y numismática de la pieza..."
              style={{ resize: 'vertical' }} />
          </div>
        </div>
      </Modal>

      {/* ── Modal Editar ── */}
      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)}
        title="Editar Pieza" onConfirm={handleEdit}
        confirmText={saving ? 'Guardando...' : 'Guardar cambios'}
        size="lg"
      >
        {editModal && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <ImageUploadField
                preview={editModal.imagePreview || (editModal.imageUrl ? `http://localhost:3001${editModal.imageUrl}` : null)}
                onChange={(base64, file) => setEditModal(p => ({ ...p, imagePreview: base64, imageFile: file }))}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Nombre *</label>
              <input className="form-input" value={editModal.name}
                onChange={e => setEditModal(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Año *</label>
              <input className="form-input" value={editModal.year}
                onChange={e => setEditModal(p => ({ ...p, year: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Casa Monetaria *</label>
              <input className="form-input" value={editModal.mint}
                onChange={e => setEditModal(p => ({ ...p, mint: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Valor Estimado ($)</label>
              <input className="form-input" value={editModal.estimatedValue}
                onChange={e => setEditModal(p => ({ ...p, estimatedValue: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Grado</label>
              <select className="form-input" value={editModal.grade}
                onChange={e => setEditModal(p => ({ ...p, grade: e.target.value }))}>
                {['MS-65','MS-64','MS-63','XF-45','EF-40','VF-30','F-15'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Estado</label>
              <select className="form-input" value={editModal.status}
                onChange={e => setEditModal(p => ({ ...p, status: e.target.value }))}>
                <option value="active">Activa</option>
                <option value="certified">Certificada</option>
                <option value="sold">Vendida</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Descripción</label>
              <textarea className="form-input" rows={3} value={editModal.description}
                onChange={e => setEditModal(p => ({ ...p, description: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>
          </div>
        )}
      </Modal>
      {/* ── Modal Vender ── */}
      <Modal isOpen={sellModal} onClose={() => { setSellModal(false); setSellForm(EMPTY_SELL_FORM); }}
        title="Registrar Venta" onConfirm={handleSell}
        confirmText={saving ? 'Registrando...' : 'Confirmar Venta'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            padding: '10px 14px', background: 'rgba(120,90,0,0.06)',
            border: '1px solid rgba(120,90,0,0.2)', borderRadius: 4,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#785a00',
          }}>
            {selected?.name} — Tasación: ${selected?.estimatedValue?.toLocaleString()}
          </div>
          <div>
            <label className="form-label">Comprador / Referencia *</label>
            <input className="form-input"
              value={sellForm.buyer}
              onChange={e => setSellForm(p => ({ ...p, buyer: e.target.value }))}
              placeholder="Nombre del comprador o institución" />
          </div>
          <div>
            <label className="form-label">Precio de Venta Final ($) *</label>
            <input className="form-input" type="number"
              value={sellForm.salePrice}
              onChange={e => setSellForm(p => ({ ...p, salePrice: e.target.value }))}
              placeholder={`Tasación: ${selected?.estimatedValue}`} />
          </div>
          <div>
            <label className="form-label">Fecha de Venta</label>
            <input className="form-input" type="date"
              value={sellForm.date}
              onChange={e => setSellForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Método de Pago</label>
            <select className="form-input"
              value={sellForm.paymentMethod}
              onChange={e => setSellForm(p => ({ ...p, paymentMethod: e.target.value }))}>
              <option>Transferencia Bancaria</option>
              <option>Transferencia Internacional</option>
              <option>Cheque Certificado</option>
              <option>Efectivo</option>
              <option>Depósito en Garantía</option>
            </select>
          </div>
          <div>
            <label className="form-label">Notas</label>
            <textarea className="form-input" rows={3}
              value={sellForm.notes}
              onChange={e => setSellForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Canal de venta, condiciones, observaciones..."
              style={{ resize: 'vertical' }} />
          </div>
          <div style={{
            padding: '10px 14px', background: 'rgba(26,107,46,0.06)',
            border: '1px solid rgba(26,107,46,0.2)', borderRadius: 4,
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#1a6b2e', flexShrink: 0 }}>info</span>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#1a6b2e', margin: 0, lineHeight: 1.5 }}>
              Al confirmar, la pieza cambiará a <strong>VENDIDA</strong> en el inventario y serás redirigido a Ventas con la transacción registrada.
            </p>
          </div>
        </div>
      </Modal>

      {/* ── Modal Subastar ── */}
      <Modal isOpen={auctionModal}
        onClose={() => { setAuctionModal(false); setAuctionForm(EMPTY_AUCTION_FORM); }}
        title="Registrar en Subasta" onConfirm={handleAuction}
        confirmText={saving ? 'Registrando...' : 'Confirmar Subasta'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            padding: '10px 14px', background: 'rgba(1,30,75,0.06)',
            border: '1px solid rgba(1,30,75,0.2)', borderRadius: 4,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#011e4b',
          }}>
            {selected?.name} · {selected?.grade} · Tasación: ${selected?.estimatedValue?.toLocaleString()}
          </div>
          <div>
            <label className="form-label">Casa de Subastas *</label>
            <input className="form-input"
              value={auctionForm.auctionHouse}
              onChange={e => setAuctionForm(p => ({ ...p, auctionHouse: e.target.value }))}
              placeholder="Ej: Christie's, Sotheby's, Stack's Bowers" />
          </div>
          <div>
            <label className="form-label">Precio Base ($) *</label>
            <input className="form-input" type="number"
              value={auctionForm.startingBid}
              onChange={e => setAuctionForm(p => ({ ...p, startingBid: e.target.value }))}
              placeholder={`Tasación: ${selected?.estimatedValue}`} />
          </div>
          <div>
            <label className="form-label">Fecha de Subasta</label>
            <input className="form-input" type="date"
              value={auctionForm.auctionDate}
              onChange={e => setAuctionForm(p => ({ ...p, auctionDate: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Lote / Referencia</label>
            <input className="form-input"
              value={auctionForm.lotRef}
              onChange={e => setAuctionForm(p => ({ ...p, lotRef: e.target.value }))}
              placeholder="Ej: Lote #142-B" />
          </div>
          <div>
            <label className="form-label">Notas</label>
            <textarea className="form-input" rows={3}
              value={auctionForm.notes}
              onChange={e => setAuctionForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Condiciones, estimados, observaciones..."
              style={{ resize: 'vertical' }} />
          </div>
          <div style={{
            padding: '10px 14px', background: 'rgba(1,30,75,0.04)',
            border: '1px solid rgba(1,30,75,0.15)', borderRadius: 4,
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#011e4b', flexShrink: 0 }}>info</span>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#011e4b', margin: 0, lineHeight: 1.5 }}>
              Al confirmar, la pieza cambiará a <strong>CERTIFICADA</strong> en el inventario y el lote quedará registrado en la sala de subastas.
            </p>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}