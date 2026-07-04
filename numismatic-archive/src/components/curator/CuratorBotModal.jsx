import React, { useState, useRef, useEffect } from 'react';
import { fetchCoins, fetchAuctions, fetchSummary } from '../../services/coinsService.js';

const BOT_RESPONSES = {
  greet: {
    triggers: ['hola', 'buenos', 'buenas', 'saludos', 'hello'],
    response: 'Bienvenido al Repositorio Numismático. Soy el Archivista Digital, su asistente especializado. ¿En qué puedo ayudarle hoy? Puede preguntarme sobre inventario, subastas, certificaciones, ventas o cualquier consulta numismática.',
  },
  inventory: {
    triggers: ['inventario', 'moneda', 'pieza', 'colección', 'libro de registro'],
    response: 'El Libro de Registro Numismático contiene todas las piezas de la colección. Puede buscar por nombre, grado o casa monetaria. Para registrar una nueva pieza, use el botón "Registrar Pieza" en la parte superior del inventario. Cada pieza incluye grado, tasación y procedencia.',
  },
  auction: {
    triggers: ['subasta', 'subastar', 'puja', 'ofertar', 'lote', 'podio'],
    response: 'El Gran Podio de Puja es nuestra sala de subastas en tiempo real. Las pujas se registran en el Libro de Postores. Para participar, use el slider para seleccionar su monto y presione OFERTAR. Recuerde que su puja debe superar la puja actual. El contador muestra el tiempo restante.',
  },
  certification: {
    triggers: ['certificar', 'certificación', 'ngc', 'pcgs', 'grado', 'autenticidad'],
    response: 'Nuestro proceso de certificación incluye tres niveles: Básica ($45), Premium ($120, recomendada) y Estándar ($85). El servicio urgente tiene un recargo de $35. La certificación NGC y PCGS son las más reconocidas internacionalmente. El proceso toma entre 8 y 22 días hábiles según la urgencia.',
  },
  sales: {
    triggers: ['venta', 'vender', 'comprar', 'precio', 'transacción', 'transferencia'],
    response: 'El Registro de Transacciones muestra todas las ventas activas, solicitudes y el historial completo. Las ventas pueden estar en estado Pendiente, Completada o Cancelada. Para registrar una nueva venta, use el botón de sello de cera rojo (FAB) en la esquina inferior derecha.',
  },
  grade: {
    triggers: ['ms-65', 'ms-64', 'ef-40', 'xf', 'vf', 'mint state', 'conservación'],
    response: 'Los grados van de Poor (P-1) a Perfect Uncirculated (MS-70). Los más comunes en nuestra colección son: MS-65 (Gem Uncirculated), EF-40 (Extremely Fine), XF-45 (Choice Extremely Fine) y VF-30 (Very Fine). Un mayor grado implica mejor conservación y mayor valor.',
  },
  help: {
    triggers: ['ayuda', 'ayudar', 'cómo', 'como', 'qué', 'que', 'help', 'explicar'],
    response: 'Puedo ayudarle con:\n• 📋 Inventario — gestión de piezas y libro de registro\n• 🔨 Subastas — proceso de puja y lotes activos\n• 🏅 Certificaciones — niveles y proceso de autenticación\n• 💰 Ventas — registro y seguimiento de transacciones\n• 📬 Mensajería — comunicación con archivistas\n¿Sobre cuál tema desea saber más?',
  },
  mascots: {
    triggers: ['mascota', 'guardián', 'guardian', 'Glaukos', 'Aurelion', 'aureo'],
    response: 'Los Guardianes del Archivo son sus compañeros numismáticos. Hay 6 guardianes disponibles: Glaukos (Legendario 🦉), Aurelion (Épico 🐉), Khepri (Épico 🪲), Apu Inti (Raro 🐓), Leonidas (Raro 🦁) y Iriri (Común 🦜). Puede seleccionar su guardián desde el botón dorado en la parte superior derecha.',
  },
  default: 'Como Archivista Digital del Repositorio Numismático, mi conocimiento abarca inventario, subastas, certificaciones y transacciones. ¿Podría ser más específico en su consulta? Por ejemplo, puede preguntarme sobre el proceso de certificación, cómo realizar una puja, o cómo registrar una nueva pieza.',
};

