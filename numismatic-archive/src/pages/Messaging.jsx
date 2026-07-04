import React, { useState, useEffect, useRef } from 'react';
import { BACKEND_URL } from '../utils/constants.js';
import { createPortal } from 'react-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { fetchConversations, sendMessageAPI, uploadMessageAttachment, deleteMessageAPI } from '../services/coinsService.js';
import { useWindowSize, isMobile } from '../hooks/useWindowSize.js';

// ── Design tokens ────────────────────────────────────────────
const F = {
  display: "'Cormorant Garamond', 'Playfair Display', serif",
  body:    "'Inter', sans-serif",
  mono:    "'JetBrains Mono', monospace",
};
const C = {
  navy:       '#011e4b',
  gold:       '#785a00',
  goldLight:  '#ffdf9c',
  goldDim:    '#ecc15d',
  cream:      '#f4ece1',
  parchment:  '#fff8f2',
  inkDark:    '#241a07',
  inkLight:   '#44474f',
  outline:    '#757780',
  outlineVar: '#c4c6d0',
  // ── Panel de mensajería (mismo pergamino/navy/dorado que el resto del sitio) ──
  chatBg:       '#f6f1eb',
  chatPanel:    '#fff8f2',
  chatBorder:   'rgba(196,198,208,0.4)',
  chatSent:     '#011e4b',
  chatSentText: '#ffdf9c',
  chatRecv:     '#ffffff',
  chatRecvText: '#241a07',
  chatInput:    '#f4ece1',
  chatGold:     '#785a00',
  chatCheck:    '#1a6b2e',
};
// ── Emojis comunes para el selector rápido ─────────────────────
const EMOJI_LIST = [
  '😀','😂','🙂','😉','😍','🤔','😮','😢','😎','👍',
  '👎','🙏','👏','🤝','💪','✅','❌','⚠️','📌','📎',
  '🪙','💰','📜','🏛️','⚖️','🔍','📦','✉️','⏳','🎉',
];

const CONTACT_INFO = {
  'Eleanor Vance': {
    phone: '+1 (202) 555-0142',
    email: 'e.vance@centralvault.org',
    location: 'Washington, DC, EE. UU.',
    org: 'Central Vault Archives',
    whatsapp: '51946326245',
  },
  "Sotheby's Heritage": {
    phone: '+44 20 7293 5000',
    email: 'contact@sothebys-heritage.com',
    location: 'Londres, Reino Unido',
    org: "Sotheby's Heritage Auctions",
    whatsapp: '51998964675',
  },
  'Dr. Alistair Finch': {
    phone: '+1 (415) 555-0199',
    email: 'a.finch@numismaticinstitute.org',
    location: 'San Francisco, CA, EE. UU.',
    org: 'Instituto Numismático Internacional',
    whatsapp: '51935372146',
  },
};

// ── Corner tabs helper (mismo patrón que Certification.jsx) ───
function Corners() {
  const base = {
    position: 'absolute', width: 14, height: 14,
    border: '1px solid rgba(0,0,0,0.08)',
    background: 'rgba(120,90,0,0.06)',
    pointerEvents: 'none',
  };
  return (
    <>
      <div style={{ ...base, top: -1, left: -1, borderRight: 'none', borderBottom: 'none' }} />
      <div style={{ ...base, top: -1, right: -1, borderLeft: 'none', borderBottom: 'none' }} />
    </>
  );
}

// ── Avatar reutilizable — SIEMPRE CIRCULAR, consistente con Ledger/Certification ──
function Avatar({ initials, size = 48, active = false, fontSize }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      overflow: 'hidden',
      border: active ? `1px solid rgba(120,90,0,0.35)` : '1px solid rgba(196,198,208,0.4)',
      boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.12)',
      background: `linear-gradient(135deg, ${C.gold} 0%, ${C.navy} 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{
        fontFamily: F.display, fontWeight: 700, fontStyle: 'italic',
        fontSize: fontSize || size * 0.36,
        color: C.goldLight, userSelect: 'none',
      }}>
        {initials}
      </span>
    </div>
  );
}

// ── Helper: hora relativa para la lista (Ahora / Hace Xh / Ayer / fecha) ──
function relativeTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffH / 24);

  if (diffMin < 1)  return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin}m`;
  if (diffH < 24)   return `Hace ${diffH}h`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ── Helper: vista previa de texto del último mensaje (contempla adjuntos) ──
