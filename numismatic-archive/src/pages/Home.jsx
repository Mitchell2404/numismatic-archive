import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import { fetchActivity, fetchPosts, createPostAPI, uploadPostImage, updatePostAPI, addCommentAPI, fetchSummary, fetchCoins, fetchAuctions } from '../services/coinsService.js';
import { useWindowSize, isMobile } from '../hooks/useWindowSize.js';
import { DS } from '../styles/tokens.js';
import { imageService } from '../services/imageService.js';

// ── Mock users para búsqueda global ───────────────────────────────────────────
const SEARCH_USERS = [
  { id:'u1', name:'Dr. Alejandro Vega',  username:'dr.alejandro.vega', roleLabel:'Curador' },
  { id:'u2', name:'Dra. María Castillo', username:'maria.castillo',    roleLabel:'Archivista' },
  { id:'u3', name:'Carlos Mendoza',       username:'carlos.mendoza',    roleLabel:'Coleccionista' },
  { id:'u4', name:'Elena Reyes',          username:'elena.reyes',       roleLabel:'Erudita' },
  { id:'u5', name:'Jorge Luna',           username:'jorge.luna',        roleLabel:'Numismático' },
  { id:'u6', name:'Patricia Santos',      username:'patricia.santos',   roleLabel:'Archivista' },
];

// ── Tabs de navegación social ──────────────────────────────────────────────────
const SOCIAL_TABS = [
  { key:'noticias', label:'Noticias',  icon:'newspaper',     path:null },
  { key:'mensajes', label:'Mensajes',  icon:'mail',          path:'/messaging' },
  { key:'usuarios', label:'Usuarios',  icon:'person_search', path:'/search' },
];

// ── Comentario individual ──────────────────────────────────────────────────────
function Comment({ author, text, time }) {
  const initials = author.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        backgroundColor: '#e8dfd1', border: '1px solid rgba(120,90,0,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        fontFamily: DS.fontMono, fontSize: 10, fontWeight: 700, color: '#785a00',
      }}>{initials}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
          <span style={{ fontFamily: DS.fontBody, fontSize: 13, fontWeight: 700, color: DS.inkDark }}>{author}</span>
          <span style={{ fontFamily: DS.fontMono, fontSize: 9, color: DS.outline, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{time}</span>
        </div>
        <p style={{ fontFamily: DS.fontBody, fontSize: 13, color: DS.inkLight, lineHeight: 1.5, margin: 0 }}>{text}</p>
      </div>
    </div>
  );
}

// ── Sección de comentarios expandible ─────────────────────────────────────────
function CommentsSection({ postId, initialComments, isPersistent }) {
  const [comments, setComments] = useState(initialComments || []);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);

    if (isPersistent) {
      try {
        const updated = await addCommentAPI(postId, { author: 'Dr. Alejandro Vega', text: input.trim() });
        setComments(updated.comments);
        setInput('');
      } catch {
        // si falla, igual lo mostramos local para no bloquear UX
        setComments(prev => [...prev, { id: Date.now(), author: 'Dr. Alejandro Vega', text: input.trim(), time: 'ahora' }]);
        setInput('');
      } finally {
        setSending(false);
      }
    } else {
      setTimeout(() => {
        setComments(prev => [
          ...prev,
          { id: Date.now(), author: 'Dr. Alejandro Vega', text: input.trim(), time: 'ahora' },
        ]);
        setInput('');
        setSending(false);
      }, 400);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{
      backgroundColor: 'rgba(255,255,255,0.4)',
      borderTop: '1px solid rgba(0,0,0,0.06)',
      padding: '14px 20px 16px',
    }}>
      {comments.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {comments.map(c => <Comment key={c.id} author={c.author} text={c.text} time={c.time} />)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          backgroundColor: '#e8dfd1', border: '1px solid rgba(120,90,0,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          fontFamily: DS.fontMono, fontSize: 11, fontWeight: 700, color: '#785a00',
        }}>AV</div>
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Añade un comentario..."
            rows={1}
            style={{
              width: '100%',
              padding: '8px 44px 8px 14px',
              fontFamily: DS.fontBody, fontSize: 13,
              color: DS.inkDark,
              backgroundColor: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(196,198,208,0.5)',
              borderRadius: 20,
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              lineHeight: 1.5,
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = '#785a00'}
            onBlur={e => e.target.style.borderColor = 'rgba(196,198,208,0.5)'}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            aria-label="Enviar comentario"
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none',
              cursor: input.trim() ? 'pointer' : 'default',
              color: input.trim() ? '#785a00' : '#c4c6d0',
              display: 'flex', alignItems: 'center',
              transition: 'color 0.2s', padding: 4,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>send</span>
          </button>
        </div>
      </div>

      {comments.length === 0 && (
        <p style={{ fontFamily: DS.fontMono, fontSize: 10, color: DS.outline, textAlign: 'center', marginTop: 10, letterSpacing: '0.05em' }}>
          Sé el primero en comentar
        </p>
      )}
    </div>
  );
}