const DYNAMIC_INTENTS = [
  {
    triggers: ['cuántas monedas', 'cuantas monedas', 'cuántas piezas', 'cuantas piezas', 'tamaño de mi colección', 'tamaño de mi coleccion', 'cuánto inventario', 'cuanto inventario'],
    handler: async () => {
      const coins = await fetchCoins();
      const active = coins.filter(c => c.status !== 'sold');
      const sold = coins.filter(c => c.status === 'sold');
      return `Su archivo registra actualmente ${coins.length} pieza${coins.length !== 1 ? 's' : ''} en total: ${active.length} activa${active.length !== 1 ? 's' : ''} en inventario y ${sold.length} ya vendida${sold.length !== 1 ? 's' : ''}.`;
    },
  },
  {
    triggers: ['próxima subasta', 'proxima subasta', 'subasta más cercana', 'subasta mas cercana', 'cuándo es la subasta', 'cuando es la subasta', 'qué subastas', 'que subastas'],
    handler: async () => {
      const auctions = await fetchAuctions();
      const upcoming = auctions
        .filter(a => a.status === 'active' && a.auctionDate)
        .sort((a, b) => new Date(a.auctionDate) - new Date(b.auctionDate))[0];
      if (!upcoming) return 'No hay subastas activas registradas en este momento en el Gran Podio de Puja.';
      const date = new Date(upcoming.auctionDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
      return `Su próxima subasta activa es para "${upcoming.coinName}" el ${date}, con puja inicial de S/. ${Number(upcoming.startingBid).toLocaleString('es-PE')} en ${upcoming.auctionHouse || 'la casa de subastas registrada'}.`;
    },
  },
  {
    triggers: ['cuánto llevo recaudado', 'cuanto llevo recaudado', 'cuánto he recaudado', 'cuanto he recaudado', 'total recaudado', 'mis ganancias', 'cuánto he ganado', 'cuanto he ganado', 'valor de mi inventario', 'valor del inventario'],
    handler: async () => {
      const summary = await fetchSummary();
      return `Hasta el momento ha recaudado S/. ${summary.totalCollected.toLocaleString('es-PE')} en ventas completadas. Tiene S/. ${summary.pendingAmount.toLocaleString('es-PE')} pendientes de cobro (${summary.pendingCount} venta${summary.pendingCount !== 1 ? 's' : ''}), y su inventario activo está valorizado en S/. ${summary.activeInventoryValue.toLocaleString('es-PE')} (${summary.activeInventoryCount} pieza${summary.activeInventoryCount !== 1 ? 's' : ''}).`;
    },
  },
  {
    triggers: ['mi pieza más valiosa', 'mi pieza mas valiosa', 'moneda más cara', 'moneda mas cara', 'pieza más cara', 'pieza mas cara'],
    handler: async () => {
      const coins = await fetchCoins();
      const active = coins.filter(c => c.status !== 'sold');
      if (active.length === 0) return 'No hay piezas activas registradas en su inventario actualmente.';
      const top = active.reduce((max, c) => Number(c.estimatedValue || 0) > Number(max.estimatedValue || 0) ? c : max, active[0]);
      return `Su pieza de mayor valor en inventario es "${top.name}", tasada en S/. ${Number(top.estimatedValue || 0).toLocaleString('es-PE')}.`;
    },
  },
];

function getStaticResponse(text) {
  const lower = text.toLowerCase();
  for (const key of Object.keys(BOT_RESPONSES)) {
    if (key === 'default') continue;
    if (BOT_RESPONSES[key].triggers.some(t => lower.includes(t))) {
      return BOT_RESPONSES[key].response;
    }
  }
  return BOT_RESPONSES.default;
}

async function getBotResponse(text) {
  const lower = text.toLowerCase();

  // Primero revisa intenciones dinámicas (requieren backend)
  for (const intent of DYNAMIC_INTENTS) {
    if (intent.triggers.some(t => lower.includes(t))) {
      try {
        return await intent.handler();
      } catch {
        return 'No pude consultar esa información del archivo en este momento. Verifique que el sistema esté conectado e inténtelo de nuevo.';
      }
    }
  }

  // Si no coincide con nada dinámico, usa las respuestas estáticas
  return getStaticResponse(text);
}

function formatTime(date) {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

const SESSION_KEY = 'numismatic_curator_chat';
const SESSION_TTL_MS = 3 * 60 * 1000; // 3 minutos

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.lastActivity > SESSION_TTL_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed.messages;
  } catch { return null; }
}

