import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MascotSprite from '../ui/MascotSprite.jsx';
import { useMascot } from '../../context/MascotContext.jsx';
import { imageService } from '../../services/imageService.js';

// ── Un solo tour encadenado por todos los módulos ──────────────────────────
const STEPS = [
  // HOME
  { route: '/home', selector: '[data-tutorial="sidebar"]',    module: 'Noticias',        state: 'guiding',   title: '¡Bienvenido al Archivo!',   text: 'Este es tu panel de navegación. Desde aquí accedes a todos los módulos del sistema: inventario, ventas, certificaciones, subasta y más.' },
  { route: '/home', selector: '[data-tutorial="home-feed"]',  module: 'Noticias',        state: 'happy',     title: 'Feed de Noticias',          text: 'Aquí verás las últimas publicaciones del mercado numismático. Puedes reaccionar, comentar y publicar tus propias noticias.' },
  { route: '/home', selector: '[data-tutorial="mascot-btn"]', module: 'Noticias',        state: 'surprised', title: 'Tus Guardianes',            text: '¡Soy Khepri, tu Guardián del Archivo! Puedes cambiarme desde este botón. Cada guardián tiene personalidad e insignias únicas.' },
  { route: '/home', selector: '[data-tutorial="curator-btn"]',module: 'Noticias',        state: 'thinking',  title: 'Archivista Digital',        text: 'Tu asistente experto en numismática. Consúltame sobre cualquier moneda, grado de conservación o valor histórico.', imgOverride: imageService.mascotState('ayuda') },
  // INVENTARIO
  { route: '/ledger', selector: '[data-tutorial="ledger-grid"]',    module: 'Inventario',  state: 'guiding',   title: 'Tu Inventario',        text: 'Aquí vive tu colección completa. Cada tarjeta es una pieza de tu archivo con imagen, grado y valor estimado.', imgOverride: imageService.mascotState('inventario') },
  { route: '/ledger', selector: '[data-tutorial="ledger-actions"]', module: 'Inventario',  state: 'thinking',  title: 'Gestión de Piezas',    text: 'Usa el candado para privatizar una moneda y ocultarla de otros. El ojo abre el detalle completo de la pieza.', imgOverride: imageService.mascotState('privada') },
  // VENTAS
  { route: '/sales', selector: '[data-tutorial="sales-main"]',      module: 'Ventas',      state: 'happy',     title: 'Módulo de Ventas',     text: 'Registra y gestiona todas tus transacciones. Filtra por estado, revisa el historial y gestiona tus ventas activas.', imgOverride: imageService.mascotState('ventas') },
  // CERTIFICACIONES
  { route: '/certification', selector: '[data-tutorial="cert-main"]', module: 'Certificaciones', state: 'guiding', title: 'Certificaciones', text: 'Solicita la verificación oficial de tus piezas. Los grados van de Poor-1 hasta MS-70. Un perito certificado revisará cada solicitud.', imgOverride: imageService.mascotState('certificacion') },
  // SUBASTA
  { route: '/auction', selector: '[data-tutorial="auction-lot"]', module: 'Subasta', state: 'surprised', title: 'Sala de Subasta',   text: 'Las pujas se cierran cuando el timer llega a cero. ¡La puja más alta se lleva la pieza! Revisa el historial antes de participar.', imgOverride: imageService.mascotState('pujar') },
  { route: '/auction', selector: '[data-tutorial="auction-bid"]', module: 'Subasta', state: 'guiding',   title: 'Realizar una Puja', text: 'Ingresa tu monto y confirma. Debe superar la puja actual para ser válida. Recibirás notificación si alguien te supera.', imgOverride: imageService.mascotState('pujar') },
  // MENSAJES
  { route: '/messaging', selector: '[data-tutorial="messaging-list"]', module: 'Mensajes',  state: 'happy',   title: 'Correspondencia',         text: 'Comunícate con coleccionistas, casas de subasta y certificadores. Los peritos usarán este canal para solicitar documentos.', imgOverride: imageService.mascotState('mensajes') },
  // DIRECTORIO
  { route: '/search', selector: '[data-tutorial="search-bar"]',     module: 'Directorio', state: 'guiding', title: 'Directorio de Eruditos',  text: 'Busca coleccionistas, archivistas y peritos por nombre o usuario. Filtra por rol para encontrar certificadores.' },
  { route: '/search', selector: '[data-tutorial="search-results"]', module: 'Directorio', state: 'happy',   title: 'Perfiles del Directorio', text: 'Cada tarjeta muestra calificación, insignias y estadísticas. Haz clic para ver su inventario, certificaciones y subastas.' },
  // PERFIL
  { route: '/profile/me', selector: '[data-tutorial="profile-header"]', module: 'Mi Perfil', state: 'happy', title: 'Tu Perfil Público', text: 'Este es tu perfil tal como lo ven otros eruditos: logros, insignias, calificación e historial de actividad.' },
  // FIN
  { route: null, selector: null, module: 'Fin', state: 'happy', title: '¡Ya conoces el Archivo!', text: 'Estás listo para explorar el sistema completo. Recuerda que puedes relanzar este recorrido desde el botón ? en la barra superior.' },
];