// ── Post social unificado ──────────────────────────────────────────────────────
function FeedPost({ post, onUpdate }) {
  const [likes, setLikes]               = useState(post.likes || 0);
  const [favs, setFavs]                 = useState(post.favs || 0);
  const [likeScale, setLikeScale]       = useState(false);
  const [favScale, setFavScale]         = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [bookmarked, setBookmarked]     = useState(false);
  const commentCount                    = post.comments?.length || 0;
  const isPersistent                    = post.id?.startsWith('POST-');

  const bump = (type) => {
    if (type === 'like') {
      const newVal = likes + 1;
      setLikes(newVal); setLikeScale(true); setTimeout(() => setLikeScale(false), 300);
      if (isPersistent) updatePostAPI(post.id, { likes: newVal }).catch(() => {});
    } else {
      const newVal = favs + 1;
      setFavs(newVal); setFavScale(true); setTimeout(() => setFavScale(false), 300);
      if (isPersistent) updatePostAPI(post.id, { favs: newVal }).catch(() => {});
    }
  };

  const initials = post.author.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <article style={{
      backgroundColor: DS.cream,
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      position: 'relative',
    }}>
      <div className="corner-tab corner-tl" /><div className="corner-tab corner-tr" />

      {/* ── Cabecera ── */}
      <div style={{ padding: '18px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            backgroundColor: post.avatarBg || DS.parchmentLow,
            border: '1px solid rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, overflow: 'hidden',
          }}>
            {post.avatarIcon ? (
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: post.avatarColor || DS.inkLight }}>
                {post.avatarIcon}
              </span>
            ) : (
              <span style={{ fontFamily: DS.fontMono, fontSize: 13, fontWeight: 700, color: post.avatarColor || '#785a00' }}>
                {initials}
              </span>
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h3 style={{
                fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
                fontSize: 18, fontWeight: 700, color: DS.navy, fontStyle: 'italic', margin: 0,
              }}>
                {post.author}
              </h3>
              {post.role && (
                <span style={{
                  border: `2px solid ${post.roleColor || DS.navy}`,
                  color: post.roleColor || DS.navy,
                  padding: '1px 7px', textTransform: 'uppercase',
                  fontWeight: 700, fontFamily: DS.fontMono,
                  borderRadius: 2, fontSize: 8, letterSpacing: '0.08em',
                  transform: 'rotate(-2deg)', display: 'inline-block',
                }}>
                  {post.role}
                </span>
              )}
            </div>
            <p style={{ fontFamily: DS.fontMono, fontSize: 9, letterSpacing: '0.05em', textTransform: 'uppercase', color: DS.outline, opacity: 0.7, marginTop: 3 }}>
              {post.time}{post.category ? ` • ${post.category}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* ── Cuerpo ── */}
      <div style={{ padding: '0 20px 14px' }}>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 15, color: DS.inkDark, lineHeight: 1.7,
          borderLeft: '3px solid rgba(120,90,0,0.25)',
          paddingLeft: 16, paddingTop: 6, paddingBottom: 6,
          fontStyle: 'italic', margin: 0,
          background: 'rgba(120,90,0,0.02)',
        }}>
          {post.body}
        </p>

        {post.badge && (
          <div style={{
            marginTop: 12, padding: '8px 14px',
            backgroundColor: 'rgba(46,28,1,0.04)',
            borderLeft: '4px solid #2e1c01',
            borderRadius: '0 4px 4px 0',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span className="material-symbols-outlined" style={{ color: '#2e1c01', fontSize: 16 }}>workspace_premium</span>
            <span style={{ fontFamily: DS.fontMono, fontSize: 9, fontWeight: 700, color: '#2e1c01', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {post.badge}
            </span>
          </div>
        )}
      </div>

      {/* ── Imágenes ── */}
      {post.images && post.images.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: post.images.length === 1 ? '1fr' : '1fr 1fr',
          gap: 2,
          backgroundColor: 'rgba(0,0,0,0.07)',
          padding: 2,
        }}>
          {post.images.map((src, i) => (
            <div key={i} style={{ height: post.images.length === 1 ? 260 : 200, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.5)' }}>
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in', display: 'block' }} />
            </div>
          ))}
        </div>
      )}
      {post.image && !post.images && (
        <div style={{ height: 240, overflow: 'hidden', padding: '0 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={post.image} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
      )}

      {/* ── Barra de reacciones ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px',
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderTop: '1px dotted rgba(120,90,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

          {/* Like */}
          <button onClick={() => bump('like')} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: '1px solid rgba(1,30,75,0.15)',
            borderRadius: 3, padding: '5px 12px', cursor: 'pointer',
            transition: 'all 0.15s', color: DS.inkLight,
          }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(1,30,75,0.4)'; e.currentTarget.style.background = 'rgba(1,30,75,0.04)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(1,30,75,0.15)'; e.currentTarget.style.background = 'none'; }}
          >
            <span className="material-symbols-outlined" style={{
              fontSize: 15, color: DS.navy,
              transform: likeScale ? 'scale(1.3)' : 'scale(1)', transition: 'transform 0.2s',
              fontVariationSettings: "'FILL' 0",
            }}>thumb_up</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: DS.inkLight }}>{likes}</span>
          </button>

          {/* Fav */}
          <button onClick={() => bump('fav')} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: '1px solid rgba(120,90,0,0.15)',
            borderRadius: 3, padding: '5px 12px', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(120,90,0,0.4)'; e.currentTarget.style.background = 'rgba(120,90,0,0.04)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(120,90,0,0.15)'; e.currentTarget.style.background = 'none'; }}
          >
            <span className="material-symbols-outlined" style={{
              fontSize: 15, color: DS.gold,
              transform: favScale ? 'scale(1.3)' : 'scale(1)', transition: 'transform 0.2s',
              fontVariationSettings: "'FILL' 0",
            }}>favorite</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: DS.inkLight }}>{favs}</span>
          </button>

          {/* Comentarios */}
          <button onClick={() => setCommentsOpen(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: commentsOpen ? 'rgba(120,90,0,0.06)' : 'none',
            border: `1px solid ${commentsOpen ? 'rgba(120,90,0,0.3)' : 'rgba(0,0,0,0.1)'}`,
            borderRadius: 3, padding: '5px 12px', cursor: 'pointer',
            transition: 'all 0.15s', color: commentsOpen ? DS.gold : DS.outline,
          }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(120,90,0,0.3)'; }}
            onMouseOut={e => { if (!commentsOpen) e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>chat_bubble_outline</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
              {commentCount}
            </span>
          </button>
        </div>

        {/* Bookmark */}
        <button onClick={() => setBookmarked(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'none',
          border: `1px solid ${bookmarked ? 'rgba(120,90,0,0.4)' : 'rgba(0,0,0,0.1)'}`,
          borderRadius: 3, padding: '5px 10px', cursor: 'pointer',
          color: bookmarked ? DS.gold : DS.outline, transition: 'all 0.15s',
        }}>
          <span className="material-symbols-outlined" style={{
            fontSize: 15,
            fontVariationSettings: bookmarked ? "'FILL' 1" : "'FILL' 0",
            transition: 'all 0.2s',
          }}>bookmark</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {bookmarked ? 'Guardado' : 'Guardar'}
          </span>
        </button>
      </div>

      {/* ── Comentarios desplegables ── */}
      {commentsOpen && (
        <CommentsSection postId={post.id} initialComments={post.comments || []} isPersistent={isPersistent} />
      )}
    </article>
  );
}

// ── Página Home ────────────────────────────────────────────────────────────────
export default function Home() {
  const { width } = useWindowSize();
  const mobile    = isMobile(width);
  const navigate  = useNavigate();
  const [postText, setPostText]           = useState('');
  const [searchVal, setSearchVal]         = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef                = useRef(null);
  const [postImage, setPostImage]         = useState(null);
  const [postTags, setPostTags]           = useState([]);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [showTagPanel, setShowTagPanel]   = useState(false);
  const [userPosts, setUserPosts]         = useState([]);
  const [postsLoading, setPostsLoading]   = useState(true);
  const [publishing, setPublishing]       = useState(false);

  const [postsError, setPostsError] = useState(false);

  useEffect(() => {
    setPostsError(false);
    fetchPosts()
      .then(data => {
        setUserPosts(data.map(p => ({
          id: p.id,
          author: p.author,
          role: null,
          avatarBg: DS.parchmentLow,
          avatarColor: DS.gold,
          avatarIcon: 'person',
          time: new Date(p.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
          category: 'Publicación',
          body: p.body,
          image: p.imageUrl ? `http://localhost:3001${p.imageUrl}` : null,
          images: null,
          likes: p.likes || 0,
          favs: p.favs || 0,
          comments: p.comments || [],
        })));
      })
      .catch(() => setPostsError(true))
      .finally(() => setPostsLoading(false));
  }, []);

  const fileInputRef                      = useRef(null);
  const textareaRef                       = useRef(null);
  // Tutorial is managed in AppLayout — dispatch event to trigger it
  const [activity, setActivity]           = useState([]);
  const [notifOpen, setNotifOpen]         = useState(false);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    fetchActivity()
      .then(setActivity)
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  }, []);


  const [summary, setSummary]             = useState(null);
  const [summaryOpen, setSummaryOpen]     = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    fetchSummary()
      .then(setSummary)
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, []);

  const [featuredCoins, setFeaturedCoins]   = useState([]);
  const [nextAuction, setNextAuction]       = useState(null);
  const [discoverLoading, setDiscoverLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchCoins(), fetchAuctions()])
      .then(([coins, auctions]) => {
        // Monedas activas (no vendidas), ordenadas por valor estimado descendente, top 2
        const topCoins = coins
          .filter(c => c.status !== 'sold')
          .sort((a, b) => Number(b.estimatedValue || 0) - Number(a.estimatedValue || 0))
          .slice(0, 2);
        setFeaturedCoins(topCoins);

        // Subasta activa más próxima a su fecha
        const upcoming = auctions
          .filter(a => a.status === 'active' && a.auctionDate)
          .sort((a, b) => new Date(a.auctionDate) - new Date(b.auctionDate))[0];
        setNextAuction(upcoming || null);
      })
      .catch(() => {})
      .finally(() => setDiscoverLoading(false));
  }, []);

  const activityPosts = useMemo(() => activity.map(ev => ({
    id: ev.id,
    author: ev.type === 'sale' ? 'Registro de Ventas' : 'Sala de Subastas',
    role: ev.type === 'sale' ? 'VENTAS' : 'SUBASTA',
    roleColor: ev.type === 'sale' ? '#1a6b2e' : '#011e4b',
    avatarBg: ev.type === 'sale' ? 'rgba(26,107,46,0.1)' : '#011e4b',
    avatarColor: ev.type === 'sale' ? '#1a6b2e' : '#ffdf9c',
    avatarIcon: ev.type === 'sale' ? 'sell' : 'gavel',
    time: new Date(ev.timestamp).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
    category: ev.title,
    body: `${ev.coinName} — ${ev.detail}`,
    images: null, image: null,
    likes: 0, favs: 0, comments: [],
  })), [activity]);

  const combinedPosts = useMemo(() => [...userPosts, ...activityPosts], [userPosts, activityPosts]);

  // ── Búsqueda global (monedas + publicaciones + usuarios) ───────────────────
  const globalResults = useMemo(() => {
    const q = searchVal.trim().toLowerCase();
    if (q.length < 2) return null;
    const coins = featuredCoins.filter(c =>
      c.name?.toLowerCase().includes(q) || c.mint?.toLowerCase().includes(q) || String(c.year).includes(q)
    ).slice(0, 3);
    const posts = combinedPosts.filter(p =>
      p.body?.toLowerCase().includes(q) || p.author?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
    ).slice(0, 3);
    const users = SEARCH_USERS.filter(u =>
      u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
    ).slice(0, 4);
    if (!coins.length && !posts.length && !users.length) return { empty: true, coins, posts, users };
    return { empty: false, coins, posts, users };
  }, [searchVal, featuredCoins, combinedPosts]);

  const showSearchDropdown = searchFocused && searchVal.trim().length >= 2 && globalResults;

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredNews = useMemo(() => {
    if (!searchVal.trim()) return combinedPosts;
    const q = searchVal.toLowerCase();
    return combinedPosts.filter(p =>
      p.body.toLowerCase().includes(q) ||
      p.author.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  }, [searchVal, combinedPosts]);

  const allPosts = searchVal.trim()
    ? filteredNews
    : [...userPosts, ...activityPosts];

  // ── Cerrar paneles al hacer clic fuera ──
  React.useEffect(() => {
    if (!showEmojiPanel && !showTagPanel && !notifOpen && !summaryOpen) return;
    const handleClick = (e) => {
      if (!e.target.closest('[data-panel="publish"]')) {
        setShowEmojiPanel(false);
        setShowTagPanel(false);
      }
      if (notifOpen && !e.target.closest('[data-panel="notifications"]')) {
        setNotifOpen(false);
      }
      if (summaryOpen && !e.target.closest('[data-panel="summary"]')) {
        setSummaryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showEmojiPanel, showTagPanel, notifOpen, summaryOpen]);

  const TAGGABLE_FRIENDS = [
    { id: 'f1', name: 'Instituto Numismático Europeo', initials: 'IN' },
    { id: 'f2', name: 'Dr. Ernesto Villanueva',        initials: 'EV' },
    { id: 'f3', name: 'Prof. Ricardo Medina',          initials: 'RM' },
    { id: 'f4', name: 'Lic. Carmen Solís',             initials: 'CS' },
    { id: 'f5', name: 'Fundación Colón',               initials: 'FC' },
    { id: 'f6', name: 'Marco Aurelio V.',              initials: 'MA' },
    { id: 'f7', name: 'NGC — Certificaciones',         initials: 'NG' },
    { id: 'f8', name: 'CoinVaultPRO',                  initials: 'CV' },
  ];

  const EMOJI_GROUPS = [
    { label: 'Frecuentes',   emojis: ['😊','😂','🎉','👍','❤️','🔥','✨','💯','🙏','👏','🤩','😍'] },
    { label: 'Numismática',  emojis: ['🪙','🏛️','⚜️','🗝️','📜','🏺','🦅','🦉','💰','🥇','🎖️','🔍'] },
    { label: 'Expresiones',  emojis: ['😮','🤔','😎','🤝','💪','👀','🎯','⭐','🌟','💎','🏆','📊'] },
  ];

  const insertEmoji = (emoji) => {
    const ta = textareaRef.current;
    if (!ta) { setPostText(p => p + emoji); return; }
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    setPostText(postText.slice(0, start) + emoji + postText.slice(end));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + emoji.length, start + emoji.length); }, 0);
    setShowEmojiPanel(false);
  };

  const handleImageFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPostImage({ url: URL.createObjectURL(file), name: file.name, file });
    e.target.value = '';
  };

  const toggleTag = (friend) => {
    setPostTags(prev =>
      prev.find(f => f.id === friend.id)
        ? prev.filter(f => f.id !== friend.id)
        : [...prev, friend]
    );
  };

  const handlePublish = async () => {
    if (!postText.trim() && !postImage) return;
    setPublishing(true);
    try {
      let imageUrl = null;
      if (postImage?.file) {
        const uploaded = await uploadPostImage(postImage.file);
        imageUrl = uploaded.url;
      }

      const tagText = postTags.length > 0 ? ` — con ${postTags.map(f => f.name).join(', ')}` : '';

      const created = await createPostAPI({
        author: 'Dr. Alejandro Vega',
        body: postText.trim() + tagText,
        imageUrl,
        tags: postTags.map(f => f.name),
      });

      setUserPosts(prev => [{
        id: created.id,
        author: created.author,
        role: null,
        avatarBg: DS.parchmentLow,
        avatarColor: DS.gold,
        avatarIcon: 'person',
        time: 'ahora',
        category: 'Publicación',
        body: created.body,
        image: created.imageUrl ? `http://localhost:3001${created.imageUrl}` : null,
        images: null,
        likes: 0, favs: 0, comments: [],
      }, ...prev]);

      setPostText('');
      setPostImage(null);
      setPostTags([]);
      setShowEmojiPanel(false);
      setShowTagPanel(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AppLayout>
      {/* ── Top App Bar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        backgroundColor: 'rgba(255,242,223,0.88)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(196,198,208,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px 0 64px', height: 64,
      }}>
        <span style={{
          fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
          fontSize: mobile ? 20 : 26, fontWeight: 700, color: DS.navy,
          fontStyle: 'italic', letterSpacing: '-0.01em',
        }}>
          Numismatic Archives
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: mobile ? 10 : 18 }}>
          {!mobile && (
            <div ref={searchContainerRef} style={{ position: 'relative', width: 280 }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: DS.outline, fontSize: 18, pointerEvents: 'none', zIndex: 1 }}>search</span>
              <input
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Buscar monedas, publicaciones, usuarios..."
                aria-label="Búsqueda global del archivo"
                style={{ width: '100%', paddingLeft: 34, paddingRight: searchVal ? 28 : 12, paddingTop: 7, paddingBottom: 7, fontFamily: DS.fontBody, fontSize: 13, color: DS.inkDark, backgroundColor: 'rgba(255,255,255,0.5)', border: 'none', borderBottom: `1px solid ${searchFocused ? DS.gold : DS.outlineVar}`, outline: 'none', fontStyle: 'italic', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              />
              {searchVal && (
                <button onClick={() => { setSearchVal(''); setSearchFocused(false); }} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: DS.outline, display: 'flex', padding: 2 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                </button>
              )}

              {/* Dropdown resultados globales */}
              {showSearchDropdown && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                  width: 340, backgroundColor: '#ffffff',
                  border: '1px solid rgba(196,179,145,0.4)',
                  borderRadius: 12, boxShadow: '0 12px 40px rgba(1,30,75,0.15), 0 2px 8px rgba(0,0,0,0.08)',
                  zIndex: 200, overflow: 'hidden',
                }}>
                  {globalResults.empty ? (
                    <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 28, color: DS.outline, display: 'block', marginBottom: 6, opacity: 0.4 }}>search_off</span>
                      <p style={{ fontFamily: DS.fontMono, fontSize: 10, color: DS.outline, letterSpacing: '0.1em', margin: 0 }}>Sin resultados para "{searchVal}"</p>
                    </div>
                  ) : (
                    <>
                      {/* Monedas */}
                      {globalResults.coins.length > 0 && (
                        <SearchSection label="Monedas" icon="toll">
                          {globalResults.coins.map(c => (
                            <SearchRow key={c.id} icon="toll" iconColor={DS.gold} title={c.name} sub={`${c.mint || ''}${c.year ? ` · ${c.year}` : ''}`} onClick={() => { navigate('/ledger'); setSearchVal(''); setSearchFocused(false); }} />
                          ))}
                        </SearchSection>
                      )}
                      {/* Publicaciones */}
                      {globalResults.posts.length > 0 && (
                        <SearchSection label="Publicaciones" icon="article">
                          {globalResults.posts.map(p => (
                            <SearchRow key={p.id} icon="article" iconColor={DS.navy} title={p.author} sub={p.body?.slice(0, 60) + (p.body?.length > 60 ? '…' : '')} onClick={() => { setSearchVal(''); setSearchFocused(false); }} />
                          ))}
                        </SearchSection>
                      )}
                      {/* Usuarios */}
                      {globalResults.users.length > 0 && (
                        <SearchSection label="Usuarios" icon="person_search">
                          {globalResults.users.map(u => (
                            <SearchRow key={u.id} icon="person" iconColor="#785a00" title={u.name} sub={`@${u.username} · ${u.roleLabel}`} onClick={() => { navigate(`/profile/${u.id}`); setSearchVal(''); setSearchFocused(false); }} />
                          ))}
                        </SearchSection>
                      )}
                      <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(196,198,208,0.3)', display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => { navigate(`/search?q=${encodeURIComponent(searchVal)}`); setSearchVal(''); setSearchFocused(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: DS.fontMono, fontSize: 9, color: DS.gold, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                          Ver todos los resultados
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => { localStorage.removeItem('numismatic_tutorial_done'); window.dispatchEvent(new Event('numismatic:start-tutorial')); }}
            title="Ver tutorial"
            aria-label="Relanzar tutorial"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.outline, display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6, transition: 'color 0.2s' }}
            onMouseOver={e => e.currentTarget.style.color = DS.gold}
            onMouseOut={e => e.currentTarget.style.color = DS.outline}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>help_outline</span>
          </button>
          <div data-panel="notifications" style={{ position: 'relative' }}>
            <button
              onClick={() => setNotifOpen(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: notifOpen ? DS.gold : DS.inkLight, position: 'relative',
                display: 'flex', alignItems: 'center',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
              {activity.length > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: -2,
                  width: 8, height: 8, borderRadius: '50%',
                  backgroundColor: '#ba1a1a', border: '1.5px solid #fff8f2',
                }} />
              )}
            </button>

            {notifOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 10,
                width: 320, maxHeight: 420, overflowY: 'auto',
                backgroundColor: '#ffffff',
                border: '1px solid rgba(196,179,145,0.4)',
                borderRadius: 12, boxShadow: '0 12px 40px rgba(1,30,75,0.15), 0 2px 8px rgba(0,0,0,0.08)',
                zIndex: 100,
              }}>
                <div style={{
                  padding: '14px 18px', borderBottom: '1px solid rgba(196,198,208,0.4)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <p style={{
                    fontFamily: "'Cormorant Garamond', serif", fontSize: 16,
                    fontWeight: 700, fontStyle: 'italic', color: DS.navy, margin: 0,
                  }}>Actividad Reciente</p>
                  <button onClick={() => setNotifOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.outline, display: 'flex' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                  </button>
                </div>

                {activityLoading ? (
                  <p style={{ padding: 24, fontFamily: DS.fontMono, fontSize: 11, color: DS.outline, textAlign: 'center' }}>
                    Cargando...
                  </p>
                ) : activity.length === 0 ? (
                  <p style={{ padding: 24, fontFamily: DS.fontMono, fontSize: 11, color: DS.outline, textAlign: 'center' }}>
                    Sin actividad reciente
                  </p>
                ) : (
                  activity.map(ev => (
                    <div key={ev.id} style={{
                      padding: '12px 18px', borderBottom: '1px solid rgba(196,198,208,0.2)',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}>
                      <span className="material-symbols-outlined" style={{
                        fontSize: 18, color: ev.type === 'sale' ? '#1a6b2e' : DS.navy,
                        flexShrink: 0, marginTop: 2,
                      }}>
                        {ev.type === 'sale' ? 'sell' : 'gavel'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: DS.fontBody, fontSize: 12, fontWeight: 700, color: DS.inkDark, margin: 0 }}>
                          {ev.title}
                        </p>
                        <p style={{ fontFamily: DS.fontBody, fontSize: 12, color: DS.inkLight, margin: '2px 0', fontStyle: 'italic' }}>
                          {ev.coinName}
                        </p>
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: DS.outline, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {ev.detail}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          {!mobile && (
            <div data-panel="summary" style={{ position: 'relative' }}>
              <button
                onClick={() => setSummaryOpen(v => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: summaryOpen ? DS.gold : DS.inkLight,
                  display: 'flex', alignItems: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>account_balance_wallet</span>
              </button>

              {summaryOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 10,
                  width: 300,
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(196,179,145,0.4)',
                  borderRadius: 12, boxShadow: '0 12px 40px rgba(1,30,75,0.15), 0 2px 8px rgba(0,0,0,0.08)',
                  zIndex: 100, overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '14px 18px', borderBottom: '1px solid rgba(196,198,208,0.4)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    backgroundColor: 'rgba(1,30,75,0.04)',
                  }}>
                    <p style={{
                      fontFamily: "'Cormorant Garamond', serif", fontSize: 16,
                      fontWeight: 700, fontStyle: 'italic', color: DS.navy, margin: 0,
                    }}>Resumen del Archivo</p>
                    <button onClick={() => setSummaryOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DS.outline, display: 'flex' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                    </button>
                  </div>

                  {summaryLoading ? (
                    <p style={{ padding: 24, fontFamily: DS.fontMono, fontSize: 11, color: DS.outline, textAlign: 'center' }}>
                      Cargando...
                    </p>
                  ) : !summary ? (
                    <p style={{ padding: 24, fontFamily: DS.fontMono, fontSize: 11, color: DS.outline, textAlign: 'center' }}>
                      No se pudo cargar el resumen
                    </p>
                  ) : (
                    <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                      {/* Total recaudado */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 0', borderBottom: '1px dotted rgba(196,198,208,0.5)',
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#1a6b2e' }}>paid</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontFamily: DS.fontMono, fontSize: 9, color: DS.outline, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                            Total Recaudado
                          </p>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#1a6b2e', margin: 0 }}>
                            S/. {summary.totalCollected.toLocaleString('es-PE')}
                          </p>
                        </div>
                      </div>

                      {/* Pendiente de cobro */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 0', borderBottom: '1px dotted rgba(196,198,208,0.5)',
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: DS.gold }}>pending_actions</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontFamily: DS.fontMono, fontSize: 9, color: DS.outline, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                            Pendiente de Cobro
                          </p>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: DS.gold, margin: 0 }}>
                            S/. {summary.pendingAmount.toLocaleString('es-PE')}
                          </p>
                          <p style={{ fontFamily: DS.fontMono, fontSize: 9, color: DS.outline, margin: '2px 0 0' }}>
                            {summary.pendingCount} venta{summary.pendingCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Valor del inventario activo */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: DS.navy }}>inventory_2</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontFamily: DS.fontMono, fontSize: 9, color: DS.outline, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                            Valor del Inventario Activo
                          </p>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: DS.navy, margin: 0 }}>
                            S/. {summary.activeInventoryValue.toLocaleString('es-PE')}
                          </p>
                          <p style={{ fontFamily: DS.fontMono, fontSize: 9, color: DS.outline, margin: '2px 0 0' }}>
                            {summary.activeInventoryCount} pieza{summary.activeInventoryCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <Link to="/ledger" onClick={() => setSummaryOpen(false)}>
                        <button style={{
                          width: '100%', marginTop: 4, padding: '8px 0',
                          border: '1px solid rgba(1,30,75,0.2)', backgroundColor: 'transparent',
                          color: DS.navy, fontFamily: DS.fontMono, fontSize: 10, fontWeight: 700,
                          letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
                        }}>
                          Ver Inventario Completo
                        </button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #785a00 0%, #011e4b 100%)',
            border: '2px solid rgba(255,223,156,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 13, fontWeight: 700, fontStyle: 'italic',
              color: '#ffdf9c', userSelect: 'none',
            }}>DA</span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{
        display: 'grid',
        gridTemplateColumns: mobile ? '1fr' : '1fr 320px',
        gap: mobile ? 16 : 24,
        padding: mobile ? '16px 16px 48px 16px' : '24px 24px 48px 24px',
        backgroundImage: 'radial-gradient(circle, #C8A96E 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        minHeight: 'calc(100vh - 64px)',
        alignItems: 'flex-start',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}>

        {/* ── Feed central ── */}
        <section
          id="news-feed"
          data-tutorial="home-feed"
          style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          {/* ── Navegación rápida social ── */}
          <div style={{
            display: 'flex', backgroundColor: '#ffffff',
            border: '1px solid rgba(196,198,208,0.5)',
            borderRadius: 8, overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            {SOCIAL_TABS.map((tab, i) => {
              const isActive = tab.key === 'noticias';
              return (
                <button
                  key={tab.key}
                  onClick={() => tab.path && navigate(tab.path)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '13px 8px',
                    background: isActive ? DS.navy : 'transparent',
                    border: 'none',
                    borderRight: i < SOCIAL_TABS.length - 1 ? '1px solid rgba(196,198,208,0.4)' : 'none',
                    cursor: tab.path ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                    fontFamily: isActive ? "'Cormorant Garamond', 'Playfair Display', serif" : DS.fontMono,
                    fontSize: isActive ? 15 : 10,
                    fontWeight: 700,
                    fontStyle: isActive ? 'italic' : 'normal',
                    color: isActive ? '#ffdf9c' : DS.inkLight,
                    letterSpacing: isActive ? '0.02em' : '0.1em',
                    textTransform: isActive ? 'none' : 'uppercase',
                  }}
                  onMouseOver={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(1,30,75,0.04)'; e.currentTarget.style.color = DS.navy; } }}
                  onMouseOut={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = DS.inkLight; } }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Caja de publicación funcional ── */}
          <div className="folio-card" data-panel="publish" style={{ padding: 20, overflow: 'visible', position: 'relative' }}>
            <div className="corner-tab corner-tl" /><div className="corner-tab corner-tr" />
            <div className="corner-tab corner-bl" /><div className="corner-tab corner-br" />

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageFile} style={{ display: 'none' }} aria-label="Seleccionar imagen" />

            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                background: 'linear-gradient(135deg, #785a00 0%, #011e4b 100%)',
                border: '2px solid rgba(255,223,156,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <span style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 16, fontWeight: 700, fontStyle: 'italic',
                  color: '#ffdf9c', userSelect: 'none',
                }}>DA</span>
              </div>
              <div style={{ flex: 1 }}>
                <textarea
                  ref={textareaRef}
                  value={postText}
                  onChange={e => setPostText(e.target.value)}
                  placeholder="¿Qué hay de nuevo en tu colección?"
                  rows={3}
                  style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.45)', border: 'none', borderRadius: 8, padding: '12px 14px', fontFamily: DS.fontBody, fontSize: 14, fontStyle: 'italic', color: DS.inkDark, resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }}
                />

                {/* Preview de imagen */}
                {postImage && (
                  <div style={{ position: 'relative', marginTop: 8, borderRadius: 8, overflow: 'hidden', maxHeight: 200 }}>
                    <img src={postImage.url} alt="Preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block', borderRadius: 8 }} />
                    <button onClick={() => setPostImage(null)} aria-label="Quitar imagen" style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'white' }}>close</span>
                    </button>
                    <div style={{ position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '2px 8px', fontFamily: DS.fontMono, fontSize: 10, color: 'white' }}>{postImage.name}</div>
                  </div>
                )}

                {/* Chips de etiquetas */}
                {postTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {postTags.map(f => (
                      <span key={f.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, backgroundColor: 'rgba(1,30,75,0.08)', border: '1px solid rgba(1,30,75,0.2)', borderRadius: 12, padding: '3px 10px', fontFamily: DS.fontMono, fontSize: 10, color: DS.navy, letterSpacing: '0.03em' }}>
                        @{f.name}
                        <button onClick={() => toggleTag(f)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: DS.navy, opacity: 0.5 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Barra inferior */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingLeft: 56, position: 'relative' }}>
              <div style={{ display: 'flex', gap: 2, position: 'relative' }}>

                {/* Botón imagen */}
                <button onClick={() => fileInputRef.current?.click()} title="Adjuntar imagen" aria-label="Adjuntar imagen"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: postImage ? DS.gold : DS.inkLight, padding: '6px 8px', borderRadius: 6, transition: 'color 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: postImage ? "'FILL' 1" : "'FILL' 0" }}>photo</span>
                </button>

                {/* Botón emojis */}
                <button onClick={() => { setShowEmojiPanel(v => !v); setShowTagPanel(false); }} title="Insertar emoji" aria-label="Abrir panel de emojis"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: showEmojiPanel ? DS.gold : DS.inkLight, padding: '6px 8px', borderRadius: 6, transition: 'color 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>mood</span>
                </button>

                {/* Botón etiquetas */}
                <button onClick={() => { setShowTagPanel(v => !v); setShowEmojiPanel(false); }} title="Etiquetar persona" aria-label="Etiquetar contacto"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: (postTags.length > 0 || showTagPanel) ? DS.gold : DS.inkLight, padding: '6px 8px', borderRadius: 6, position: 'relative', transition: 'color 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>sell</span>
                  {postTags.length > 0 && (
                    <span style={{ position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: '50%', backgroundColor: DS.gold, color: 'white', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DS.fontMono }}>{postTags.length}</span>
                  )}
                </button>

                {/* Panel de emojis */}
                {showEmojiPanel && (
                  <div style={{ position: 'absolute', top: 42, left: 0, backgroundColor: '#fff8f2', border: '1px solid rgba(196,198,208,0.5)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', padding: 12, width: 280, zIndex: 100 }}>
                    {EMOJI_GROUPS.map(group => (
                      <div key={group.label} style={{ marginBottom: 10 }}>
                        <p style={{ fontFamily: DS.fontMono, fontSize: 9, color: DS.outline, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{group.label}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                          {group.emojis.map(emoji => (
                            <button key={emoji} onClick={() => insertEmoji(emoji)} title={emoji}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: '4px 5px', borderRadius: 6, lineHeight: 1, transition: 'background 0.15s' }}
                              onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.07)'}
                              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >{emoji}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Panel de etiquetas */}
                {showTagPanel && (
                  <div style={{ position: 'absolute', top: 42, left: 40, backgroundColor: '#fff8f2', border: '1px solid rgba(196,198,208,0.5)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', padding: 8, width: 240, zIndex: 100 }}>
                    <p style={{ fontFamily: DS.fontMono, fontSize: 9, color: DS.outline, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 8px 8px', margin: 0 }}>Etiquetar persona</p>
                    {TAGGABLE_FRIENDS.map(friend => {
                      const isTagged = postTags.find(f => f.id === friend.id);
                      return (
                        <button key={friend.id} onClick={() => toggleTag(friend)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, backgroundColor: isTagged ? 'rgba(1,30,75,0.07)' : 'transparent', textAlign: 'left' }}
                          onMouseOver={e => { if (!isTagged) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)'; }}
                          onMouseOut={e => { if (!isTagged) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: isTagged ? DS.navy : '#e8dfd1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: DS.fontMono, fontSize: 10, fontWeight: 700, color: isTagged ? '#ffdf9c' : '#785a00', transition: 'all 0.2s' }}>{friend.initials}</div>
                          <span style={{ fontFamily: DS.fontBody, fontSize: 13, color: isTagged ? DS.navy : DS.inkDark, fontWeight: isTagged ? 700 : 400, flex: 1 }}>{friend.name}</span>
                          {isTagged && <span className="material-symbols-outlined" style={{ fontSize: 16, color: DS.navy, fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Botón publicar */}
             <button
              onClick={handlePublish}
              disabled={(!postText.trim() && !postImage) || publishing}
              aria-label="Publicar en el feed"
              style={{
                backgroundColor: (postText.trim() || postImage) ? DS.navy : 'rgba(1,30,75,0.35)',
                color: '#ffdf9c', padding: '8px 22px', border: 'none', borderRadius: 2,
                cursor: (postText.trim() || postImage) && !publishing ? 'pointer' : 'not-allowed',
                fontFamily: DS.fontMono, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                opacity: (postText.trim() || postImage) ? 1 : 0.55,
                transition: 'all 0.2s',
              }}
            >
              {publishing ? 'Publicando...' : 'Publicar'}
            </button>
            </div>
          </div>

          {/* Estado vacío de búsqueda */}
          {searchVal.trim() && allPosts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', fontFamily: DS.fontMono, color: DS.outline, fontSize: 12, letterSpacing: '0.05em' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, display: 'block', marginBottom: 8, opacity: 0.4 }}>search_off</span>
              Sin resultados para "{searchVal}"
            </div>
          )}

          {/* Error de conexión con el servidor */}
          {postsError && !postsLoading && (
            <div style={{
              textAlign: 'center', padding: '48px 20px',
              fontFamily: DS.fontMono, color: '#8e0000', fontSize: 11,
              letterSpacing: '0.05em', backgroundColor: 'rgba(186,26,26,0.04)',
              border: '1px solid rgba(186,26,26,0.2)', borderRadius: 8,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36, display: 'block', marginBottom: 10, opacity: 0.5 }}>cloud_off</span>
              No se pudo conectar con el servidor del Archivo.<br />
              <button onClick={() => window.location.reload()} style={{
                marginTop: 14, padding: '8px 20px', border: '1px solid rgba(186,26,26,0.4)',
                backgroundColor: 'transparent', color: '#8e0000', borderRadius: 4,
                fontFamily: DS.fontMono, fontSize: 10, letterSpacing: '0.1em',
                textTransform: 'uppercase', cursor: 'pointer',
              }}>
                Reintentar
              </button>
            </div>
          )}

          {/* Estado vacío general (sin búsqueda activa y sin contenido) */}
          {!searchVal.trim() && allPosts.length === 0 && !postsLoading && !postsError && (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              fontFamily: DS.fontMono, color: DS.outline, fontSize: 11,
              letterSpacing: '0.05em', backgroundColor: DS.cream,
              border: '1px solid rgba(0,0,0,0.06)', borderRadius: 8,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36, display: 'block', marginBottom: 10, opacity: 0.35 }}>history_edu</span>
              El archivo aún no tiene actividad registrada.<br />
              Comparte una publicación o registra una venta para comenzar.
            </div>
          )}

          {/* Posts */}
          {allPosts.map(post => <FeedPost key={post.id} post={post} onUpdate={() => {}} />)}
        </section>

        {/* ── Sidebar derecho ── */}
        {!mobile && (
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            <section style={{ backgroundColor: DS.cream, border: `1px solid rgba(0,0,0,0.08)`, borderRadius: 8, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', position: 'relative' }}>
              <div className="corner-tab corner-tl" /><div className="corner-tab corner-tr" />
              <h2 style={{
                fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
                fontSize: 20, fontWeight: 700, color: DS.navy, fontStyle: 'italic',
                marginBottom: 14, borderBottom: '1px dotted rgba(120,90,0,0.2)',
                paddingBottom: 8,
              }}>
                Descubrir Tesoros
              </h2>

              {discoverLoading ? (
                <p style={{ fontFamily: DS.fontMono, fontSize: 10, color: DS.outline, textAlign: 'center', padding: '12px 0' }}>
                  Cargando...
                </p>
              ) : featuredCoins.length === 0 ? (
                <p style={{ fontFamily: DS.fontMono, fontSize: 10, color: DS.outline, textAlign: 'center', padding: '12px 0' }}>
                  Sin piezas en el inventario
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {featuredCoins.map(coin => (
                    <Link key={coin.id} to="/ledger" style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                        <div style={{ width: 44, height: 44, backgroundColor: '#e8dfd1', borderRadius: '50%', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {coin.imageUrl
                            ? <img src={`http://localhost:3001${coin.imageUrl}`} alt={coin.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span className="material-symbols-outlined" style={{ fontSize: 20, color: DS.gold }}>toll</span>
                          }
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{
                            fontFamily: DS.fontBody, fontSize: 13, fontWeight: 700, color: DS.inkDark,
                            fontStyle: 'italic', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{coin.name}</p>
                          <p style={{ fontFamily: DS.fontMono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: DS.outline, margin: 0 }}>
                            {coin.mint || ''} {coin.year ? `· ${coin.year}` : ''}
                          </p>
                        </div>
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: DS.gold, margin: 0, flexShrink: 0 }}>
                          S/. {Number(coin.estimatedValue || 0).toLocaleString('es-PE')}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <Link to="/ledger">
                <button style={{ width: '100%', marginTop: 16, padding: '8px 0', border: '1px solid rgba(0,0,0,0.08)', backgroundColor: 'transparent', color: DS.outline, fontFamily: DS.fontMono, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  Ver más monedas
                </button>
              </Link>
            </section>

            <section style={{ backgroundColor: DS.cream, border: `1px solid rgba(0,0,0,0.08)`, borderRadius: 8, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', position: 'relative' }}>
              <div className="corner-tab corner-tl" /><div className="corner-tab corner-tr" />
              <h2 style={{
                fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
                fontSize: 20, fontWeight: 700, color: DS.navy, fontStyle: 'italic',
                marginBottom: 14, borderBottom: '1px dotted rgba(120,90,0,0.2)',
                paddingBottom: 8,
              }}>
                Tendencias
              </h2>

              {discoverLoading ? (
                <p style={{ fontFamily: DS.fontMono, fontSize: 10, color: DS.outline, textAlign: 'center', padding: '12px 0' }}>
                  Cargando...
                </p>
              ) : !nextAuction ? (
                <p style={{ fontFamily: DS.fontMono, fontSize: 10, color: DS.outline, textAlign: 'center', padding: '12px 0' }}>
                  Sin subastas activas
                </p>
              ) : (
                <Link to="/auction" style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{
                        fontFamily: DS.fontMono, fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                        textTransform: 'uppercase', backgroundColor: 'rgba(186,26,26,0.8)', color: '#fff',
                        padding: '1px 6px', display: 'inline-block', marginBottom: 4,
                      }}>En Subasta</span>
                      <h4 style={{
                        fontFamily: DS.fontBody, fontSize: 13, fontWeight: 700, color: DS.inkDark, margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{nextAuction.auctionHouse || 'Sala de Subastas'}</h4>
                      <p style={{
                        fontFamily: DS.fontMono, fontSize: 10, color: DS.outline, fontStyle: 'italic', margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{nextAuction.coinName} · Base S/. {Number(nextAuction.startingBid).toLocaleString('es-PE')}</p>
                    </div>
                    <span style={{ fontFamily: DS.fontMono, fontSize: 11, fontWeight: 700, color: DS.error, flexShrink: 0, marginLeft: 8 }}>
                      {new Date(nextAuction.auctionDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </Link>
              )}
            </section>

            <footer style={{ opacity: 0.6, padding: '0 8px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginBottom: 10 }}>
                {['Terms of Escrow', 'Certification Standards'].map(lnk => (
                  <a key={lnk} href="#" style={{ fontFamily: DS.fontMono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: DS.outline, textDecoration: 'none' }}>{lnk}</a>
                ))}
              </div>
              <p style={{ fontFamily: DS.fontMono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: DS.navy, fontWeight: 700, marginBottom: 4 }}>NUMISMATIC ARCHIVAL SYSTEMS</p>
              <p style={{ fontFamily: DS.fontMono, fontSize: 9, color: DS.outline, margin: 0 }}>© 2026. Todos los derechos reservados.</p>
            </footer>
          </aside>
        )}
      </main>

    </AppLayout>
  );
}

function SearchSection({ label, icon, children }) {
  return (
    <div>
      <div style={{ padding: '8px 14px 4px', display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid rgba(196,198,208,0.25)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 13, color: DS.gold }}>{icon}</span>
        <span style={{ fontFamily: DS.fontMono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: DS.gold, fontWeight: 700 }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function SearchRow({ icon, iconColor, title, sub, onClick }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseOver={() => setHov(true)}
      onMouseOut={() => setHov(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', background: hov ? 'rgba(120,90,0,0.05)' : 'none',
        border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
      }}
    >
      <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: 'rgba(120,90,0,0.08)', border: '1px solid rgba(120,90,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 15, color: iconColor }}>{icon}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: DS.fontBody, fontSize: 13, fontWeight: 600, color: DS.inkDark, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
        {sub && <p style={{ fontFamily: DS.fontMono, fontSize: 9, color: DS.outline, margin: 0, letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</p>}
      </div>
      <span className="material-symbols-outlined" style={{ fontSize: 14, color: DS.outlineVar, flexShrink: 0 }}>chevron_right</span>
    </button>
  );
}
