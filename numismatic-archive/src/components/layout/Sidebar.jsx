import React, { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal.jsx';
import { createPortal } from 'react-dom';

const NAV_BY_ROLE = {
  usuario: [
    { icon: 'newspaper',     label: 'NOTICIAS',        path: '/home' },
    { icon: 'inventory_2',   label: 'INVENTARIO',      path: '/ledger' },
    { icon: 'sell',          label: 'VENTAS',          path: '/sales' },
    { icon: 'verified',      label: 'CERTIFICACIONES', path: '/certification' },
    { icon: 'gavel',         label: 'SUBASTA',         path: '/auction' },
    { icon: 'mail',          label: 'MENSAJES',        path: '/messaging' },
    { icon: 'person_search', label: 'BUSCAR USUARIOS', path: '/search' },
    { icon: 'shield_person', label: 'MASCOTAS',        path: '/mascots' },
  ],
  certificador: [
    { icon: 'fact_check',    label: 'SOLICITUDES',     path: '/certifier' },
    { icon: 'mail',          label: 'MENSAJES',        path: '/messaging' },
    { icon: 'person_search', label: 'VER USUARIOS',    path: '/search' },
    { icon: 'shield_person', label: 'MASCOTAS',        path: '/mascots' },
  ],
  admin: [
    { icon: 'manage_accounts', label: 'GESTIÓN',       path: '/admin' },
    { icon: 'person_search',   label: 'BUSCAR USUARIOS', path: '/search' },
    { icon: 'shield_person',   label: 'MASCOTAS',      path: '/mascots' },
  ],
};

function getSidebarStyle(mobileOpen) {
  const base = {
    position: 'fixed',
    left: 0, top: 0,
    height: '100%',
    width: 240,
    background: 'linear-gradient(180deg, #2a1a0e 0%, #1e1208 60%, #130c04 100%)',
    boxShadow: '4px 0 28px rgba(0,0,0,0.35)',
    borderRight: '1px solid rgba(200,160,64,0.15)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
    overflowY: 'auto',
    overflowX: 'visible',
    transition: 'transform 0.3s ease',
  };
  if (mobileOpen === undefined) return base; // desktop: no transform
  return { ...base, transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)' };
}

function BadgeWithTooltip({ badge: b }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  const handleMouseEnter = () => {
    const rect = ref.current.getBoundingClientRect();
    const tooltipWidth = 210;
    const viewportWidth = window.innerWidth;

    let left = rect.left + rect.width / 2;

    // Si se sale por la izquierda, ancla al borde
    if (left - tooltipWidth / 2 < 8) {
      left = tooltipWidth / 2 + 8;
    }
    // Si se sale por la derecha, ancla al borde
    if (left + tooltipWidth / 2 > viewportWidth - 8) {
      left = viewportWidth - tooltipWidth / 2 - 8;
    }

    setPos({ top: rect.top - 12, left });
    setShow(true);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Insignia igual que antes */}
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShow(false)}
        style={{
          width: 44, height: 44, borderRadius: '50%',
          backgroundColor: b.bg, border: `1px solid ${b.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'help', transition: 'all 0.2s',
          boxShadow: show
            ? `0 0 16px ${b.glow}, 0 4px 12px rgba(0,0,0,0.4)`
            : `0 0 8px ${b.glow}`,
          transform: show ? 'scale(1.15) translateY(-3px)' : 'scale(1)',
        }}
      >
        <span className="material-symbols-outlined" style={{
          fontSize: 24, color: b.color, fontVariationSettings: "'FILL' 1",
        }}>
          {b.icon}
        </span>
      </div>

      {/* Tooltip via Portal — se renderiza en document.body */}
      {show && createPortal(
        <div style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          transform: 'translate(-50%, -100%)',
          width: 210,
          backgroundColor: 'rgba(18, 10, 4, 0.97)',
          border: `1px solid ${b.border}`,
          borderTop: `3px solid ${b.accent}`,
          boxShadow: `0 12px 32px rgba(0,0,0,0.8), 0 0 16px ${b.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
          padding: '14px 16px',
          zIndex: 9999,
          pointerEvents: 'none',
          backdropFilter: 'blur(4px)',
        }}>
          {/* Triángulo inferior */}
          <div style={{
            position: 'absolute',
            bottom: -7, left: '50%',
            width: 12, height: 12,
            backgroundColor: '#1a0f06',
            border: `1px solid ${b.border}`,
            borderTop: 'none', borderLeft: 'none',
            transform: 'translateX(-50%) rotate(45deg)',
          }} />

          {/* Ícono + título */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 18, color: b.accent, fontVariationSettings: "'FILL' 1",
            }}>
              {b.icon}
            </span>
            <p style={{
              fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
              fontSize: 15, fontWeight: 700, fontStyle: 'italic',
              color: b.accent, margin: 0, lineHeight: 1.2,
              textShadow: `0 0 12px ${b.glow}`,
            }}>
              {b.title}
            </p>
          </div>

          {/* Separador */}
          <div style={{
            height: 1,
            background: `linear-gradient(to right, ${b.accent}80, transparent)`,
            marginBottom: 10,
          }} />

          {/* Descripción */}
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12, color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.6, margin: 0,
            fontStyle: 'normal',
          }}>
            {b.desc}
          </p>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function Sidebar({ mobileOpen, onClose }) {
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [mascotsOpen, setMascotsOpen] = useState(false);
  const user = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem('numismatic_user') || '{}'); }
    catch { return {}; }
  }, []);
  const NAV_ITEMS = NAV_BY_ROLE[user.userRole || 'usuario'] || NAV_BY_ROLE.usuario;

  const handleLogout = () => {
    localStorage.removeItem('numismatic_user');
    navigate('/');
  };

  return (
    <>
      <aside data-tutorial="sidebar" style={getSidebarStyle(mobileOpen)}>
        {/* ── User profile ─────────────────────────────── */}
        <div style={{ padding: 32, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
            {/* Avatar — clic para ver mi perfil */}
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate('/profile/me')} title="Ver mi perfil">
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                border: '2px solid rgba(255,223,156,0.5)', padding: 4,
              }}>
                <div style={{
                  width: '100%', height: '100%', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #5a4200 0%, #001230 100%)',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(255,223,156,0.2)',
                }}>
                  <span style={{
                    fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
                    fontSize: 28, fontWeight: 700, fontStyle: 'italic',
                    color: '#ffffff',
                    textShadow: '0 1px 8px rgba(0,0,0,0.6), 0 0 20px rgba(255,223,156,0.4)',
                    letterSpacing: '0.02em', userSelect: 'none',
                  }}>
                    {(user.name || 'EU').split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </span>
                </div>
              </div>
              {/* Rating badge */}
              <div style={{
                position: 'absolute', bottom: -6, left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#ffdf9c', color: '#251a00',
                padding: '3px 10px', borderRadius: 9999,
                display: 'flex', alignItems: 'center', gap: 3,
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.3)',
                whiteSpace: 'nowrap',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1" }}>star</span>
                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }}>4.9</span>
              </div>
            </div>

            {/* Name & role */}
            <div>
              <h2 style={{
                fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
                fontSize: 23, fontWeight: 700, fontStyle: 'italic',
                color: '#ffdf9c',
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                lineHeight: 1.2, letterSpacing: '0.02em', margin: 0,
              }}>
                {user.name || 'Erudito'}
              </h2>
              <p style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, color: 'rgba(255,223,156,0.95)',
                letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: 6,
                textShadow: '0 1px 4px rgba(0,0,0,0.9)',
              }}>
                {user.role || 'Archivista'}
              </p>
              {/* Badges */}
              <div style={{ marginTop: 16 }}>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, color: 'rgba(255,223,156,0.85)',
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  textAlign: 'center', marginBottom: 12,
                  paddingTop: 16, borderTop: '1px solid rgba(255,223,156,0.15)',
                  textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                }}>
                  Insignias Obtenidas
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                  {[
                    {
                      icon: 'workspace_premium', color: '#ffdf9c',
                      bg: 'rgba(255,223,156,0.15)', border: 'rgba(255,223,156,0.35)',
                      glow: 'rgba(255,223,156,0.25)',
                      title: 'Coleccionista de Oro',
                      desc: 'Otorgada por registrar más de 10 piezas certificadas en el archivo.',
                      accent: '#ffdf9c',
                    },
                    {
                      icon: 'military_tech', color: '#cbd5e1',
                      bg: 'rgba(203,213,225,0.15)', border: 'rgba(203,213,225,0.35)',
                      glow: 'rgba(203,213,225,0.2)',
                      title: 'Archivista de Plata',
                      desc: 'Concedida por completar 5 ventas verificadas en el registro histórico.',
                      accent: '#cbd5e1',
                    },
                    {
                      icon: 'stars', color: '#fb923c',
                      bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.35)',
                      glow: 'rgba(251,146,60,0.2)',
                      title: 'Explorador de Bronce',
                      desc: 'Primera subasta registrada en el Gran Podio de Puja.',
                      accent: '#fb923c',
                    },
                  ].map(b => (
                    <BadgeWithTooltip key={b.icon} badge={b} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Navigation ───────────────────────────────── */}
        <nav aria-label="Navegación principal" style={{ flex: 1, marginTop: 0 }}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              aria-label={item.label.charAt(0) + item.label.slice(1).toLowerCase()}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '13px 24px',
                textDecoration: 'none',
                fontFamily: isActive
                  ? "'Cormorant Garamond', 'Playfair Display', serif"
                  : "'JetBrains Mono', monospace",
                fontSize: isActive ? 14 : 11,
                fontWeight: isActive ? 700 : 400,
                fontStyle: isActive ? 'italic' : 'normal',
                letterSpacing: isActive ? '0.04em' : '0.1em',
                textTransform: isActive ? 'none' : 'uppercase',
                color: isActive ? '#ffdf9c' : 'rgba(255,255,255,0.55)',
                textShadow: isActive ? '0 1px 6px rgba(255,223,156,0.3)' : 'none',
                backgroundColor: isActive ? 'rgba(255,223,156,0.07)' : 'transparent',
                borderLeft: isActive ? '3px solid #ffdf9c' : '3px solid transparent',
                borderRight: 'none',
                boxShadow: isActive ? 'inset 0 0 20px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.15s',
              })}
              onMouseOver={e => {
                if (!e.currentTarget.classList.contains('active')) {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                }
              }}
              onMouseOut={e => {
                if (!e.currentTarget.classList.contains('active')) {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* ── Bottom actions ───────────────────────────── */}
        <div style={{
          marginTop: 'auto',
          padding: '12px 24px',
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            onClick={() => setLogoutOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,150,150,0.55)', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'color 0.15s', width: '100%' }}
            onMouseOver={e => e.currentTarget.style.color = '#ff8a8a'}
            onMouseOut={e => e.currentTarget.style.color = 'rgba(255,150,150,0.55)'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            SALIR
          </button>
        </div>
      </aside>

      <Modal
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="Cerrar Sesión"
        onConfirm={handleLogout}
        confirmText="Salir del Archivo"
        confirmVariant="danger"
      >
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: '#44474f' }}>
          ¿Desea cerrar su sesión en el Archivo Numismático?
        </p>
      </Modal>
    </>
  );
}