const MODULES     = [...new Set(STEPS.map(s => s.module))];
const STORAGE_KEY = 'numismatic_tutorial_done';
const PAD         = 12;
const FADE_MS     = 180;

// En móvil la burbuja ocupa todo el ancho anclada al fondo
function isMobileViewport() {
  return window.innerWidth < 640;
}

function getBubbleStyle(rect, mobile) {
  if (mobile) {
    return {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      borderRadius: '16px 16px 0 0',
      borderBottom: 'none',
    };
  }
  const BUBBLE_W = 360;
  const BUBBLE_H = 240;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!rect || rect.isCentered) {
    return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: BUBBLE_W, borderRadius: 16 };
  }
  const below   = vh - rect.bottom;
  const above   = rect.top;
  const toRight = vw - rect.right;
  const toLeft  = rect.left;
  let top, left;
  if      (below   >= BUBBLE_H + PAD) { top  = rect.bottom + PAD; left = rect.left; }
  else if (above   >= BUBBLE_H + PAD) { top  = rect.top - BUBBLE_H - PAD; left = rect.left; }
  else if (toRight >= BUBBLE_W + PAD) { left = rect.right + PAD; top  = rect.top; }
  else if (toLeft  >= BUBBLE_W + PAD) { left = rect.left - BUBBLE_W - PAD; top  = rect.top; }
  else { return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: BUBBLE_W, borderRadius: 16 }; }
  left = Math.max(PAD, Math.min(left, vw - BUBBLE_W - PAD));
  top  = Math.max(PAD + 48, Math.min(top, vh - BUBBLE_H - PAD));
  return { position: 'fixed', top, left, width: BUBBLE_W, borderRadius: 16 };
}

function getArrowSide(rect, mobile) {
  if (mobile || !rect || rect.isCentered) return null;
  const BUBBLE_W = 360;
  const BUBBLE_H = 240;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  if (vh - rect.bottom >= BUBBLE_H + PAD) return 'top';
  if (rect.top >= BUBBLE_H + PAD)         return 'bottom';
  if (vw - rect.right >= BUBBLE_W + PAD)  return 'left';
  if (rect.left >= BUBBLE_W + PAD)        return 'right';
  return null;
}

