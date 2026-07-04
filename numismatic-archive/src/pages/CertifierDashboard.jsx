import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useWindowSize, isMobile } from '../hooks/useWindowSize.js';
import { fetchCertifications, updateCertificationAPI } from '../services/coinsService.js';
import { fetchUsers } from '../services/usersService.js';

const F = {
  display: "'Cormorant Garamond', 'Playfair Display', serif",
  body:    "'Inter', sans-serif",
  mono:    "'JetBrains Mono', monospace",
};
const C = {
  navy:        '#011e4b',
  gold:        '#785a00',
  goldLight:   '#ffdf9c',
  cream:       '#f4ece1',
  parchment:   '#fff8f2',
  parchmentLow:'#fff2df',
  inkDark:     '#241a07',
  inkLight:    '#44474f',
  outline:     '#757780',
  outlineVar:  '#c4c6d0',
  error:       '#ba1a1a',
};

function Corners() {
  const s = (t,l,r,b) => ({
    position:'absolute', width:10, height:10,
    borderTop: t ? `1px solid rgba(120,90,0,0.25)` : 'none',
    borderLeft: l ? `1px solid rgba(120,90,0,0.25)` : 'none',
    borderRight: r ? `1px solid rgba(120,90,0,0.25)` : 'none',
    borderBottom: b ? `1px solid rgba(120,90,0,0.25)` : 'none',
  });
  return (
    <>
      <div style={{ ...s(true,true,false,false), top:6, left:6 }} />
      <div style={{ ...s(true,false,true,false), top:6, right:6 }} />
      <div style={{ ...s(false,true,false,true), bottom:6, left:6 }} />
      <div style={{ ...s(false,false,true,true), bottom:6, right:6 }} />
    </>
  );
}

const TIERS = { basica:'Básica', premium:'Premium', estandar:'Estándar' };

// ── Mapeo de certificaciones reales del backend al formato del panel ──────
// Estados backend: 'En Proceso' (recién enviada), 'En Revisión' (aceptada por
// el perito), 'Aprobado', 'Rechazado', 'Cancelado'.
function mapBackendStatus(s) {
  const t = (s || '').toLowerCase();
  if (t === 'aprobado') return 'aprobado';
  if (t === 'rechazado' || t === 'cancelado') return 'rechazado';
  if (t.includes('revisión') || t.includes('revision')) return 'en_proceso';
  return 'pendiente'; // 'En Proceso' = esperando al perito
}

function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return iso; }
}

