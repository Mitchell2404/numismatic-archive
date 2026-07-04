import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import FloatingButtons from '../mascots/FloatingButtons.jsx';
import { useWindowSize, isDesktop } from '../../hooks/useWindowSize.js';

export default function AppLayout({ children }) {
  const { width } = useWindowSize();
  const desktop = isDesktop(width);
  const [sidebarOpen, setSidebarOpen] = useState(() => isDesktop(window.innerWidth));

  // Resincroniza al cruzar el breakpoint: en desktop el sidebar vuelve a
  // mostrarse; al achicar la ventana se oculta para no tapar el contenido.
  useEffect(() => {
    setSidebarOpen(desktop);
  }, [desktop]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f6f1eb',
      background: 'linear-gradient(160deg, #faf6f0 0%, #f0e9df 50%, #ebe0d4 100%)',
    }}>
      {/* Overlay al abrir sidebar en pantallas pequeñas */}
      {!desktop && sidebarOpen && (
        <div className="mobile-overlay visible" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Hamburger — siempre visible en la barra superior izquierda */}
      <button
        className="hamburger-btn"
        onClick={() => setSidebarOpen(v => !v)}
        title={sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
        aria-label={sidebarOpen ? 'Ocultar menú de navegación' : 'Mostrar menú de navegación'}
        style={{ display: 'flex' }}   /* anula el display:none del CSS */
      >
        <span className="material-symbols-outlined" style={{ color: '#ffdf9c', fontSize: 22 }}>
          {sidebarOpen ? 'menu_open' : 'menu'}
        </span>
      </button>

      {/* Contenido */}
      <div style={{
        marginLeft: sidebarOpen ? 240 : 0,
        transition: 'margin-left 0.3s ease',
      }}>
        {children}
      </div>

      <FloatingButtons />
    </div>
  );
}
