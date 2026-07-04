import React, { useMemo, useState, useEffect } from 'react';
import { BACKEND_URL } from '../utils/constants.js';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import CoinImage from '../components/ui/CoinImage.jsx';
import { imageService } from '../services/imageService.js';
import { useWindowSize, isMobile } from '../hooks/useWindowSize.js';
import { fetchUser } from '../services/usersService.js';
import { fetchCoins, fetchCertifications, fetchAuctions } from '../services/coinsService.js';

const COIN_IMGS = [
  imageService.coin('coin-01.png'),
  imageService.coin('coin-02.png'),
  imageService.coin('coin-03.png'),
  imageService.coin('coin-04.png'),
];

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
  parchmentLow:'#fff2df',
  inkDark:    '#241a07',
  inkLight:   '#44474f',
  outline:    '#757780',
  outlineVar: '#c4c6d0',
};

function getAuthUser() {
  try { return JSON.parse(localStorage.getItem('numismatic_user') || '{}'); }
  catch { return {}; }
}

// Convierte una moneda del backend al formato que espera InventoryGrid
function mapCoin(c, i) {
  return {
    id: c.id || i,
    name: c.name,
    year: c.year,
    grade: c.grade,
    value: typeof c.estimatedValue === 'number' ? `S/. ${c.estimatedValue.toLocaleString('es-PE')}` : (c.estimatedValue || '—'),
    status: c.status || 'active',
    mint: c.mint,
  };
}

const BADGES = [
  { icon:'workspace_premium', color:'#ffdf9c', bg:'rgba(255,223,156,0.15)', border:'rgba(255,223,156,0.35)', title:'Coleccionista de Oro', desc:'Registró más de 10 piezas certificadas en el archivo.' },
  { icon:'military_tech',     color:'#cbd5e1', bg:'rgba(203,213,225,0.15)', border:'rgba(203,213,225,0.35)', title:'Archivista de Plata', desc:'Completó 5 ventas verificadas en el registro histórico.' },
  { icon:'stars',             color:'#fb923c', bg:'rgba(251,146,60,0.15)',  border:'rgba(251,146,60,0.35)',  title:'Explorador de Bronce', desc:'Primera subasta registrada en el Gran Podio de Puja.' },
];

function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return iso; }
}

function mapCert(c) {
  return {
    id: c.id,
    coin: c.coinName,
    grade: c.coinGrade || '',
    tier: c.tier,
    date: fmtDate(c.createdAt),
    status: c.status,
  };
}

function mapAuction(a) {
  return {
    id: a.id,
    coin: a.coinName,
    bid: `S/. ${(a.currentBid || a.startingBid || 0).toLocaleString('es-PE')}`,
    lotRef: a.lotRef,
    ends: fmtDate(a.auctionDate),
    status: a.status,
  };
}

function SectionHeader({ icon, title }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, paddingBottom:10, borderBottom:`1px solid ${C.outlineVar}` }}>
      <span className="material-symbols-outlined" style={{ fontSize:20, color: C.gold }}>{icon}</span>
      <h2 style={{ fontFamily: F.display, fontSize:18, fontWeight:700, fontStyle:'italic', color: C.navy, margin:0 }}>{title}</h2>
    </div>
  );
}