function mapCertToRequest(c) {
  const tierKey = (c.tier || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return {
    id: c.id,
    user: 'Dr. Alejandro Vega',
    userId: 'u1',
    coin: c.coinName,
    tier: ['basica','premium','estandar'].includes(tierKey) ? tierKey : 'basica',
    grade: c.coinGrade || '—',
    submitted: fmtDate(c.createdAt),
    status: mapBackendStatus(c.status),
    docs: [],
    msgs: [],
  };
}

const STATUS_META = {
  pendiente:   { label:'Pendiente',   bg:'rgba(180,120,0,0.08)', color:'#9a6700', border:'rgba(180,120,0,0.25)' },
  en_proceso:  { label:'En Proceso',  bg:'rgba(1,30,75,0.08)',   color:'#011e4b', border:'rgba(1,30,75,0.2)'   },
  aprobado:    { label:'Aprobado',    bg:'rgba(26,107,46,0.08)', color:'#1a6b2e', border:'rgba(26,107,46,0.25)' },
  rechazado:   { label:'Rechazado',   bg:'rgba(186,26,26,0.08)', color:'#ba1a1a', border:'rgba(186,26,26,0.2)'  },
};

const TIER_META = {
  basica:    { label:'Básica',    icon:'token',         color:C ? '#785a00' : '#785a00' },
  premium:   { label:'Premium',   icon:'military_tech', color:'#9a6700' },
  estandar:  { label:'Estándar',  icon:'diamond',       color:'#011e4b' },
};

export default function CertifierDashboard() {
  const { width } = useWindowSize();
  const mobile = isMobile(width);
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('solicitudes');
  const [filter, setFilter] = useState('todos');
  const [requests, setRequests] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [msgText, setMsgText] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const authUser = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem('numismatic_user') || '{}'); }
    catch { return {}; }
  }, []);

  // Solicitudes reales del backend — las mismas que crea el módulo Certificaciones
  useEffect(() => {
    fetchCertifications()
      .then(data => setRequests(data.map(mapCertToRequest)))
      .catch(() => toast.show('No se pudo cargar las solicitudes de certificación.', 'error'))
      .finally(() => setLoadingReqs(false));
    fetchUsers({ role: 'usuario' })
      .then(setClients)
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = requests.filter(r =>
    filter === 'todos' || r.status === filter
  );

  const pending    = requests.filter(r => r.status === 'pendiente').length;
  const inProgress = requests.filter(r => r.status === 'en_proceso').length;
  const approved   = requests.filter(r => r.status === 'aprobado').length;
  const rejected   = requests.filter(r => r.status === 'rechazado').length;

  const doAction = async (action) => {
    const { id, type } = action;
    const backendStatus = type === 'accept' ? 'En Revisión' : 'Rechazado';
    const localStatus   = type === 'accept' ? 'en_proceso' : 'rechazado';
    setConfirmAction(null);
    try {
      await updateCertificationAPI(id, { status: backendStatus });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: localStatus } : r));
      if (selected?.id === id) setSelected(prev => ({ ...prev, status: localStatus }));
      toast.show(type === 'accept' ? 'Solicitud aceptada. Inicie comunicación con el usuario.' : 'Solicitud rechazada.', type === 'accept' ? 'success' : 'info');
    } catch {
      toast.show('No se pudo actualizar la solicitud. Intente de nuevo.', 'error');
    }
  };

  const sendMsg = (reqId) => {
    if (!msgText.trim()) return;
    const msg = { from:'cert', text: msgText.trim(), time: 'Ahora' };
    setRequests(prev => prev.map(r => r.id === reqId ? { ...r, msgs: [...r.msgs, msg] } : r));
    setSelected(prev => ({ ...prev, msgs: [...(prev.msgs||[]), msg] }));
    setMsgText('');
  };

  return (
    <AppLayout>
      <div style={{ minHeight:'100vh', padding: mobile ? '16px' : '40px 48px' }}>

        {/* Header */}
        <div style={{ marginBottom:28 }}>
          <p style={{ fontFamily: F.mono, fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color: C.gold, marginBottom:6 }}>
            PANEL · CERTIFICADOR
          </p>
          <h1 style={{ fontFamily: F.display, fontSize: mobile ? 26 : 36, fontWeight:700, fontStyle:'italic', color: C.navy, margin:'0 0 6px' }}>
            Mesa de Certificación
          </h1>
          <p style={{ fontFamily: F.body, fontSize:14, color: C.inkLight, fontStyle:'italic', margin:0 }}>
            Bienvenido, <strong>{authUser.name}</strong>. Gestione solicitudes de autenticación numismática.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns: mobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap:12, marginBottom:28 }}>
          {[
            { label:'Pendientes',  value: pending,    icon:'pending',       color:'#9a6700' },
            { label:'En Proceso',  value: inProgress, icon:'autorenew',     color:'#011e4b' },
            { label:'Aprobadas',   value: approved,   icon:'check_circle',  color:'#1a6b2e' },
            { label:'Rechazadas',  value: rejected,   icon:'cancel',        color:'#ba1a1a' },
          ].map(s => (
            <div key={s.label} style={{ position:'relative', overflow:'hidden', backgroundColor:'#ffffff', border:`1px solid ${C.outlineVar}`, borderRadius:6, padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
              <Corners />
              <span className="material-symbols-outlined" style={{ fontSize:28, color: s.color, opacity:0.8 }}>{s.icon}</span>
              <div>
                <p style={{ fontFamily: F.mono, fontSize:24, fontWeight:700, color: C.navy, margin:0, lineHeight:1 }}>{s.value}</p>
                <p style={{ fontFamily: F.mono, fontSize:9, color: C.gold, letterSpacing:'0.1em', textTransform:'uppercase', margin:'4px 0 0' }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:0, marginBottom:24, borderBottom:`1px solid ${C.outlineVar}` }}>
          {[
            { key:'solicitudes', label:'Solicitudes' },
            { key:'usuarios',    label:'Usuarios' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding:'12px 24px', background:'none', border:'none', cursor:'pointer',
              fontFamily: tab === t.key ? F.display : F.mono,
              fontSize: tab === t.key ? 16 : 11, fontWeight:700,
              fontStyle: tab === t.key ? 'italic' : 'normal',
              color: tab === t.key ? C.navy : C.outline,
              letterSpacing: tab === t.key ? '0.01em' : '0.1em',
              textTransform: tab === t.key ? 'none' : 'uppercase',
              borderBottom: tab === t.key ? `2px solid ${C.gold}` : '2px solid transparent',
              transition:'all 0.15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ TAB: SOLICITUDES ═══ */}
        {tab === 'solicitudes' && (
          <div style={{ display:'grid', gridTemplateColumns: selected && !mobile ? '1fr 380px' : '1fr', gap:20 }}>
            {/* List */}
            <div>
              {/* Filter chips */}
              <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                {[
                  { key:'todos',      label:'Todas' },
                  { key:'pendiente',  label:'Pendientes' },
                  { key:'en_proceso', label:'En Proceso' },
                  { key:'aprobado',   label:'Aprobadas' },
                  { key:'rechazado',  label:'Rechazadas' },
                ].map(f => (
                  <button key={f.key} onClick={() => setFilter(f.key)} style={{
                    padding:'5px 14px', fontFamily: F.mono, fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase',
                    border:`1px solid ${filter===f.key ? C.gold : C.outlineVar}`,
                    backgroundColor: filter===f.key ? 'rgba(120,90,0,0.08)' : 'transparent',
                    color: filter===f.key ? C.gold : C.inkLight,
                    borderRadius:4, cursor:'pointer', transition:'all 0.15s',
                  }}>{f.label}</button>
                ))}
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {loadingReqs && (
                  <div style={{ textAlign:'center', padding:'48px 0', color: C.inkLight }}>
                    <span className="material-symbols-outlined" style={{ fontSize:40, display:'block', marginBottom:12, opacity:0.3 }}>hourglass_top</span>
                    <p style={{ fontFamily: F.body, fontSize:14, fontStyle:'italic' }}>Consultando solicitudes del Archivo...</p>
                  </div>
                )}
                {!loadingReqs && filtered.length === 0 && (
                  <div style={{ textAlign:'center', padding:'48px 0', color: C.inkLight }}>
                    <span className="material-symbols-outlined" style={{ fontSize:40, display:'block', marginBottom:12, opacity:0.3 }}>inbox</span>
                    <p style={{ fontFamily: F.body, fontSize:14, fontStyle:'italic' }}>No hay solicitudes con este filtro.</p>
                  </div>
                )}
                {filtered.map(req => {
                  const sm = STATUS_META[req.status] || STATUS_META.pendiente;
                  const tm = TIER_META[req.tier] || TIER_META.basica;
                  const isActive = selected?.id === req.id;
                  return (
                    <div
                      key={req.id}
                      onClick={() => setSelected(isActive ? null : req)}
                      style={{
                        position:'relative', overflow:'hidden',
                        backgroundColor: isActive ? 'rgba(120,90,0,0.04)' : '#ffffff',
                        border:`1px solid ${isActive ? C.gold : C.outlineVar}`,
                        borderRadius:6, padding:'16px 20px', cursor:'pointer',
                        transition:'all 0.15s',
                      }}
                      onMouseOver={e => { if (!isActive) { e.currentTarget.style.borderColor = '#ecc15d'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'; }}}
                      onMouseOut={e => { if (!isActive) { e.currentTarget.style.borderColor = C.outlineVar; e.currentTarget.style.boxShadow='none'; }}}
                    >
                      <Corners />
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                            <p style={{ fontFamily: F.body, fontSize:14, fontWeight:600, color: C.inkDark, margin:0 }}>{req.coin}</p>
                            <span style={{ padding:'2px 8px', borderRadius:9999, fontFamily: F.mono, fontSize:8, letterSpacing:'0.08em', textTransform:'uppercase', backgroundColor: sm.bg, color: sm.color, border:`1px solid ${sm.border}` }}>
                              {sm.label}
                            </span>
                          </div>
                          <p style={{ fontFamily: F.mono, fontSize:10, color: C.outline, margin:'0 0 8px', letterSpacing:'0.05em' }}>
                            {req.user} · Enviado {req.submitted}
                          </p>
                          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                            <Chip icon={tm.icon} text={tm.label} />
                            <Chip icon="grade" text={req.grade} />
                            {req.docs.length > 0 && <Chip icon="attach_file" text={`${req.docs.length} doc${req.docs.length!==1?'s':''}`} />}
                            {req.msgs.length > 0 && <Chip icon="chat" text={`${req.msgs.length} msg`} />}
                          </div>
                        </div>
                        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                          {req.status === 'pendiente' && (
                            <>
                              <button onClick={e => { e.stopPropagation(); setConfirmAction({ id:req.id, type:'accept', name:req.coin }); }}
                                style={{ padding:'6px 12px', backgroundColor:'rgba(26,107,46,0.08)', border:'1px solid rgba(26,107,46,0.3)', borderRadius:4, cursor:'pointer', fontFamily: F.mono, fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', color:'#1a6b2e', transition:'all 0.15s' }}
                                onMouseOver={e=>e.currentTarget.style.backgroundColor='rgba(26,107,46,0.15)'}
                                onMouseOut={e=>e.currentTarget.style.backgroundColor='rgba(26,107,46,0.08)'}>
                                Aceptar
                              </button>
                              <button onClick={e => { e.stopPropagation(); setConfirmAction({ id:req.id, type:'reject', name:req.coin }); }}
                                style={{ padding:'6px 12px', backgroundColor:'rgba(186,26,26,0.06)', border:'1px solid rgba(186,26,26,0.25)', borderRadius:4, cursor:'pointer', fontFamily: F.mono, fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', color:C.error, transition:'all 0.15s' }}
                                onMouseOver={e=>e.currentTarget.style.backgroundColor='rgba(186,26,26,0.12)'}
                                onMouseOut={e=>e.currentTarget.style.backgroundColor='rgba(186,26,26,0.06)'}>
                                Rechazar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detail panel */}
            {selected && (
              <div style={{ position:'relative', overflow:'hidden', backgroundColor:'#ffffff', border:`1px solid ${C.outlineVar}`, borderRadius:6, display:'flex', flexDirection:'column', maxHeight: mobile ? 'auto' : 600, alignSelf:'flex-start', position: mobile ? 'relative' : 'sticky', top: mobile ? 'auto' : 24 }}>
                <Corners />
                {/* Panel header */}
                <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.outlineVar}`, display:'flex', justifyContent:'space-between', alignItems:'center', backgroundColor: C.parchmentLow }}>
                  <div>
                    <p style={{ fontFamily: F.mono, fontSize:9, color: C.gold, letterSpacing:'0.1em', textTransform:'uppercase', margin:'0 0 3px' }}>SOLICITUD · {selected.id.toUpperCase()}</p>
                    <h3 style={{ fontFamily: F.display, fontSize:15, fontWeight:700, fontStyle:'italic', color: C.navy, margin:0 }}>{selected.user}</h3>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color: C.outline }}>
                    <span className="material-symbols-outlined" style={{ fontSize:20 }}>close</span>
                  </button>
                </div>

                {/* Coin info */}
                <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.outlineVar}` }}>
                  <p style={{ fontFamily: F.body, fontSize:13, fontWeight:600, color: C.inkDark, margin:'0 0 4px' }}>{selected.coin}</p>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <Chip icon="grade" text={selected.grade} />
                    <Chip icon={TIER_META[selected.tier]?.icon || 'token'} text={TIER_META[selected.tier]?.label || selected.tier} />
                    {(() => { const sm = STATUS_META[selected.status] || STATUS_META.pendiente; return (
                      <span style={{ padding:'2px 8px', borderRadius:9999, fontFamily: F.mono, fontSize:8, letterSpacing:'0.08em', textTransform:'uppercase', backgroundColor: sm.bg, color: sm.color, border:`1px solid ${sm.border}` }}>{sm.label}</span>
                    );})()}
                  </div>
                </div>

                {/* Docs */}
                {selected.docs.length > 0 && (
                  <div style={{ padding:'12px 20px', borderBottom:`1px solid ${C.outlineVar}` }}>
                    <p style={{ fontFamily: F.mono, fontSize:9, color: C.gold, letterSpacing:'0.12em', textTransform:'uppercase', margin:'0 0 8px' }}>DOCUMENTOS</p>
                    {selected.docs.map((d,i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', backgroundColor: C.parchmentLow, borderRadius:4, marginBottom:4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize:16, color: C.gold }}>attach_file</span>
                        <span style={{ fontFamily: F.mono, fontSize:10, color: C.inkLight }}>{d}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Chat thread */}
                <div style={{ flex:1, overflowY:'auto', padding:'12px 20px', display:'flex', flexDirection:'column', gap:8, minHeight:120, maxHeight:220 }}>
                  <p style={{ fontFamily: F.mono, fontSize:9, color: C.gold, letterSpacing:'0.12em', textTransform:'uppercase', margin:'0 0 4px' }}>COMUNICACIÓN</p>
                  {selected.msgs.length === 0 && (
                    <p style={{ fontFamily: F.body, fontSize:12, color: C.outline, fontStyle:'italic', margin:0 }}>Sin mensajes aún.</p>
                  )}
                  {selected.msgs.map((m,i) => {
                    const isCert = m.from === 'cert';
                    return (
                      <div key={i} style={{ alignSelf: isCert ? 'flex-end' : 'flex-start', maxWidth:'85%' }}>
                        <div style={{ padding:'8px 12px', borderRadius:8, backgroundColor: isCert ? C.navy : C.parchmentLow, border:`1px solid ${isCert ? 'transparent' : C.outlineVar}` }}>
                          <p style={{ fontFamily: F.body, fontSize:12, color: isCert ? '#fff' : C.inkDark, margin:0, lineHeight:1.5 }}>{m.text}</p>
                        </div>
                        <p style={{ fontFamily: F.mono, fontSize:8, color: C.outline, margin:'2px 4px 0', textAlign: isCert ? 'right' : 'left' }}>{m.time}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Message input */}
                {(selected.status === 'en_proceso' || selected.status === 'pendiente') && (
                  <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.outlineVar}`, display:'flex', gap:8 }}>
                    <input
                      value={msgText}
                      onChange={e => setMsgText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg(selected.id)}
                      placeholder="Escribir mensaje al usuario..."
                      style={{ flex:1, padding:'8px 12px', fontFamily: F.body, fontSize:13, color: C.inkDark, backgroundColor: C.parchmentLow, border:`1px solid ${C.outlineVar}`, borderRadius:4, outline:'none' }}
                      onFocus={e => e.target.style.borderColor = C.gold}
                      onBlur={e => e.target.style.borderColor = C.outlineVar}
                    />
                    <button onClick={() => sendMsg(selected.id)} style={{ width:36, height:36, borderRadius:4, backgroundColor: C.navy, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize:18, color:'#ffdf9c' }}>send</span>
                    </button>
                  </div>
                )}

                {/* Action buttons for pending */}
                {selected.status === 'pendiente' && (
                  <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.outlineVar}`, display:'flex', gap:8 }}>
                    <button onClick={() => setConfirmAction({ id:selected.id, type:'accept', name:selected.coin })} style={{ flex:1, padding:'10px', backgroundColor:'rgba(26,107,46,0.08)', border:'1px solid rgba(26,107,46,0.3)', borderRadius:4, cursor:'pointer', fontFamily: F.mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'#1a6b2e' }}>
                      Aceptar
                    </button>
                    <button onClick={() => setConfirmAction({ id:selected.id, type:'reject', name:selected.coin })} style={{ flex:1, padding:'10px', backgroundColor:'rgba(186,26,26,0.06)', border:'1px solid rgba(186,26,26,0.25)', borderRadius:4, cursor:'pointer', fontFamily: F.mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:C.error }}>
                      Rechazar
                    </button>
                  </div>
                )}

                {/* Mark as approved (if en_proceso) */}
                {selected.status === 'en_proceso' && (
                  <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.outlineVar}` }}>
                    <button onClick={async () => {
                      try {
                        await updateCertificationAPI(selected.id, { status: 'Aprobado' });
                        setRequests(prev => prev.map(r => r.id === selected.id ? { ...r, status:'aprobado' } : r));
                        setSelected(prev => ({ ...prev, status:'aprobado' }));
                        toast.show('Certificación aprobada exitosamente.', 'success');
                      } catch {
                        toast.show('No se pudo aprobar la certificación. Intente de nuevo.', 'error');
                      }
                    }} style={{ width:'100%', padding:'10px', backgroundColor: C.navy, border:`1px solid ${C.navy}`, borderRadius:4, cursor:'pointer', fontFamily: F.mono, fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'#ffdf9c' }}>
                      Aprobar Certificación
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: USUARIOS ═══ */}
        {tab === 'usuarios' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {clients.map(u => (
              <div
                key={u.id}
                style={{ position:'relative', overflow:'hidden', backgroundColor:'#ffffff', border:`1px solid ${C.outlineVar}`, borderRadius:6, padding:'16px 20px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}
              >
                <Corners />
                <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg, #5a4200, #001230)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:'2px solid rgba(255,223,156,0.2)' }}>
                  <span style={{ fontFamily: F.display, fontSize:15, fontWeight:700, fontStyle:'italic', color:'#fff', userSelect:'none' }}>
                    {u.name.split(' ').map(w=>w[0]).filter(c=>/[A-Z]/i.test(c)).slice(0,2).join('')}
                  </span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontFamily: F.body, fontSize:14, fontWeight:600, color: C.inkDark, margin:'0 0 2px' }}>{u.name}</p>
                  <p style={{ fontFamily: F.mono, fontSize:9, color: C.outline, margin:0, letterSpacing:'0.05em' }}>@{u.username}</p>
                </div>
                <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                  <StatMini icon="toll"     value={u.coins} label="monedas" />
                  <StatMini icon="verified" value={u.certifications ?? 0} label="certif." />
                  <div style={{ display:'flex', alignItems:'center', gap:4, backgroundColor:'#ffdf9c', borderRadius:9999, padding:'3px 10px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:12, color:'#251a00', fontVariationSettings:"'FILL' 1" }}>star</span>
                    <span style={{ fontFamily: F.mono, fontSize:11, fontWeight:700, color:'#251a00' }}>{u.rating}</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                  <button onClick={() => navigate(`/profile/${u.id}`)}
                    style={{ padding:'7px 14px', border:`1px solid ${C.outlineVar}`, borderRadius:4, backgroundColor:'transparent', cursor:'pointer', fontFamily: F.mono, fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', color: C.inkLight, transition:'all 0.15s', display:'flex', alignItems:'center', gap:5 }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = C.outlineVar; e.currentTarget.style.color = C.inkLight; }}>
                    <span className="material-symbols-outlined" style={{ fontSize:14 }}>person</span>
                    Ver Perfil
                  </button>
                  <button onClick={() => navigate(`/messaging`)}
                    style={{ padding:'7px 14px', border:`1px solid ${C.navy}`, borderRadius:4, backgroundColor: C.navy, cursor:'pointer', fontFamily: F.mono, fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', color:'#ffdf9c', transition:'all 0.15s', display:'flex', alignItems:'center', gap:5 }}>
                    <span className="material-symbols-outlined" style={{ fontSize:14 }}>mail</span>
                    Mensaje
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm modal */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.type === 'accept' ? 'Aceptar Solicitud' : 'Rechazar Solicitud'}
        onConfirm={() => doAction(confirmAction)}
        confirmText={confirmAction?.type === 'accept' ? 'Aceptar' : 'Rechazar'}
        confirmVariant={confirmAction?.type === 'accept' ? 'primary' : 'danger'}
      >
        <p style={{ fontFamily: F.body, fontSize:14, color: C.inkLight, lineHeight:1.7 }}>
          {confirmAction?.type === 'accept'
            ? <>¿Desea <strong>aceptar</strong> la solicitud de certificación de <strong>"{confirmAction?.name}"</strong>? Podrá comunicarse con el usuario para solicitar documentación adicional.</>
            : <>¿Desea <strong>rechazar</strong> la solicitud de certificación de <strong>"{confirmAction?.name}"</strong>? El usuario será notificado.</>
          }
        </p>
      </Modal>
    </AppLayout>
  );
}

function Chip({ icon, text }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:9999, backgroundColor:'rgba(120,90,0,0.06)', border:'1px solid rgba(120,90,0,0.15)' }}>
      <span className="material-symbols-outlined" style={{ fontSize:12, color:'#785a00' }}>{icon}</span>
      <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:9, color:'#785a00', letterSpacing:'0.05em' }}>{text}</span>
    </div>
  );
}

function StatMini({ icon, value, label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <span className="material-symbols-outlined" style={{ fontSize:14, color:'#785a00', opacity:0.7 }}>{icon}</span>
      <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:10, color:'#44474f' }}>
        <strong style={{ color:'#011e4b' }}>{value}</strong> {label}
      </span>
    </div>
  );
}