function previewText(msg) {
  if (!msg) return 'Sin mensajes aún';
  if (msg.text) return msg.text;
  if (msg.attachment?.type === 'image') return '📷 Fotografía';
  if (msg.attachment?.type === 'audio') return '🎤 Mensaje de voz';
  return 'Sin mensajes aún';
}

// ── Helper: formatea segundos a mm:ss ───────────────────────────
function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── ConversationItem ─────────────────────────────────────────
function ConversationItem({ conv, isActive, onClick, matchedMessage }) {
  const [hovered, setHovered] = useState(false);
  const lastMsg = conv.messages?.[conv.messages.length - 1];
  // Si la búsqueda encontró coincidencia en un mensaje que no es el último,
  // mostramos ese mensaje en la vista previa para que se note por qué apareció.
  const preview = matchedMessage ? matchedMessage.text : previewText(lastMsg);
  const timeLabel = relativeTime(conv.updatedAt);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '12px 16px',
        cursor: 'pointer',
        backgroundColor: isActive
          ? 'rgba(200,169,110,0.15)'
          : hovered ? 'rgba(120,90,0,0.05)' : 'transparent',
        borderLeft: `3px solid ${isActive ? C.chatGold : 'transparent'}`,
        transition: 'all 0.15s',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar initials={(conv.initials || conv.name.slice(0, 2)).toUpperCase()} size={46} active={isActive} />
          <div style={{
            position: 'absolute', bottom: 1, right: 1,
            width: 11, height: 11, borderRadius: '50%',
            backgroundColor: isActive ? C.chatCheck : 'rgba(196,198,208,0.6)',
            border: `2px solid ${C.chatPanel}`,
          }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
            <span style={{
              fontFamily: F.display, fontSize: 15, fontStyle: 'italic', fontWeight: 700,
              color: isActive ? C.chatGold : '#241a07',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {conv.name}
            </span>
            <span style={{
              fontFamily: F.mono, fontSize: 10,
              color: isActive ? C.chatGold : 'rgba(36,26,7,0.45)',
              flexShrink: 0, marginLeft: 8,
            }}>
              {timeLabel}
            </span>
          </div>
          <p style={{
            fontFamily: F.body, fontSize: 13,
            color: matchedMessage ? C.gold : 'rgba(36,26,7,0.55)',
            margin: 0, overflow: 'hidden',
            whiteSpace: 'nowrap', textOverflow: 'ellipsis',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {matchedMessage && (
              <span className="material-symbols-outlined" style={{ fontSize: 13, flexShrink: 0 }}>search</span>
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── EmojiPicker — dropdown simple ───────────────────────────────
function EmojiPicker({ onSelect, onClose, anchorRect }) {
  if (!anchorRect) return null;

  const pickerWidth = 300;
  let left = anchorRect.left;
  // Si se sale por la derecha, ajusta hacia la izquierda
  if (left + pickerWidth > window.innerWidth - 16) {
    left = window.innerWidth - pickerWidth - 16;
  }
  if (left < 16) left = 16;

  return createPortal(
    <div style={{
      position: 'fixed',
      bottom: window.innerHeight - anchorRect.top + 8,
      left,
      width: pickerWidth,
      background: C.parchment,
      border: '1px solid rgba(196,198,208,0.5)',
      borderRadius: 4,
      boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
      padding: 12,
      zIndex: 9999,
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: 4,
    }}>
      {EMOJI_LIST.map(emoji => (
        <button
          key={emoji}
          onClick={() => { onSelect(emoji); onClose(); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, padding: 6, borderRadius: 4,
            transition: 'background 0.1s',
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(120,90,0,0.1)'}
          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
        >
          {emoji}
        </button>
      ))}
    </div>,
    document.body
  );
}

// ── MessageAttachment — renderiza imagen o audio dentro de una burbuja ──
function MessageAttachment({ attachment, sent }) {
  if (!attachment) return null;

  if (attachment.type === 'image') {
    return (
      <div style={{
        borderRadius: 2, overflow: 'hidden',
        border: sent ? '2px solid rgba(255,223,156,0.3)' : '2px solid rgba(120,90,0,0.2)',
        marginBottom: 12,
      }}>
        <img
          src={`${BACKEND_URL}${attachment.url}`}
          alt="Adjunto"
          style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }}
        />
      </div>
    );
  }

  if (attachment.type === 'audio') {
    return (
      <div style={{ marginBottom: 12 }}>
        <audio
          controls
          src={`${BACKEND_URL}${attachment.url}`}
          style={{ width: '100%', height: 36, filter: sent ? 'invert(0.9)' : 'none' }}
        />
      </div>
    );
  }

  return null;
}

// ── Main component ───────────────────────────────────────────
export default function Messaging() {
  const toast = useToast();
  const { width } = useWindowSize();
  const mobile = isMobile(width);

  const [convs, setConvs]               = useState([]);
  const [convsLoading, setConvsLoading] = useState(true);
  const [activeConvId, setActiveConvId] = useState(null);
  const [input, setInput]               = useState('');
  const [search, setSearch]             = useState('');
  const [mobileView, setMobileView]     = useState('list');
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [sending, setSending]           = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [emojiOpen, setEmojiOpen]       = useState(false);
  const [emojiAnchorRect, setEmojiAnchorRect] = useState(null);
  const emojiButtonRef = useRef(null);

  // Grabación de audio
  const [recording, setRecording]       = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordSecondsRef = useRef(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const recordTimerRef   = useRef(null);
  const streamRef         = useRef(null);
  const cancelledRef      = useRef(false);

  const messagesEndRef = useRef(null);
  const fileInputRef    = useRef(null);
  const cameraInputRef  = useRef(null);

  const activeConv = convs.find(c => c.id === activeConvId);
  const [sendActive, setSendActive] = useState(false);

  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  const [contactOpen, setContactOpen] = useState(false);

  // ── Búsqueda de mensajes (icono lupa junto a "Archivos") ──
  const searchInputRef = useRef(null);
  const [highlightMsgId, setHighlightMsgId] = useState(null);
  const msgRefs = useRef({});

  // ── Panel "configuración y demás" (icono de 3 puntos junto a "Archivos") ──
  const [archiveMenuOpen, setArchiveMenuOpen] = useState(false);

  // ── Carga inicial desde el backend ──
  useEffect(() => {
    fetchConversations()
      .then(data => {
        setConvs(data);
        if (data.length > 0) setActiveConvId(data[0].id);
      })
      .catch(() => toast.error('No se pudo cargar la correspondencia.'))
      .finally(() => setConvsLoading(false));
  }, []);

  // ── Búsqueda: encuentra el primer mensaje de una conversación que
  //     contenga el texto buscado (para poder saltar directo a él) ──
  function findMatchingMessage(conv, query) {
    if (!query) return null;
    return conv.messages?.find(m => m.text?.toLowerCase().includes(query)) || null;
  }

  // ── Filtrado de conversaciones — ahora busca también dentro de los
  //     mensajes de cada conversación, no solo en el nombre o el último ──
  const searchQuery = search.trim().toLowerCase();
  const filteredConvs = convs.filter(c => {
    if (!searchQuery) return true;
    const nameMatch = c.name.toLowerCase().includes(searchQuery);
    const anyMessageMatch = c.messages?.some(m => m.text?.toLowerCase().includes(searchQuery));
    return nameMatch || anyMessageMatch;
  });

  // ── Enviar mensaje (texto y/o adjunto) ──
  const handleSend = async (attachment = null) => {
    if ((!input.trim() && !attachment) || !activeConv || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const updated = await sendMessageAPI(activeConv.id, text, attachment);
      setConvs(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (err) {
      toast.error(err.message);
      if (!attachment) setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!activeConv) return;
    try {
      const updated = await deleteMessageAPI(activeConv.id, messageId);
      setConvs(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleTextareaInput = (e) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages]);

  const lastMsgDate = activeConv?.messages?.[activeConv.messages.length - 1]?.date
    || new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });

  // ── Emoji: inserta en el textarea ──
  const handleEmojiSelect = (emoji) => {
    setInput(prev => prev + emoji);
  };

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000); // revisa cada 5s
    return () => clearInterval(interval);
  }, []);

  // ── Adjuntar imagen (archivo o cámara) ──
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo después
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await uploadMessageAttachment(file);
      await handleSend({ url, type: 'image' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  // ── Audio: iniciar grabación ──
  const startRecording = async () => {
    try {
      cancelledRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        clearInterval(recordTimerRef.current);
        streamRef.current?.getTracks().forEach(track => track.stop());

        // Si fue cancelado explícitamente, no procesar nada
        if (cancelledRef.current) {
          audioChunksRef.current = [];
          setRecordSeconds(0);
          recordSecondsRef.current = 0;
          cancelledRef.current = false;
          return;
        }

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        if (recordSecondsRef.current < 1) {
          setRecordSeconds(0);
          recordSecondsRef.current = 0;
          return;
        }

        setUploading(true);
        try {
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
          const { url } = await uploadMessageAttachment(file);
          await handleSend({ url, type: 'audio' });
        } catch (err) {
          toast.error(err.message);
        } finally {
          setUploading(false);
          setRecordSeconds(0);
          recordSecondsRef.current = 0;
        }
      };

      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds(prev => {
          recordSecondsRef.current = prev + 1;
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      toast.error('No se pudo acceder al micrófono. Verifique los permisos.');
    }
  };

  // ── Audio: detener y enviar ──
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  // ── Audio: cancelar sin enviar ──
  const cancelRecording = () => {
    if (mediaRecorderRef.current && recording) {
      cancelledRef.current = true;
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  useEffect(() => {
    return () => {
      clearInterval(recordTimerRef.current);
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!moreOptionsOpen) return;
    const handleClick = () => setMoreOptionsOpen(false);
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreOptionsOpen]);

  useEffect(() => {
    if (!contactOpen) return;
    const handleClick = (e) => {
      if (!e.target.closest('[data-panel="contact-info"]')) {
        setContactOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [contactOpen]);

  useEffect(() => {
    if (!archiveMenuOpen) return;
    const handleClick = (e) => {
      if (!e.target.closest('[data-panel="archive-menu"]')) {
        setArchiveMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [archiveMenuOpen]);

  // ── Cuando hay un mensaje resaltado por la búsqueda, hace scroll hasta
  //     él y quita el resaltado a los pocos segundos ──
  useEffect(() => {
    if (!highlightMsgId) return;
    const el = msgRefs.current[highlightMsgId];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = setTimeout(() => setHighlightMsgId(null), 2200);
    return () => clearTimeout(timer);
  }, [highlightMsgId, activeConvId]);

  // ── Clic en el ícono de lupa: enfoca la barra de búsqueda de mensajes ──
  const handleSearchIconClick = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  // ── Opciones hardcodeadas del panel de "configuración y demás" ──
  const ARCHIVE_MENU_OPTIONS = [
    { icon: 'mark_email_read', label: 'Marcar todo como leído' },
    { icon: 'archive',         label: 'Mensajes archivados' },
    { icon: 'notifications',   label: 'Configuración de notificaciones' },
    { icon: 'settings',        label: 'Configuración' },
    { icon: 'help',            label: 'Ayuda' },
  ];

return (
  <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
    {mobile && sidebarOpen && (
      <div className="mobile-overlay visible" onClick={() => setSidebarOpen(false)} />
    )}
    <Sidebar mobileOpen={mobile ? sidebarOpen : undefined} onClose={() => setSidebarOpen(false)} />

    <main style={{ marginLeft: mobile ? 0 : 240, display: 'flex', flex: 1, height: '100vh', overflow: 'hidden' }}>

      {/* ── Left Panel ── */}
      <section style={{
        width: mobile ? '100%' : 360,
        borderRight: `1px solid ${C.chatBorder}`,
        backgroundColor: C.chatPanel,
        display: mobile && mobileView === 'chat' ? 'none' : 'flex',
        flexDirection: 'column',
        height: '100vh', overflow: 'hidden', flexShrink: 0,
      }}>
        {/* Header panel izquierdo */}
        <div style={{
          height: 64, padding: mobile ? '0 16px 0 64px' : '0 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${C.chatBorder}`,
          backgroundColor: C.chatBg,
        }}>
          {mobile && (
            <button onClick={() => setSidebarOpen(true)} style={{
              marginRight: 8, width: 32, height: 32, borderRadius: '50%',
              backgroundColor: C.navy, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ color: C.goldLight, fontSize: 18 }}>menu</span>
            </button>
          )}
          <h2 style={{
            fontFamily: F.display, fontSize: 22, fontStyle: 'italic',
            fontWeight: 700, color: C.chatGold, margin: 0,
          }}>
            Archivos
          </h2>
          <div style={{ display: 'flex', gap: 4, position: 'relative' }}>
            <button
              onClick={handleSearchIconClick}
              title="Buscar un mensaje"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(36,26,7,0.55)', padding: 6, borderRadius: '50%',
                display: 'flex', alignItems: 'center', transition: 'background 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(120,90,0,0.08)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>search</span>
            </button>

            <div style={{ position: 'relative' }} data-panel="archive-menu">
              <button
                onClick={() => setArchiveMenuOpen(v => !v)}
                title="Más opciones"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(36,26,7,0.55)', padding: 6, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', transition: 'background 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(120,90,0,0.08)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>more_vert</span>
              </button>

              {archiveMenuOpen && (
                <div data-panel="archive-menu" style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  width: 240, backgroundColor: C.chatPanel,
                  border: `1px solid ${C.chatBorder}`,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                  borderRadius: 8, zIndex: 50, overflow: 'hidden',
                }}>
                  {ARCHIVE_MENU_OPTIONS.map(opt => (
                    <button
                      key={opt.icon}
                      onClick={() => {
                        toast.info(`${opt.label} — próximamente disponible.`);
                        setArchiveMenuOpen(false);
                      }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '11px 16px', background: 'none', border: 'none',
                        cursor: 'pointer', fontFamily: F.body, fontSize: 13,
                        color: '#241a07', textAlign: 'left', transition: 'background 0.15s',
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(120,90,0,0.06)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: C.chatGold }}>{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 12px', backgroundColor: C.chatPanel }}>
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined" style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'rgba(36,26,7,0.4)', fontSize: 18, pointerEvents: 'none',
            }}>search</span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por nombre o contenido del mensaje"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', backgroundColor: C.chatInput,
                border: 'none', borderRadius: 20, outline: 'none',
                paddingLeft: 40, paddingRight: 16, paddingTop: 8, paddingBottom: 8,
                fontFamily: F.body, fontSize: 13, color: '#241a07',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Lista de conversaciones */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${C.chatGold} transparent` }}>
          {convsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'rgba(200,169,110,0.4)', animation: 'spin 1s linear infinite' }}>autorenew</span>
            </div>
          ) : filteredConvs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', gap: 8, opacity: 0.4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: C.chatGold }}>search_off</span>
              <p style={{ fontFamily: F.mono, fontSize: 10, color: C.chatGold, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                Sin resultados
              </p>
            </div>
          ) : (
            filteredConvs.map(conv => {
              // Si la búsqueda no coincide con el nombre, el match viene de
              // algún mensaje — lo mostramos y saltamos directo a él al abrir.
              const nameMatches = searchQuery && conv.name.toLowerCase().includes(searchQuery);
              const matchedMessage = searchQuery && !nameMatches
                ? findMatchingMessage(conv, searchQuery)
                : null;

              return (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={activeConvId === conv.id}
                  matchedMessage={matchedMessage}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    setContactOpen(false);
                    if (mobile) setMobileView('chat');
                    if (matchedMessage) setHighlightMsgId(matchedMessage.id);
                  }}
                />
              );
            })
          )}
        </div>
      </section>

      {/* ── Right Panel — Chat ── */}
      <section style={{
        flex: 1,
        display: mobile && mobileView === 'list' ? 'none' : 'flex',
        flexDirection: 'column',
        backgroundColor: C.chatBg,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8a96e' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        overflow: 'hidden',
      }}>
        {activeConv ? (
          <>
            {/* Header chat */}
            <header style={{
              height: 64, padding: '0 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: C.chatPanel,
              borderBottom: `1px solid ${C.chatBorder}`,
              flexShrink: 0, zIndex: 10,
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', position: 'relative' }}>
                {mobile && (
                  <button onClick={() => setMobileView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.chatGold, display: 'flex', padding: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back</span>
                  </button>
                )}
                <button
                  onClick={() => setContactOpen(v => !v)}
                  data-panel="contact-info"
                  style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8 }}
                >
                  <Avatar initials={(activeConv.initials || activeConv.name.slice(0, 2)).toUpperCase()} size={40} fontSize={14} />
                  <div style={{ textAlign: 'left' }}>
                    <h2 style={{ fontFamily: F.display, fontSize: 17, fontStyle: 'italic', fontWeight: 700, color: '#241a07', margin: 0, lineHeight: 1.2 }}>
                      {activeConv.name}
                    </h2>
                    <span style={{ fontFamily: F.mono, fontSize: 10, color: C.chatCheck, letterSpacing: '0.05em' }}>
                      en línea
                    </span>
                  </div>
                </button>

                {/* Panel de contacto */}
                {contactOpen && (() => {
                  const info = CONTACT_INFO[activeConv.name] || {};
                  return (
                    <div data-panel="contact-info" style={{
                      position: 'absolute', top: '100%', left: 0, marginTop: 10,
                      width: 300, backgroundColor: C.chatPanel,
                      border: `1px solid ${C.chatBorder}`,
                      borderRadius: 8,
                      boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                      zIndex: 60, overflow: 'hidden',
                    }}>
                      <div style={{
                        padding: '20px 20px 16px',
                        background: 'linear-gradient(135deg, rgba(200,169,110,0.1) 0%, rgba(1,30,75,0.2) 100%)',
                        borderBottom: `1px solid ${C.chatBorder}`,
                        display: 'flex', alignItems: 'center', gap: 14,
                      }}>
                        <Avatar initials={(activeConv.initials || activeConv.name.slice(0, 2)).toUpperCase()} size={48} fontSize={16} />
                        <div>
                          <p style={{ fontFamily: F.display, fontSize: 17, fontStyle: 'italic', fontWeight: 700, color: '#241a07', margin: 0 }}>
                            {activeConv.name}
                          </p>
                          <p style={{ fontFamily: F.mono, fontSize: 9, color: C.chatGold, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '2px 0 0' }}>
                            {activeConv.role || 'Correspondencia Archival'}
                          </p>
                        </div>
                      </div>
                      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {[
                          { icon: 'apartment',   label: 'Institución', value: info.org },
                          { icon: 'call',        label: 'Teléfono',    value: info.phone },
                          { icon: 'mail',        label: 'Correo',      value: info.email },
                          { icon: 'location_on', label: 'Ubicación',   value: info.location },
                        ].filter(r => r.value).map(row => (
                          <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 17, color: C.chatGold, flexShrink: 0, marginTop: 1 }}>{row.icon}</span>
                            <div>
                              <p style={{ fontFamily: F.mono, fontSize: 9, color: 'rgba(36,26,7,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{row.label}</p>
                              <p style={{ fontFamily: F.body, fontSize: 13, color: '#241a07', margin: '2px 0 0' }}>{row.value}</p>
                            </div>
                          </div>
                        ))}

                        {/* Botón WhatsApp */}
                        {info.whatsapp && (
                          <a
                          href={`https://wa.me/${info.whatsapp}?text=Hola,%20me%20comunico%20desde%20Numismatic%20Archive.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            marginTop: 4, padding: '10px 0',
                            backgroundColor: '#25d366', borderRadius: 8,
                            textDecoration: 'none', color: '#fff',
                            fontFamily: F.mono, fontSize: 11, fontWeight: 700,
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                            transition: 'opacity 0.15s',
                          }}
                          onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
                          onMouseOut={e => e.currentTarget.style.opacity = '1'}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          Abrir en WhatsApp
                        </a>
                      )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Botones de acción header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}>
                {[
                  { icon: 'call',      title: 'Llamar',       action: () => toast.info(`Llamando a ${activeConv.name}...`) },
                  { icon: 'videocam',  title: 'Videollamada', action: () => toast.info(`Videollamada con ${activeConv.name}...`) },
                  { icon: 'more_vert', title: 'Más opciones', action: () => setMoreOptionsOpen(v => !v) },
                ].map(({ icon, title, action }) => (
                  <button key={icon} title={title} onClick={action} style={{
                    color: 'rgba(36,26,7,0.65)', background: 'none', border: 'none',
                    cursor: 'pointer', padding: 8, borderRadius: '50%', transition: 'background 0.15s',
                    display: 'flex', alignItems: 'center',
                  }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(200,169,110,0.1)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{icon}</span>
                  </button>
                ))}

                {moreOptionsOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 4,
                    width: 210, backgroundColor: C.chatPanel,
                    border: `1px solid ${C.chatBorder}`,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    borderRadius: 8, zIndex: 50, overflow: 'hidden',
                  }}>
                    {[
                      { icon: 'archive',           label: 'Archivar conversación' },
                      { icon: 'notifications_off', label: 'Silenciar notificaciones' },
                      { icon: 'delete',            label: 'Eliminar correspondencia', danger: true },
                    ].map(opt => (
                      <button key={opt.icon} onClick={() => { toast.info(`${opt.label}`); setMoreOptionsOpen(false); }} style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '11px 16px', background: 'none', border: 'none',
                        cursor: 'pointer', fontFamily: F.body, fontSize: 13,
                        color: opt.danger ? '#ef5350' : '#241a07',
                        textAlign: 'left', transition: 'background 0.15s',
                      }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(120,90,0,0.06)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: opt.danger ? '#ef5350' : C.chatGold }}>{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </header>

            {/* Canvas de mensajes */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '16px 20px',
              display: 'flex', flexDirection: 'column', gap: 4,
              scrollbarWidth: 'thin', scrollbarColor: `${C.chatGold} transparent`,
            }}>
              {/* Date pill */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <span style={{
                  padding: '4px 14px', backgroundColor: 'rgba(200,169,110,0.15)',
                  color: C.chatGold, fontFamily: F.mono, fontSize: 10,
                  borderRadius: 10, border: `1px solid rgba(200,169,110,0.2)`,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {lastMsgDate}
                </span>
              </div>

              {activeConv.messages.map((msg, idx) => {
                const isRecv = msg.type === 'recv';
                const prevMsg = activeConv.messages[idx - 1];
                const sameType = prevMsg?.type === msg.type;
                const elapsedMs = now - Number(msg.id);
                const canDelete = !isRecv && elapsedMs < 3 * 60 * 1000;
                const isHighlighted = highlightMsgId === msg.id;

                if (isRecv) {
                  return (
                    <div
                      key={msg.id}
                      ref={el => { msgRefs.current[msg.id] = el; }}
                      style={{
                        display: 'flex', justifyContent: 'flex-start',
                        maxWidth: '72%', marginBottom: sameType ? 2 : 8,
                      }}
                    >
                      <div style={{
                        backgroundColor: isHighlighted ? 'rgba(200,169,110,0.35)' : C.chatRecv,
                        padding: '8px 12px',
                        borderRadius: sameType ? '4px 18px 18px 4px' : '18px 18px 18px 4px',
                        boxShadow: isHighlighted ? '0 0 0 2px rgba(120,90,0,0.5)' : '0 1px 2px rgba(0,0,0,0.15)',
                        transition: 'background-color 0.4s, box-shadow 0.4s',
                        position: 'relative', maxWidth: '100%',
                      }}>
                        <MessageAttachment attachment={msg.attachment} sent={false} />
                        {msg.text && (
                          <p style={{ fontFamily: F.body, fontSize: 14.5, color: C.chatRecvText, lineHeight: 1.5, margin: 0 }}>
                            {msg.text}
                          </p>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
                          <span style={{ fontFamily: F.mono, fontSize: 10, color: 'rgba(36,26,7,0.4)', letterSpacing: '0.02em' }}>
                            {msg.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    ref={el => { msgRefs.current[msg.id] = el; }}
                    style={{
                      display: 'flex', justifyContent: 'flex-end', alignSelf: 'flex-end',
                      maxWidth: '72%', width: '100%', marginBottom: sameType ? 2 : 8,
                      gap: 6, alignItems: 'flex-end',
                    }}
                  >
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        title="Eliminar"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'rgba(239,83,80,0.5)', padding: 4, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', flexShrink: 0,
                          transition: 'color 0.15s',
                        }}
                        onMouseOver={e => e.currentTarget.style.color = '#ef5350'}
                        onMouseOut={e => e.currentTarget.style.color = 'rgba(239,83,80,0.5)'}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                      </button>
                    )}
                    <div style={{
                      backgroundColor: isHighlighted ? 'rgba(120,90,0,0.85)' : C.chatSent,
                      padding: '8px 12px',
                      borderRadius: sameType ? '18px 4px 4px 18px' : '18px 18px 4px 18px',
                      boxShadow: isHighlighted ? '0 0 0 2px rgba(255,223,156,0.7)' : '0 1px 2px rgba(0,0,0,0.25)',
                      transition: 'background-color 0.4s, box-shadow 0.4s',
                      position: 'relative',
                    }}>
                      <MessageAttachment attachment={msg.attachment} sent={true} />
                      {msg.text && (
                        <p style={{ fontFamily: F.body, fontSize: 14.5, color: C.chatSentText, lineHeight: 1.5, margin: 0 }}>
                          {msg.text}
                        </p>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <span style={{ fontFamily: F.mono, fontSize: 10, color: 'rgba(255,223,156,0.65)', letterSpacing: '0.02em' }}>
                          {msg.time}
                        </span>
                        <span style={{ fontSize: 12, color: C.chatCheck, lineHeight: 1 }}>✓✓</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ flexShrink: 0, padding: '10px 16px 16px', backgroundColor: C.chatPanel, borderTop: `1px solid ${C.chatBorder}` }}>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelected} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileSelected} />

              {recording ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  backgroundColor: C.chatInput, borderRadius: 24, padding: '10px 16px',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef5350', animation: 'pulse 1s infinite' }} />
                  <span style={{ fontFamily: F.mono, fontSize: 12, color: '#ef5350', fontWeight: 700, flex: 1 }}>
                    {formatDuration(recordSeconds)}
                  </span>
                  <button onClick={cancelRecording} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(36,26,7,0.55)', display: 'flex', alignItems: 'center', padding: 4,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
                  </button>
                  <button onClick={stopRecording} style={{
                    width: 36, height: 36, borderRadius: '50%', backgroundColor: C.chatCheck,
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#fff' }}>send</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  {/* Botones izquierda */}
                  <div style={{ display: 'flex', gap: 2, paddingBottom: 4 }}>
                    <div style={{ position: 'relative' }}>
                      <button
                        ref={emojiButtonRef}
                        onClick={() => {
                          if (!emojiOpen && emojiButtonRef.current) setEmojiAnchorRect(emojiButtonRef.current.getBoundingClientRect());
                          setEmojiOpen(v => !v);
                        }}
                        style={{
                          width: 38, height: 38, borderRadius: '50%', background: 'none',
                          border: 'none', cursor: 'pointer', color: 'rgba(120,90,0,0.75)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'color 0.15s',
                        }}
                        onMouseOver={e => e.currentTarget.style.color = C.chatGold}
                        onMouseOut={e => e.currentTarget.style.color = 'rgba(120,90,0,0.75)'}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>sentiment_satisfied</span>
                      </button>
                      {emojiOpen && <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setEmojiOpen(false)} anchorRect={emojiAnchorRect} />}
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{
                      width: 38, height: 38, borderRadius: '50%', background: 'none',
                      border: 'none', cursor: 'pointer', color: 'rgba(120,90,0,0.75)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                      onMouseOver={e => e.currentTarget.style.color = C.chatGold}
                      onMouseOut={e => e.currentTarget.style.color = 'rgba(120,90,0,0.75)'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 22 }}>attachment</span>
                    </button>
                    <button onClick={() => cameraInputRef.current?.click()} disabled={uploading} style={{
                      width: 38, height: 38, borderRadius: '50%', background: 'none',
                      border: 'none', cursor: 'pointer', color: 'rgba(120,90,0,0.75)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                      onMouseOver={e => e.currentTarget.style.color = C.chatGold}
                      onMouseOut={e => e.currentTarget.style.color = 'rgba(120,90,0,0.75)'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 22 }}>photo_camera</span>
                    </button>
                  </div>

                  {/* Textarea */}
                  <div style={{ flex: 1, backgroundColor: C.chatInput, borderRadius: 20, padding: '8px 16px', display: 'flex', alignItems: 'flex-end' }}>
                    <textarea
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onInput={handleTextareaInput}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Escribe un mensaje"
                      rows={1}
                      disabled={sending}
                      style={{
                        flex: 1, backgroundColor: 'transparent', border: 'none', outline: 'none',
                        resize: 'none', fontFamily: F.body, fontSize: 14.5, color: '#241a07',
                        lineHeight: 1.5, overflow: 'hidden', maxHeight: 120,
                      }}
                    />
                  </div>

                  {/* Botón enviar / micrófono */}
                  {input.trim() ? (
                    <button
                      onClick={() => handleSend()}
                      disabled={sending}
                      style={{
                        width: 44, height: 44, borderRadius: '50%',
                        backgroundColor: '#4a7c2a', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(74,124,42,0.4)', flexShrink: 0,
                        transition: 'transform 0.1s',
                      }}
                      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#fff', fontVariationSettings: "'FILL' 1" }}>send</span>
                    </button>
                  ) : (
                    <button
                      onClick={startRecording}
                      disabled={uploading}
                      style={{
                        width: 44, height: 44, borderRadius: '50%',
                        backgroundColor: '#4a7c2a', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(74,124,42,0.4)', flexShrink: 0,
                        transition: 'transform 0.1s',
                      }}
                      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#fff' }}>mic</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, opacity: 0.3 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 64, color: C.chatGold }}>mail</span>
            <p style={{ fontFamily: F.mono, fontSize: 11, color: C.chatGold, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              {convsLoading ? 'Cargando...' : 'Seleccione una correspondencia'}
            </p>
          </div>
        )}
      </section>
    </main>

    <style>{`
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      @keyframes spin { to { transform: rotate(360deg); } }
      textarea::placeholder { color: rgba(36,26,7,0.35); }
      input::placeholder { color: rgba(36,26,7,0.35); }
    `}</style>
  </div>
);
}