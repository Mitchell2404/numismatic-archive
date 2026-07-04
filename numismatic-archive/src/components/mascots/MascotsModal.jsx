import React, { useState } from 'react';
import { mascots } from '../../data/mockData.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useMascot, MASCOT_LIST } from '../../context/MascotContext.jsx';

const RARITY_BADGE = {
  'Legendario': { background: '#fed16c', color: '#785a00' },
  'Épico':      { background: '#dbe8ff', color: '#0041a3' },
  'Raro':       { background: '#d4edda', color: '#1a6b2e' },
  'Común':      { background: '#e8e8e8', color: '#44474f' },
};

function MascotCard({ mascot, visual, isSelected, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const rarityStyle = RARITY_BADGE[mascot.rarity] || RARITY_BADGE['Común'];

  return (
    <div
      onClick={() => onSelect(mascot.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setBtnHovered(false); }}
      style={{
        backgroundColor: isSelected ? '#fff2df' : '#f4ece1',
        border: isSelected ? '2px solid #785a00' : hovered ? '1px solid rgba(120,90,0,0.4)' : '1px solid rgba(196,198,208,0.4)',
        boxShadow: isSelected ? '0 0 20px rgba(120,90,0,0.2)' : hovered ? '0 4px 16px rgba(120,90,0,0.1)' : '0 2px 6px rgba(0,0,0,0.06)',
        borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 12,
        cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
      }}
    >
      {isSelected && (
        <div style={{ position: 'absolute', top: -8, right: -8, width: 28, height: 28, borderRadius: '50%', backgroundColor: '#785a00', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', border: '2px solid #fff2df', zIndex: 2 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'white', fontVariationSettings: "'FILL' 1" }}>check</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.12em', fontWeight: 600, textTransform: 'uppercase', color: '#785a00' }}>{visual.country}</span>
        <span style={{ fontSize: 18 }}>{visual.flag}</span>
      </div>

      <div style={{ aspectRatio: '1', backgroundColor: '#f3e0c0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid rgba(196,198,208,0.4)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.06)' }}>
        {!imgError ? (
          <img src={visual.imgUrl} alt={mascot.name} onError={() => setImgError(true)} style={{ width: '80%', height: '80%', objectFit: 'contain', padding: 8 }} />
        ) : (
          <span style={{ fontSize: 40, lineHeight: 1 }}>{mascot.symbol}</span>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 4, lineHeight: 1 }}>{mascot.symbol}</div>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontStyle: 'italic', fontWeight: 700, color: isSelected ? '#785a00' : '#011e4b', margin: '0 0 6px' }}>{mascot.name}</h3>
        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: rarityStyle.background, color: rarityStyle.color }}>{mascot.rarity}</span>
      </div>

      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#44474f', lineHeight: 1.5, margin: 0 }}>{mascot.description}</p>

      <button
        onClick={e => { e.stopPropagation(); onSelect(mascot.id); }}
        onMouseEnter={() => setBtnHovered(true)}
        onMouseLeave={() => setBtnHovered(false)}
        style={{
          width: '100%', padding: '10px 0', marginTop: 4,
          backgroundColor: isSelected ? '#785a00' : btnHovered ? '#011e4b' : 'transparent',
          color: isSelected || btnHovered ? 'white' : '#785a00',
          border: '1px solid #785a00', borderRadius: 4, cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          transition: 'background-color 0.15s, color 0.15s',
        }}
      >
        {isSelected ? '✓ Guardián Seleccionado' : 'Seleccionar Guardián'}
      </button>
    </div>
  );
}

export default function MascotsModal({ isOpen, onClose }) {
  const toast = useToast();
  const { activeMascotId, setMascot } = useMascot();
  const [pendingId, setPendingId] = useState(null);
  const [confirming, setConfirming] = useState(false);

  if (!isOpen) return null;

  const handleSelect = (id) => {
    setPendingId(id);
    setConfirming(true);
  };

  const handleConfirm = () => {
    setMascot(pendingId);
    const mascot = mascots.find(m => m.id === pendingId);
    toast.success(`"${mascot?.name}" seleccionado como tu Guardián del Archivo.`);
    setConfirming(false);
    setPendingId(null);
  };

  const handleCancelConfirm = () => {
    setConfirming(false);
    setPendingId(null);
  };

  const pendingMascot = mascots.find(m => m.id === pendingId);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div onClick={e => e.stopPropagation()} style={{ maxWidth: 860, width: '95vw', maxHeight: '85vh', backgroundColor: 'white', border: '1px solid #c8a96e', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ backgroundColor: '#011e4b', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontStyle: 'italic', color: '#ffdf9c', margin: 0, lineHeight: 1.2 }}>Guardianes del Archivo</h2>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,223,156,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '4px 0 0' }}>Selecciona tu guardián numismático</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ffdf9c', fontSize: 28, lineHeight: 1, padding: 4, display: 'flex', alignItems: 'center' }}>×</button>
          </div>

          <div style={{ overflowY: 'auto', padding: 32, flex: 1, backgroundColor: '#faf6f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              {mascots.map((mascot, i) => {
                const visual = MASCOT_LIST.find(v => v.id === mascot.id) || MASCOT_LIST[i % MASCOT_LIST.length];
                return (
                  <MascotCard
                    key={mascot.id}
                    mascot={mascot}
                    visual={visual}
                    isSelected={activeMascotId === mascot.id}
                    onSelect={handleSelect}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {confirming && pendingMascot && (
        <div onClick={handleCancelConfirm} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', border: '1px solid #c8a96e', borderRadius: 8, padding: 32, maxWidth: 400, width: '90vw', textAlign: 'center' }}>
            {(() => {
              const pv = MASCOT_LIST.find(v => v.id === pendingMascot.id) || MASCOT_LIST[0];
              return (
                <div style={{ width: 100, height: 100, borderRadius: 8, backgroundColor: '#f3e0c0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', overflow: 'hidden', border: '1px solid rgba(196,198,208,0.4)' }}>
                  <img src={pv.imgUrl} alt={pendingMascot.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                    onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                  />
                  <span style={{ fontSize: 36, display: 'none' }}>{pendingMascot.symbol}</span>
                </div>
              );
            })()}
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontStyle: 'italic', fontWeight: 700, color: '#011e4b', margin: '0 0 8px' }}>{pendingMascot.name}</h3>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#44474f', lineHeight: 1.6, marginBottom: 24 }}>{pendingMascot.description}</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#757780', fontStyle: 'italic', marginBottom: 24 }}>"{pendingMascot.personality}"</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleCancelConfirm} style={{ flex: 1, padding: '10px 0', border: '1px solid #c4c6d0', background: 'transparent', borderRadius: 4, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#44474f' }}>Cancelar</button>
              <button onClick={handleConfirm} style={{ flex: 1, padding: '10px 0', border: 'none', background: '#011e4b', borderRadius: 4, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ffdf9c' }}>Confirmar Selección</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