export default function Tutorial({ onFinish }) {
  const navigate           = useNavigate();
  const { activeMascot }   = useMascot();
  const [phase, setPhase]  = useState(() => localStorage.getItem(STORAGE_KEY) ? 'idle' : 'prompt');
  const [step, setStep]    = useState(0);
  const [rect, setRect]    = useState(null);
  const [ready, setReady]  = useState(false);
  const [visible, setVisible] = useState(false);
  const [mobile, setMobile]   = useState(() => isMobileViewport());
  const calcRef            = useRef(null);
  const fadeRef            = useRef(null);

  // Actualizar mobile en resize
  useEffect(() => {
    const onResize = () => setMobile(isMobileViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Relanzar desde botón ?
  useEffect(() => {
    const handler = () => {
      localStorage.removeItem(STORAGE_KEY);
      setStep(0); setRect(null); setReady(false); setVisible(false);
      setPhase('prompt');
    };
    window.addEventListener('numismatic:start-tutorial', handler);
    return () => window.removeEventListener('numismatic:start-tutorial', handler);
  }, []);

  const calcRect = useCallback((stepIndex) => {
    if (calcRef.current) clearTimeout(calcRef.current);
    const s = STEPS[stepIndex];
    if (!s || !s.selector) {
      setRect({ isCentered: true });
      setReady(true);
      requestAnimationFrame(() => setVisible(true));
      return;
    }
    const attempt = (tries = 0) => {
      const el = document.querySelector(s.selector);
      if (!el && tries < 20) { calcRef.current = setTimeout(() => attempt(tries + 1), 250); return; }
      if (!el) {
        setRect({ isCentered: true }); setReady(true);
        requestAnimationFrame(() => setVisible(true));
        return;
      }
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height, right: r.right, bottom: r.bottom, isCentered: false });
        setReady(true);
        requestAnimationFrame(() => setVisible(true));
      }));
    };
    attempt();
  }, []);

  const withFade = useCallback((fn) => {
    setVisible(false);
    if (fadeRef.current) clearTimeout(fadeRef.current);
    fadeRef.current = setTimeout(() => {
      setReady(false);
      setRect(null);
      fn();
    }, FADE_MS);
  }, []);

  const goToStep = useCallback((stepIndex) => {
    const s = STEPS[stepIndex];
    if (s.route && window.location.pathname !== s.route) {
      navigate(s.route);
      setTimeout(() => calcRect(stepIndex), 1100);
    } else {
      calcRect(stepIndex);
    }
  }, [navigate, calcRect]);

  useEffect(() => {
    if (phase === 'running') {
      withFade(() => goToStep(step));
    }
  }, [phase, step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    if (calcRef.current) clearTimeout(calcRef.current);
    if (fadeRef.current) clearTimeout(fadeRef.current);
  }, []);

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setPhase('idle');
    navigate('/home');
    onFinish();
  }, [navigate, onFinish]);

  const handleNext = () => { if (step < STEPS.length - 1) setStep(s => s + 1); else finish(); };
  const handleBack = () => { if (step > 0) setStep(s => s - 1); };

  if (phase === 'idle') return null;

  const currentStep   = STEPS[step];
  const currentModule = currentStep?.module || '';
  const mascotImg     = currentStep?.imgOverride || activeMascot.imgUrl;

  // ── Prompt inicial ────────────────────────────────────────────────────────
  if (phase === 'prompt') {
    return (
      <div role="dialog" aria-modal="true" aria-label="Bienvenida al Archivo Numismático"
        style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.60)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: mobile ? 16 : 24 }}
      >
        <div style={{ backgroundColor: '#faf6f0', border: '2px solid #785a00', borderRadius: 16, padding: mobile ? '28px 20px' : '36px 32px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.35)', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <MascotSprite imgUrl={activeMascot.imgUrl} state="happy" size={mobile ? 90 : 110} />
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: mobile ? 20 : 24, fontWeight: 700, color: '#2a1a0e', marginBottom: 10 }}>
            ¡Bienvenido al Archivo!
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: mobile ? 13 : 14, color: '#44474f', lineHeight: 1.7, marginBottom: 8 }}>
            Soy <strong style={{ color: '#785a00' }}>Khepri</strong>, tu Guardián del Archivo.<br />
            ¿Quieres que te lleve por todos los módulos del sistema?
          </p>
          <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#757780', letterSpacing: '0.06em', marginBottom: 20 }}>
            {STEPS.length - 1} PASOS · {MODULES.length - 1} MÓDULOS
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={() => setPhase('running')}
              style={{ backgroundColor: '#785a00', color: 'white', border: 'none', borderRadius: 8, padding: '13px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '0.05em', transition: 'background-color 0.2s' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#5b4300'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = '#785a00'}
            >
              Sí, llévame por el Archivo →
            </button>
            <button onClick={finish}
              style={{ backgroundColor: 'transparent', color: '#785a00', border: '1px solid rgba(120,90,0,0.4)', borderRadius: 8, padding: '12px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '0.05em', transition: 'background-color 0.2s' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(120,90,0,0.06)'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              No, exploraré por mi cuenta
            </button>
          </div>
          <p style={{ marginTop: 16, fontFamily: 'monospace', fontSize: 9, color: '#a0a0a0', letterSpacing: '0.05em' }}>
            Puedes saltar en cualquier momento · Botón ? para relanzar
          </p>
        </div>
      </div>
    );
  }

  // ── Tour paso a paso ──────────────────────────────────────────────────────
  if (phase === 'running') {
    const isLast      = step === STEPS.length - 1;
    const isFirst     = step === 0;
    const isCentered  = rect?.isCentered;
    const spotlightOn = visible && ready && !isCentered && rect;
    const bubbleStyle = getBubbleStyle(rect, mobile);
    const arrowSide   = getArrowSide(rect, mobile);

    // En móvil el spotlight siempre existe pero la burbuja va al fondo
    // Para móvil: en el spotlight dejamos ver el elemento aunque la burbuja tape parte inferior
    const spotlightPad = mobile ? PAD : PAD;

    return (
      <div role="dialog" aria-modal="true" aria-label={`Tutorial — ${currentModule}: ${currentStep?.title}`}
        style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
      >
        {/* Overlay oscuro base */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.68)',
          opacity: spotlightOn ? 0 : 1,
          transition: `opacity ${FADE_MS}ms ease`,
          pointerEvents: 'none',
        }} />

        {/* Spotlight SVG */}
        <svg aria-hidden="true" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: spotlightOn ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
          pointerEvents: 'none',
        }}>
          {spotlightOn && (
            <>
              <defs>
                <mask id="tutorial-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <rect
                    x={rect.left - spotlightPad}
                    y={rect.top - spotlightPad}
                    width={rect.width + spotlightPad * 2}
                    height={rect.height + spotlightPad * 2}
                    rx="10" fill="black"
                  />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.68)" mask="url(#tutorial-mask)" />
              <rect
                x={rect.left - spotlightPad}
                y={rect.top - spotlightPad}
                width={rect.width + spotlightPad * 2}
                height={rect.height + spotlightPad * 2}
                rx="10" fill="none" stroke="#fed16c" strokeWidth="2" opacity="0.9"
              />
            </>
          )}
        </svg>

        {/* Barra de módulos — desktop: breadcrumb completo / móvil: solo módulo actual */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: mobile ? 0 : 4,
          backgroundColor: 'rgba(250,246,240,0.97)',
          borderBottom: '1px solid rgba(120,90,0,0.15)',
          padding: mobile ? '8px 16px' : '6px 14px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          zIndex: 10001, pointerEvents: 'none',
          opacity: visible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
        }}>
          {mobile ? (
            // Móvil: módulo actual + progreso numérico
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#785a00', backgroundColor: 'rgba(120,90,0,0.1)', padding: '3px 10px', borderRadius: 12 }}>
                {currentModule}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#b0a090', letterSpacing: '0.06em' }}>
                PASO {step + 1} DE {STEPS.length}
              </span>
            </div>
          ) : (
            // Desktop: breadcrumb completo
            MODULES.filter(m => m !== 'Fin').map((mod, i) => (
              <React.Fragment key={mod}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: mod === currentModule ? '#785a00' : '#b0a090', fontWeight: mod === currentModule ? 700 : 400, padding: '2px 5px', backgroundColor: mod === currentModule ? 'rgba(120,90,0,0.1)' : 'transparent', borderRadius: 4, transition: 'all 0.3s' }}>
                  {mod}
                </span>
                {i < MODULES.filter(m => m !== 'Fin').length - 1 && (
                  <span style={{ color: '#c4b89a', fontSize: 10 }}>›</span>
                )}
              </React.Fragment>
            ))
          )}
        </div>

        {/* Bocadillo */}
        <div style={{
          ...bubbleStyle,
          zIndex: 10000,
          boxSizing: 'border-box',
          backgroundColor: '#faf6f0',
          border: '2px solid #785a00',
          boxShadow: mobile ? '0 -4px 24px rgba(0,0,0,0.28)' : '0 8px 36px rgba(0,0,0,0.32)',
          overflow: 'hidden',
          opacity: visible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
          pointerEvents: visible ? 'auto' : 'none',
        }}>

          {/* Flechas — solo desktop */}
          {!mobile && arrowSide === 'top' && (<>
            <div aria-hidden="true" style={{ position: 'absolute', top: -10, left: 28, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: '11px solid #785a00' }} />
            <div aria-hidden="true" style={{ position: 'absolute', top: -7,  left: 29, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '10px solid #faf6f0' }} />
          </>)}
          {!mobile && arrowSide === 'bottom' && (<>
            <div aria-hidden="true" style={{ position: 'absolute', bottom: -10, left: 28, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '11px solid #785a00' }} />
            <div aria-hidden="true" style={{ position: 'absolute', bottom: -7,  left: 29, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '10px solid #faf6f0' }} />
          </>)}
          {!mobile && arrowSide === 'left' && (<>
            <div aria-hidden="true" style={{ position: 'absolute', left: -10, top: 28, borderTop: '9px solid transparent', borderBottom: '9px solid transparent', borderRight: '11px solid #785a00' }} />
            <div aria-hidden="true" style={{ position: 'absolute', left: -7,  top: 29, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderRight: '10px solid #faf6f0' }} />
          </>)}
          {!mobile && arrowSide === 'right' && (<>
            <div aria-hidden="true" style={{ position: 'absolute', right: -10, top: 28, borderTop: '9px solid transparent', borderBottom: '9px solid transparent', borderLeft: '11px solid #785a00' }} />
            <div aria-hidden="true" style={{ position: 'absolute', right: -7,  top: 29, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '10px solid #faf6f0' }} />
          </>)}

          {/* Cabecera */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: mobile ? '12px 16px 10px' : '14px 16px 10px', borderBottom: '1px solid rgba(120,90,0,0.12)' }}>
            <MascotSprite imgUrl={mascotImg} state={currentStep?.state} size={mobile ? 44 : 52} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {!mobile && (
                <span style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#785a00', backgroundColor: 'rgba(120,90,0,0.08)', padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginBottom: 4 }}>
                  {currentModule}
                </span>
              )}
              <p style={{ fontWeight: 700, color: '#2a1a0e', margin: 0, fontSize: mobile ? 14 : 15, fontFamily: "'Playfair Display', serif", lineHeight: 1.25 }}>
                {currentStep?.title}
              </p>
            </div>
          </div>

          {/* Cuerpo */}
          <div style={{ padding: mobile ? '10px 16px 12px' : '12px 16px 14px' }}>
            <p style={{ color: '#44474f', fontSize: mobile ? 13 : 13, lineHeight: 1.6, margin: '0 0 12px' }}>
              {currentStep?.text}
            </p>

            {/* Controles */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <button onClick={finish}
                style={{ fontSize: 11, color: '#a0a0a0', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'monospace', letterSpacing: '0.04em', flexShrink: 0, touchAction: 'manipulation' }}
                onMouseOver={e => e.currentTarget.style.color = '#785a00'}
                onMouseOut={e => e.currentTarget.style.color = '#a0a0a0'}
              >Saltar ✕</button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Progreso: dots en desktop, texto en móvil */}
                {mobile ? (
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#b0a090', letterSpacing: '0.04em' }}>
                    {step + 1}/{STEPS.length}
                  </span>
                ) : (
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    {STEPS.map((_, i) => (
                      <div key={i} style={{ width: i === step ? 12 : 4, height: 4, borderRadius: 2, backgroundColor: i === step ? '#785a00' : i < step ? 'rgba(120,90,0,0.4)' : '#d4c8b8', transition: 'all 0.3s', flexShrink: 0 }} />
                    ))}
                  </div>
                )}

                {!isFirst && (
                  <button onClick={handleBack}
                    style={{ backgroundColor: 'transparent', color: '#785a00', border: '1px solid rgba(120,90,0,0.35)', borderRadius: 6, padding: mobile ? '8px 14px' : '6px 12px', fontSize: 13, cursor: 'pointer', lineHeight: 1, flexShrink: 0, touchAction: 'manipulation' }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(120,90,0,0.08)'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >←</button>
                )}

                <button onClick={handleNext}
                  style={{ backgroundColor: '#785a00', color: 'white', border: 'none', borderRadius: 6, padding: mobile ? '9px 18px' : '7px 16px', fontSize: mobile ? 13 : 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.03em', flexShrink: 0, fontFamily: 'monospace', touchAction: 'manipulation' }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#5b4300'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = '#785a00'}
                >
                  {isLast ? '¡Listo! 🎉' : 'Siguiente →'}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }

  return null;
}