function Card({ children, style, 'data-tutorial': dataTutorial }) {
  return (
    <div data-tutorial={dataTutorial} style={{
      position:'relative', overflow:'hidden',
      backgroundColor:'#ffffff', border:`1px solid ${C.outlineVar}`,
      borderRadius:6, padding:24, ...style,
    }}>
      <Corners />
      {children}
    </div>
  );
}

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

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { width } = useWindowSize();
  const mobile = isMobile(width);
  const authUser = getAuthUser();

  const targetId = id === 'me' ? (authUser.id || 'u1') : id;
  const isMe = id === 'me' || (authUser.id && id === authUser.id);

  const [profileUser, setProfileUser] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [myCoins, setMyCoins] = useState(null);

  useEffect(() => {
    setLoadingProfile(true);
    fetchUser(targetId)
      .then(setProfileUser)
      .catch(() => setProfileUser(null))
      .finally(() => setLoadingProfile(false));
  }, [targetId]);

  const [myCerts, setMyCerts] = useState([]);
  const [myAuctions, setMyAuctions] = useState([]);

  // El inventario propio es real; el de terceros solo muestra su resumen numérico
  useEffect(() => {
    if (!isMe) { setMyCoins(null); setMyCerts([]); setMyAuctions([]); return; }
    fetchCoins()
      .then(data => setMyCoins(data.map(mapCoin)))
      .catch(() => setMyCoins([]));
    fetchCertifications()
      .then(data => setMyCerts(data.slice(0, 4).map(mapCert)))
      .catch(() => {});
    fetchAuctions()
      .then(data => setMyAuctions(data.slice(0, 4).map(mapAuction)))
      .catch(() => {});
  }, [isMe]);

  if (loadingProfile) {
    return (
      <AppLayout>
        <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color: C.inkLight }}>
          <p style={{ fontFamily: F.body, fontSize:15, fontStyle:'italic' }}>Consultando el registro del erudito...</p>
        </div>
      </AppLayout>
    );
  }

  if (!profileUser) {
    return (
      <AppLayout>
        <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, color: C.inkLight }}>
          <span className="material-symbols-outlined" style={{ fontSize:48, opacity:0.3 }}>person_off</span>
          <p style={{ fontFamily: F.body, fontSize:15, fontStyle:'italic' }}>Este erudito no figura en el registro del Archivo.</p>
          <button onClick={() => navigate('/search')} style={{ marginTop:8, padding:'10px 24px', border:`1px solid ${C.gold}`, color: C.gold, fontFamily: F.mono, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', borderRadius:4, backgroundColor:'transparent', cursor:'pointer' }}>
            Volver al Directorio
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ minHeight:'100vh', padding: mobile ? '16px' : '40px 48px', maxWidth: 900, margin:'0 auto' }}>

        {/* Breadcrumb */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:24 }}>
          <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, color: C.gold, fontFamily: F.mono, fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', padding:0 }}>
            <span className="material-symbols-outlined" style={{ fontSize:16 }}>arrow_back</span>
            Volver
          </button>
          <span style={{ color: C.outlineVar, fontSize:12 }}>/</span>
          <span style={{ fontFamily: F.mono, fontSize:10, color: C.outline, letterSpacing:'0.1em', textTransform:'uppercase' }}>
            {isMe ? 'Mi Perfil' : 'Perfil de Erudito'}
          </span>
        </div>

        {/* Hero card */}
        <Card data-tutorial="profile-header" style={{ marginBottom:20, background: 'linear-gradient(135deg, #011e4b 0%, #1c3461 100%)' }}>
          <div style={{ display:'flex', gap: mobile ? 16 : 28, alignItems: mobile ? 'flex-start' : 'center', flexWrap: mobile ? 'wrap' : 'nowrap' }}>
            {/* Avatar */}
            <div style={{
              width: mobile ? 72 : 96, height: mobile ? 72 : 96, borderRadius:'50%', flexShrink:0,
              background:'linear-gradient(135deg, #5a4200 0%, #001230 100%)',
              display:'flex', alignItems:'center', justifyContent:'center',
              border:'3px solid rgba(255,223,156,0.4)',
              boxShadow:'0 4px 16px rgba(0,0,0,0.4), 0 0 24px rgba(255,223,156,0.1)',
            }}>
              <span style={{ fontFamily: F.display, fontSize: mobile ? 26 : 34, fontWeight:700, fontStyle:'italic', color:'#ffffff', userSelect:'none' }}>
                {profileUser.name.split(' ').map(w=>w[0]).filter(c=>/[A-Z]/i.test(c)).slice(0,2).join('')}
              </span>
            </div>

            {/* Info */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:6 }}>
                <h1 style={{ fontFamily: F.display, fontSize: mobile ? 22 : 30, fontWeight:700, fontStyle:'italic', color:'#ffdf9c', margin:0, lineHeight:1.1 }}>
                  {profileUser.name}
                </h1>
                {isMe && (
                  <span style={{ padding:'3px 10px', borderRadius:9999, backgroundColor:'rgba(255,223,156,0.15)', border:'1px solid rgba(255,223,156,0.3)', fontFamily: F.mono, fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(255,223,156,0.8)' }}>
                    MI PERFIL
                  </span>
                )}
              </div>
              <p style={{ fontFamily: F.mono, fontSize:10, color:'rgba(255,223,156,0.6)', letterSpacing:'0.15em', textTransform:'uppercase', margin:'0 0 8px' }}>
                @{profileUser.username} · {profileUser.roleLabel}
              </p>
              <p style={{ fontFamily: F.body, fontSize:13, color:'rgba(255,255,255,0.7)', fontStyle:'italic', margin:'0 0 16px', lineHeight:1.6 }}>
                {profileUser.bio}
              </p>

              <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                <InfoChip icon="location_on" text={profileUser.location} />
                <InfoChip icon="calendar_month" text={`Desde ${profileUser.joined}`} />
                <div style={{ display:'flex', alignItems:'center', gap:4, backgroundColor:'#ffdf9c', borderRadius:9999, padding:'4px 12px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:14, fontVariationSettings:"'FILL' 1", color:'#251a00' }}>star</span>
                  <span style={{ fontFamily: F.mono, fontSize:12, fontWeight:700, color:'#251a00' }}>{profileUser.rating}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Logros / Insignias */}
        {(isMe || profileUser.role === 'usuario') && (
          <Card style={{ marginBottom:20 }}>
            <SectionHeader icon="workspace_premium" title="Insignias y Logros" />
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              {BADGES.map(b => (
                <div key={b.icon} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:6, backgroundColor: b.bg, border:`1px solid ${b.border}`, flex:1, minWidth: mobile ? '100%' : 200 }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', backgroundColor: b.bg, border:`1px solid ${b.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize:22, color: b.color, fontVariationSettings:"'FILL' 1" }}>{b.icon}</span>
                  </div>
                  <div>
                    <p style={{ fontFamily: F.mono, fontSize:10, fontWeight:700, letterSpacing:'0.05em', color: b.color, margin:'0 0 3px', textTransform:'uppercase' }}>{b.title}</p>
                    <p style={{ fontFamily: F.body, fontSize:12, color: C.inkLight, margin:0, lineHeight:1.5 }}>{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats resumen */}
            <div style={{ display:'grid', gridTemplateColumns: mobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap:12, marginTop:20, paddingTop:20, borderTop:`1px solid ${C.outlineVar}` }}>
              {[
                { icon:'toll',    label:'Monedas',     value: isMe && myCoins ? myCoins.length : (profileUser.coins ?? 0) },
                { icon:'verified',label:'Certificadas',value: profileUser.certifications ?? 0 },
                { icon:'gavel',   label:'Subastas',    value: profileUser.auctions ?? 0 },
                { icon:'star',    label:'Reputación',  value: profileUser.rating ?? '—' },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center', padding:'12px 8px', backgroundColor: C.parchmentLow, borderRadius:4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:24, color: C.gold, display:'block', marginBottom:6 }}>{s.icon}</span>
                  <p style={{ fontFamily: F.mono, fontSize:18, fontWeight:700, color: C.navy, margin:'0 0 2px' }}>{s.value}</p>
                  <p style={{ fontFamily: F.mono, fontSize:9, color: C.outline, margin:0, letterSpacing:'0.1em', textTransform:'uppercase' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap:20 }}>

          {/* Inventario — real para el perfil propio; los ajenos son privados */}
          <Card style={{ gridColumn: mobile ? '1' : '1 / -1' }}>
            <SectionHeader icon="toll" title="Inventario" />
            {isMe ? (
              myCoins === null ? (
                <p style={{ fontFamily: F.body, fontSize:14, fontStyle:'italic', color: C.inkLight, textAlign:'center', padding:'24px 0' }}>
                  Consultando el inventario...
                </p>
              ) : (
                <InventoryGrid coins={myCoins} mobile={mobile} />
              )
            ) : (
              <div style={{ textAlign:'center', padding:'32px 0', color: C.inkLight }}>
                <span className="material-symbols-outlined" style={{ fontSize:36, display:'block', marginBottom:10, opacity:0.3 }}>lock</span>
                <p style={{ fontFamily: F.body, fontSize:14, fontStyle:'italic', margin:0 }}>
                  El detalle del inventario de otros eruditos es privado. Este archivo registra {profileUser.coins ?? 0} pieza{(profileUser.coins ?? 0) !== 1 ? 's' : ''}.
                </p>
              </div>
            )}
          </Card>

          {/* Certificaciones recientes — reales para el perfil propio */}
          <Card>
            <SectionHeader icon="verified" title="Certificaciones Recientes" />
            {!isMe ? (
              <p style={{ fontFamily: F.body, fontSize:13, fontStyle:'italic', color: C.inkLight, textAlign:'center', padding:'20px 0' }}>
                Historial privado · {profileUser.certifications ?? 0} certificaciones registradas.
              </p>
            ) : myCerts.length === 0 ? (
              <p style={{ fontFamily: F.body, fontSize:13, fontStyle:'italic', color: C.inkLight, textAlign:'center', padding:'20px 0' }}>
                Sin certificaciones registradas todavía.
              </p>
            ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {myCerts.map(cert => {
                const isApproved = cert.status === 'Aprobado';
                const isPending = /en proceso/i.test(cert.status);
                const sc = isApproved
                  ? { bg:'rgba(26,107,46,0.08)', color:'#1a6b2e', border:'rgba(26,107,46,0.25)' }
                  : isPending
                    ? { bg:'rgba(180,120,0,0.08)', color:'#9a6700', border:'rgba(180,120,0,0.25)' }
                    : { bg:'rgba(186,26,26,0.08)', color:'#ba1a1a', border:'rgba(186,26,26,0.25)' };
                return (
                  <div key={cert.id} style={{ padding:'12px 14px', backgroundColor: C.parchmentLow, borderRadius:4, borderLeft:`3px solid ${sc.color}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                      <div>
                        <p style={{ fontFamily: F.body, fontSize:13, fontWeight:600, color: C.inkDark, margin:'0 0 3px' }}>{cert.coin}</p>
                        <p style={{ fontFamily: F.mono, fontSize:9, color: C.outline, margin:0, letterSpacing:'0.05em' }}>{cert.tier} · {cert.grade} · {cert.date}</p>
                      </div>
                      <span style={{ padding:'3px 10px', borderRadius:9999, fontFamily: F.mono, fontSize:8, letterSpacing:'0.08em', textTransform:'uppercase', backgroundColor: sc.bg, color: sc.color, border:`1px solid ${sc.border}`, flexShrink:0 }}>
                        {cert.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </Card>

          {/* Subastas recientes — reales para el perfil propio */}
          <Card style={{ gridColumn: mobile ? '1' : '1 / -1' }}>
            <SectionHeader icon="gavel" title="Subastas Recientes" />
            {!isMe ? (
              <p style={{ fontFamily: F.body, fontSize:13, fontStyle:'italic', color: C.inkLight, textAlign:'center', padding:'20px 0' }}>
                Historial privado · {profileUser.auctions ?? 0} subastas registradas.
              </p>
            ) : myAuctions.length === 0 ? (
              <p style={{ fontFamily: F.body, fontSize:13, fontStyle:'italic', color: C.inkLight, textAlign:'center', padding:'20px 0' }}>
                Sin subastas registradas todavía.
              </p>
            ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {myAuctions.map(a => (
                <div key={a.id} style={{ display:'flex', alignItems:'center', gap:16, padding:'12px 16px', backgroundColor: C.parchmentLow, borderRadius:4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:24, color: a.status === 'active' ? C.gold : C.outline }}>gavel</span>
                  <div style={{ flex:1 }}>
                    <p style={{ fontFamily: F.body, fontSize:13, fontWeight:600, color: C.inkDark, margin:'0 0 2px' }}>{a.coin}</p>
                    <p style={{ fontFamily: F.mono, fontSize:9, color: C.outline, margin:0, letterSpacing:'0.05em' }}>
                      {a.lotRef ? `${a.lotRef} · ` : ''}Cierra {a.ends}
                    </p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontFamily: F.mono, fontSize:14, fontWeight:700, color: C.navy, margin:'0 0 4px' }}>{a.bid}</p>
                    <span style={{
                      padding:'2px 10px', borderRadius:9999, fontFamily: F.mono, fontSize:8, letterSpacing:'0.08em', textTransform:'uppercase',
                      backgroundColor: a.status === 'active' ? 'rgba(26,107,46,0.08)' : 'rgba(0,0,0,0.05)',
                      color: a.status === 'active' ? '#1a6b2e' : C.outline,
                      border: `1px solid ${a.status === 'active' ? 'rgba(26,107,46,0.25)' : C.outlineVar}`,
                    }}>
                      {a.status === 'active' ? 'En curso' : 'Finalizada'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function InventoryGrid({ coins = [], mobile }) {
  const [filter, setFilter] = React.useState('all');
  const [view, setView] = React.useState('grid');
  const [search, setSearch] = React.useState('');

  const filtered = coins.filter(c => {
    const matchF = filter === 'all' || c.status === filter;
    const matchS = !search || c.name.toLowerCase().includes(search.toLowerCase()) || String(c.year).includes(search);
    return matchF && matchS;
  });

  return (
    <div>
      {/* Controles */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:1, minWidth:160, position:'relative' }}>
          <span className="material-symbols-outlined" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:16, color: C.outline, pointerEvents:'none' }}>search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en inventario..."
            style={{ width:'100%', boxSizing:'border-box', paddingLeft:32, paddingRight:10, paddingTop:7, paddingBottom:7, fontFamily: F.body, fontSize:13, color: C.inkDark, backgroundColor: C.parchmentLow, border:`1px solid ${C.outlineVar}`, borderRadius:4, outline:'none' }}
            onFocus={e => e.target.style.borderColor = C.gold}
            onBlur={e => e.target.style.borderColor = C.outlineVar}
          />
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[{k:'all',l:'Todas'},{k:'active',l:'Activas'},{k:'certified',l:'Certificadas'}].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)} style={{
              padding:'6px 12px', fontFamily: F.mono, fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase',
              border:`1px solid ${filter===f.k ? C.gold : C.outlineVar}`,
              backgroundColor: filter===f.k ? 'rgba(120,90,0,0.08)' : 'transparent',
              color: filter===f.k ? C.gold : C.inkLight,
              borderRadius:4, cursor:'pointer', transition:'all 0.15s',
            }}>{f.l}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {['grid_view','view_list'].map((ic, i) => (
            <button key={ic} onClick={() => setView(i===0?'grid':'list')} style={{
              width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center',
              border:`1px solid ${(i===0?'grid':'list')===view ? C.gold : C.outlineVar}`,
              backgroundColor: (i===0?'grid':'list')===view ? 'rgba(120,90,0,0.08)' : 'transparent',
              borderRadius:4, cursor:'pointer',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize:18, color:(i===0?'grid':'list')===view ? C.gold : C.outline }}>{ic}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {view === 'grid' ? (
        <div style={{ display:'grid', gridTemplateColumns: mobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap:14 }}>
          {filtered.map((coin, idx) => {
            const cert = coin.status === 'certified';
            const imgSrc = coin.imageUrl
              ? `${BACKEND_URL}${coin.imageUrl}`
              : COIN_IMGS[idx % COIN_IMGS.length];
            return (
              <div key={coin.id}
                style={{ position:'relative', overflow:'hidden', backgroundColor:'#ffffff', border:`1px solid ${cert ? 'rgba(26,107,46,0.3)' : C.outlineVar}`, borderRadius:10, padding:'12px 12px 14px', textAlign:'center', transition:'all 0.18s', cursor:'default', boxShadow:'0 2px 10px rgba(0,0,0,0.06)' }}
                onMouseOver={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.12)'; }}
                onMouseOut={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,0.06)'; }}
              >
                {cert && (
                  <div style={{ position:'absolute', top:8, right:8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize:14, color:'#1a6b2e', fontVariationSettings:"'FILL' 1" }}>verified</span>
                  </div>
                )}
                {/* Imagen de moneda */}
                <div style={{ width:72, height:72, borderRadius:'50%', margin:'0 auto 10px', overflow:'hidden', border:'3px solid rgba(120,90,0,0.15)', boxShadow:'0 4px 16px rgba(0,0,0,0.15), inset 0 2px 6px rgba(0,0,0,0.12)', backgroundColor:'#e8dfd1' }}>
                  <CoinImage src={imgSrc} alt={coin.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                </div>
                <p style={{ fontFamily: F.body, fontSize:12, fontWeight:600, color: C.inkDark, margin:'0 0 2px', lineHeight:1.3 }}>{coin.name}</p>
                <p style={{ fontFamily: F.mono, fontSize:9, color: C.outline, margin:'0 0 8px', letterSpacing:'0.05em' }}>{coin.year} · {coin.mint}</p>
                <span style={{ padding:'2px 8px', borderRadius:9999, fontFamily: F.mono, fontSize:8, letterSpacing:'0.06em', textTransform:'uppercase', backgroundColor:'rgba(1,30,75,0.07)', color: C.navy, border:`1px solid rgba(1,30,75,0.15)` }}>{coin.grade}</span>
                <p style={{ fontFamily: F.mono, fontSize:12, fontWeight:700, color: C.gold, margin:'8px 0 0' }}>{coin.value}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map((coin, idx) => {
            const cert = coin.status === 'certified';
            const imgSrc = coin.imageUrl
              ? `${BACKEND_URL}${coin.imageUrl}`
              : COIN_IMGS[idx % COIN_IMGS.length];
            return (
              <div key={coin.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', backgroundColor:'#ffffff', border:`1px solid ${cert ? 'rgba(26,107,46,0.2)' : C.outlineVar}`, borderRadius:8, boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ width:42, height:42, borderRadius:'50%', overflow:'hidden', flexShrink:0, border:'2px solid rgba(120,90,0,0.15)', boxShadow:'0 2px 8px rgba(0,0,0,0.12)', backgroundColor:'#e8dfd1' }}>
                  <CoinImage src={imgSrc} alt={coin.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontFamily: F.body, fontSize:13, fontWeight:600, color: C.inkDark, margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{coin.name}</p>
                  <p style={{ fontFamily: F.mono, fontSize:9, color: C.outline, margin:0, letterSpacing:'0.05em' }}>{coin.year} · {coin.mint} · {coin.grade}</p>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <p style={{ fontFamily: F.mono, fontSize:12, fontWeight:700, color: C.navy, margin:'0 0 2px' }}>{coin.value}</p>
                  <span style={{ padding:'2px 8px', borderRadius:9999, fontFamily: F.mono, fontSize:8, letterSpacing:'0.08em', textTransform:'uppercase', backgroundColor: cert ? 'rgba(26,107,46,0.08)' : 'rgba(1,30,75,0.06)', color: cert ? '#1a6b2e' : C.navy, border:`1px solid ${cert ? 'rgba(26,107,46,0.25)' : 'rgba(1,30,75,0.15)'}` }}>
                    {cert ? 'Certificada' : 'Activa'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'32px 0', color: C.outline }}>
          <span className="material-symbols-outlined" style={{ fontSize:36, display:'block', marginBottom:8, opacity:0.3 }}>inventory_2</span>
          <p style={{ fontFamily: F.body, fontSize:13, fontStyle:'italic', margin:0 }}>Sin monedas con este filtro.</p>
        </div>
      )}
    </div>
  );
}

function InfoChip({ icon, text }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <span className="material-symbols-outlined" style={{ fontSize:14, color:'rgba(255,223,156,0.5)' }}>{icon}</span>
      <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:10, color:'rgba(255,255,255,0.55)', letterSpacing:'0.05em' }}>{text}</span>
    </div>
  );
}