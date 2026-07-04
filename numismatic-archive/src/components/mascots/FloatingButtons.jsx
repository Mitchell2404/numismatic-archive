import React, { useState } from 'react';
import MascotsModal from './MascotsModal.jsx';
import CuratorBotModal from '../curator/CuratorBotModal.jsx';
import { useWindowSize, isMobile } from '../../hooks/useWindowSize.js';

export default function FloatingButtons() {
  const [mascotsOpen, setMascotsOpen] = useState(false);
  const [botOpen, setBotOpen] = useState(false);
  const { width } = useWindowSize();
  const mobile = isMobile(width);

  return (
    <>
      {/* Mascotas button 
      <button
        data-tutorial="mascot-btn"
        onClick={() => setMascotsOpen(true)}
        title="Guardianes del Archivo"
        aria-label="Abrir selector de Guardianes del Archivo"
        style={{
          position: 'fixed', right: mobile ? 12 : 24, top: mobile ? 70 : 80, zIndex: 60,
          width: mobile ? 44 : 56, height: mobile ? 44 : 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #d4af37, #a67c00, #785a00)',
          border: '2px solid #5b4300',
          boxShadow: '4px 4px 10px rgba(0,0,0,0.4), inset 2px 2px 4px rgba(255,255,255,0.2)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '6px 6px 16px rgba(0,0,0,0.5), inset 2px 2px 4px rgba(255,255,255,0.2)'; }}
        onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '4px 4px 10px rgba(0,0,0,0.4), inset 2px 2px 4px rgba(255,255,255,0.2)'; }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: mobile ? 22 : 26, color: '#ffdf9c', fontVariationSettings: "'FILL' 1" }}>travel_explore</span>
      </button> */}

      {/* Curator Bot button */}
      <button
        data-tutorial="curator-btn"
        onClick={() => setBotOpen(v => !v)}
        title="Consultar al Archivista Digital"
        aria-label="Abrir consulta al Archivista Digital"
        style={{
          position: 'fixed', right: mobile ? 12 : 24, bottom: mobile ? 28 : 32, zIndex: 60,
          width: mobile ? 48 : 64, height: mobile ? 48 : 64, borderRadius: '50%',
          background: 'linear-gradient(135deg, #cd7f32, #8b4513, #3e2723)',
          border: '2px solid #5d4037',
          boxShadow: '4px 4px 10px rgba(0,0,0,0.4), inset 2px 2px 5px rgba(255,255,255,0.2)',
          cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 2, transition: 'transform 0.2s',
        }}
        onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.08) rotate(5deg)'; }}
        onMouseOut={e => { e.currentTarget.style.transform = 'scale(1) rotate(0)'; }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: mobile ? 22 : 28, color: '#ffdf9c' }}>psychology</span>
      </button>

      {/* Label under bot button */}
      <div style={{ position: 'fixed', right: mobile ? 12 : 24, bottom: 4, zIndex: 60, textAlign: 'center', width: mobile ? 48 : 64 }}>
        <span style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', fontSize: 8, padding: '2px 6px', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>ARCHIVISTA</span>
      </div>

      <MascotsModal isOpen={mascotsOpen} onClose={() => setMascotsOpen(false)} />
      {botOpen && <CuratorBotModal onClose={() => setBotOpen(false)} />}
    </>
  );
}