function saveSession(messages) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ messages, lastActivity: Date.now() }));
  } catch {}
}

const WELCOME_MESSAGE = {
  id: 1,
  type: 'bot',
  text: 'Bienvenido al Repositorio Numismático. Soy el Archivista Digital. ¿En qué puedo servirle hoy?',
  time: formatTime(new Date()),
};

export default function CuratorBotModal({ onClose }) {
  const [messages, setMessages] = useState(() => loadSession() || [WELCOME_MESSAGE]);

  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    saveSession(messages);
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now(), type: 'user', text: input, time: formatTime(new Date()) };
    setMessages(prev => [...prev, userMsg]);
    const query = input;
    setInput('');
    setTyping(true);

    const [botText] = await Promise.all([
      getBotResponse(query),
      new Promise(resolve => setTimeout(resolve, 900)), // delay mínimo para que se sienta natural
    ]);

    setTyping(false);
    setMessages(prev => [...prev, { id: Date.now(), type: 'bot', text: botText, time: formatTime(new Date()) }]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }`}</style>
      <div style={{ position: 'fixed', bottom: 100, right: 24, width: 360, height: 480, borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', zIndex: 55, display: 'flex', flexDirection: 'column' }}>
        <div style={{ backgroundColor: '#011e4b', height: 56, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'radial-gradient(circle, #b22222 0%, #8b0000 70%, #5e0000 100%)',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#ffdf9c' }}>
                smart_toy
              </span>
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontStyle: 'italic', color: '#ffdf9c', lineHeight: 1.2 }}>Archivista Digital</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e' }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,223,156,0.7)' }}>En línea</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => {
                sessionStorage.removeItem(SESSION_KEY);
                setMessages([{ ...WELCOME_MESSAGE, id: Date.now(), time: formatTime(new Date()) }]);
              }}
              title="Nueva conversación"
              aria-label="Iniciar nueva conversación"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,223,156,0.6)', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 4 }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,223,156,0.6)', fontSize: 22, lineHeight: 1, padding: 4, display: 'flex', alignItems: 'center' }}>×</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, backgroundColor: '#f6f0e8', display: 'flex', flexDirection: 'column' }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%', marginBottom: 8 }}>
              <div style={msg.type === 'user'
                ? { backgroundColor: '#011e4b', color: '#ffdf9c', borderRadius: '12px 12px 2px 12px', padding: '10px 14px', fontSize: 14, fontFamily: "'Inter', sans-serif", lineHeight: 1.5, whiteSpace: 'pre-wrap' }
                : { backgroundColor: 'white', border: '1px solid rgba(196,198,208,0.4)', borderRadius: '12px 12px 12px 2px', padding: '10px 14px', fontSize: 14, fontFamily: "'Inter', sans-serif", color: '#241a07', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {msg.text}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#757780', marginTop: 3, textAlign: msg.type === 'user' ? 'right' : 'left' }}>{msg.time}</div>
            </div>
          ))}
          {typing && (
            <div style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 4, padding: '10px 14px', backgroundColor: 'white', borderRadius: '12px 12px 12px 2px', border: '1px solid rgba(196,198,208,0.4)' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#785a00', animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: 12, borderTop: '1px solid rgba(196,198,208,0.3)', backgroundColor: 'white', display: 'flex', gap: 8, flexShrink: 0 }}>
          <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Escriba su consulta..." style={{ flex: 1, border: '1px solid #c4c6d0', borderRadius: 6, padding: '8px 12px', fontFamily: "'Inter', sans-serif", fontSize: 14, outline: 'none', color: '#241a07' }} />
          <button onClick={handleSend} style={{ width: 36, height: 36, backgroundColor: '#011e4b', color: '#ffdf9c', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>send</span>
          </button>
        </div>
      </div>
    </>
  );
}
