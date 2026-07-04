import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/ui/Modal.jsx';
import { imageService } from '../services/imageService.js';
import { loginAPI } from '../services/usersService.js';
import { MASCOT_LIST } from '../context/MascotContext.jsx';

const KEY_IMG  = imageService.ui('key.png');
const SEAL_IMG = imageService.ui('seal.png');

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMsg, setErrorMsg]         = useState('');
  const [infoModal, setInfoModal]       = useState(false);
  const [infoMsg, setInfoMsg]           = useState('');
  const [selectedMascotId, setSelectedMascotId] = useState(
    () => localStorage.getItem('numismatic_mascot') || 'MASC-003'
  );

  useEffect(() => {
    if (localStorage.getItem('numismatic_user')) navigate('/home');
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor complete todos los campos de acceso.');
      setErrorModalOpen(true);
      return;
    }
    setLoading(true);
    try {
      const user = await loginAPI(email.trim().toLowerCase(), password);
      localStorage.setItem('numismatic_user', JSON.stringify(user));
      localStorage.setItem('numismatic_mascot', selectedMascotId);
      if (user.userRole === 'admin') navigate('/admin');
      else if (user.userRole === 'certificador') navigate('/certifier');
      else navigate('/home');
    } catch (err) {
      setErrorMsg(err.message);
      setErrorModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen w-full p-4"
      style={{
        backgroundColor: '#fff8f2',
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,248,242,0) 0%, rgba(235,216,184,0.25) 100%)',
      }}
    >
      <main
        className="parchment-folio relative w-full overflow-hidden flex flex-col items-center"
        style={{ maxWidth: 600, backgroundColor: '#ffffff', borderRadius: 8, padding: '48px 56px 56px' }}
      >

        {/* Key + Title */}
        <div className="relative z-10 flex flex-col items-center mb-8">
          <img
            alt="Llave del archivo"
            src={KEY_IMG}
            onError={e => { e.currentTarget.style.display = 'none'; }}
            style={{ width: 64, height: 'auto', marginBottom: 12, opacity: 0.75 }}
          />
          <h1 style={{
            fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
            fontSize: 38, fontWeight: 700, fontStyle: 'italic',
            lineHeight: 1.1, letterSpacing: '-0.01em', color: '#011e4b',
            textAlign: 'center', margin: 0,
          }}>
            Acceso al Repositorio Real
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: 1.6, color: '#44474f', textAlign: 'center', marginTop: 8, maxWidth: 320, fontStyle: 'italic' }}>
            Ingrese sus credenciales para consultar el registro histórico de numismática soberana.
          </p>
        </div>

        {/* Form */}
        <form aria-label="Formulario de acceso al archivo" className="w-full relative z-20" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label htmlFor="identity" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#785a00' }}>
              Identidad del Erudito
            </label>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#44474f', opacity: 0.5, fontSize: 20 }}>person_outline</span>
              <input
                id="identity"
                type="email"
                placeholder="archivo@numismatica.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                className="input-inset"
                style={{ width: '100%', paddingLeft: 44, paddingRight: 16, paddingTop: 14, paddingBottom: 14, fontFamily: "'Inter', sans-serif", fontSize: 15, color: '#241a07', backgroundColor: '#fff2df', border: '1px solid #c4c6d0', borderRadius: 4, outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#785a00'}
                onBlur={e => e.target.style.borderColor = '#c4c6d0'}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="passphrase" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#785a00' }}>
                Frase de Acceso
              </label>
              <button
                type="button"
                onClick={() => {
                  setInfoMsg('Credenciales de acceso para demo:\n\n[Usuario]\nCorreo: archivo@numismatica.com\nClave: 123\n\n[Certificador]\nCorreo: certificador@numismatica.com\nClave: 123\n\n[Administrador]\nCorreo: admin@numismatica.com\nClave: 123');
                  setInfoModal(true);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#011e4b', textDecoration: 'none', padding: 0 }}
                onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'}
                onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}
              >
                ¿Olvidó su clave?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#44474f', opacity: 0.5, fontSize: 20 }}>lock_open</span>
              <input
                id="passphrase"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                className="input-inset"
                style={{ width: '100%', paddingLeft: 44, paddingRight: 44, paddingTop: 14, paddingBottom: 14, fontFamily: "'Inter', sans-serif", fontSize: 15, color: '#241a07', backgroundColor: '#fff2df', border: '1px solid #c4c6d0', borderRadius: 4, outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#785a00'}
                onBlur={e => e.target.style.borderColor = '#c4c6d0'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#44474f', opacity: 0.5, padding: 0 }}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-label={showPassword ? 'Ocultar frase de acceso' : 'Mostrar frase de acceso'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          {/* Wax Seal Submit */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4, gap: 12 }}>
            <button
              type="submit"
              disabled={loading}
              className="btn-hover-effect"
              style={{ background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'transform 0.3s', opacity: loading ? 0.8 : 1 }}
            >
              <div style={{ width: 130, height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.3s' }}>
                {loading ? (
                  <div style={{ width: 56, height: 56, borderRadius: '50%', border: '4px solid #fed16c', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <img alt="Sello de cera" src={SEAL_IMG} style={{ width: 130, height: 130, objectFit: 'contain' }} />
                )}
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a27200', opacity: loading ? 0.6 : 0.9 }}>
                {loading ? 'Validando...' : 'Validar Entrada'}
              </span>
            </button>
          </div>

          {/* ── Selector de Guardián ── */}
          <div style={{ width: '100%', marginTop: 4, paddingTop: 24, borderTop: '1px solid rgba(196,198,208,0.3)' }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#785a00', textAlign: 'center', marginBottom: 14 }}>
              Elige tu Guardián del Archivo
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
              {MASCOT_LIST.map(mascot => {
                const isSelected = selectedMascotId === mascot.id;
                return (
                  <button
                    key={mascot.id}
                    type="button"
                    onClick={() => setSelectedMascotId(mascot.id)}
                    aria-label={`Seleccionar guardián de ${mascot.country}`}
                    aria-pressed={isSelected}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'transform 0.15s' }}
                    onMouseOver={e => { if (!isSelected) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseOut={e => { if (!isSelected) e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{
                      width: 56, height: 56,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: isSelected ? '2.5px solid #785a00' : '2px solid rgba(120,90,0,0.15)',
                      backgroundColor: isSelected ? '#fff2df' : '#f0e8dc',
                      boxShadow: isSelected
                        ? '0 0 0 3px rgba(120,90,0,0.15), 0 4px 12px rgba(0,0,0,0.12)'
                        : '0 2px 6px rgba(0,0,0,0.06)',
                      transition: 'all 0.2s',
                      transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 4,
                    }}>
                      <img
                        src={mascot.imgUrl}
                        alt={`Guardián de ${mascot.country}`}
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 8, letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: isSelected ? '#785a00' : '#757780',
                      fontWeight: isSelected ? 700 : 400,
                      transition: 'color 0.2s',
                      textAlign: 'center',
                    }}>
                      {mascot.country}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </form>

        {/* Footer */}
        <div style={{ marginTop: 36, paddingTop: 20, borderTop: '1px solid rgba(196,198,208,0.3)', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#44474f', fontStyle: 'italic' }}>
            ¿No posee un registro institucional?
          </p>
          <button
            type="button"
            onClick={() => {
              setInfoMsg('El registro institucional estará disponible próximamente.\n\nCuentas de demostración disponibles:\n\n[Usuario]\nCorreo: archivo@numismatica.com\nClave: 123\n\n[Certificador]\nCorreo: certificador@numismatica.com\nClave: 123\n\n[Administrador]\nCorreo: admin@numismatica.com\nClave: 123');
              setInfoModal(true);
            }}
            style={{ padding: '10px 28px', border: '1px solid #785a00', color: '#785a00', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: 4, backgroundColor: 'transparent', cursor: 'pointer', transition: 'background-color 0.2s' }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(254,209,108,0.15)'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            REGISTRARTE
          </button>
        </div>

        {/* Decorative key watermark */}
        <img
          alt=""
          src={KEY_IMG}
          className="key-watermark"
          onError={e => { e.currentTarget.style.display = 'none'; }}
          style={{ position: 'absolute', bottom: -40, right: -20, width: 240, height: 'auto', transform: 'rotate(45deg)', zIndex: 0 }}
        />
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #fff2df inset !important;
          -webkit-text-fill-color: #241a07 !important;
        }
      `}</style>

      {/* Info Modal */}
      <Modal
        isOpen={infoModal}
        onClose={() => setInfoModal(false)}
        title="Información del Archivo"
        onConfirm={() => setInfoModal(false)}
        confirmText="Entendido"
        hideCancel
      >
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#44474f', lineHeight: 1.7 }}>
          {infoMsg.split('\n').map((line, i) =>
            line === '' ? <br key={i} /> : (
              <p key={i} style={{
                margin: '2px 0',
                fontWeight: (line.startsWith('Correo') || line.startsWith('Clave')) ? 600 : 400,
                fontFamily: (line.startsWith('Correo') || line.startsWith('Clave')) ? "'JetBrains Mono', monospace" : "'Inter', sans-serif",
                color: (line.startsWith('Correo') || line.startsWith('Clave')) ? '#011e4b' : '#44474f',
                fontSize: (line.startsWith('Correo') || line.startsWith('Clave')) ? 13 : 14,
              }}>
                {line}
              </p>
            )
          )}
        </div>
      </Modal>

      {/* Error Modal */}
      <Modal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        title="Acceso Denegado"
        onConfirm={() => setErrorModalOpen(false)}
        confirmText="Reintentar"
        hideCancel
      >
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: '#44474f', lineHeight: 1.6 }}>{errorMsg}</p>
        <div style={{ marginTop: 16, padding: '12px 16px', backgroundColor: '#fff2df', border: '1px solid rgba(196,198,208,0.4)', borderRadius: 4 }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#757780', marginBottom: 4 }}>
            Credenciales de demostración
          </p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#011e4b', fontWeight: 600 }}>
            archivo@numismatica.com &nbsp;/&nbsp; 123
          </p>
        </div>
      </Modal>
    </div>
  );
}
