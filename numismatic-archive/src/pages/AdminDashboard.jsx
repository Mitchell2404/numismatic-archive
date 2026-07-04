import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useWindowSize, isMobile } from '../hooks/useWindowSize.js';
import { fetchUsers, updateUserAPI } from '../services/usersService.js';

const F = {
  display: "'Cormorant Garamond', 'Playfair Display', serif",
  body:    "'Inter', sans-serif",
  mono:    "'JetBrains Mono', monospace",
};
const C = {
  navy:       '#011e4b',
  gold:       '#785a00',
  goldLight:  '#ffdf9c',
  cream:      '#f4ece1',
  parchment:  '#fff8f2',
  parchmentLow:'#fff2df',
  inkDark:    '#241a07',
  inkLight:   '#44474f',
  outline:    '#757780',
  outlineVar: '#c4c6d0',
  error:      '#ba1a1a',
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

const ROLE_LABEL = { usuario:'Usuario', certificador:'Certificador', admin:'Admin' };
const ROLE_COLORS = {
  usuario:      { bg:'rgba(1,30,75,0.08)',   color:'#011e4b', border:'rgba(1,30,75,0.2)' },
  certificador: { bg:'rgba(120,90,0,0.1)',   color:'#785a00', border:'rgba(120,90,0,0.3)' },
  admin:        { bg:'rgba(186,26,26,0.08)', color:'#ba1a1a', border:'rgba(186,26,26,0.2)' },
};

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div style={{
      position:'relative', overflow:'hidden',
      backgroundColor:'#ffffff', border:`1px solid ${C.outlineVar}`,
      borderRadius:6, padding:'20px 24px',
    }}>
      <Corners />
      <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
        <div style={{ width:48, height:48, borderRadius:8, backgroundColor: color || 'rgba(1,30,75,0.07)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span className="material-symbols-outlined" style={{ fontSize:26, color: C.navy }}>{icon}</span>
        </div>
        <div>
          <p style={{ fontFamily: F.mono, fontSize:28, fontWeight:700, color: C.navy, margin:'0 0 4px', lineHeight:1 }}>{value}</p>
          <p style={{ fontFamily: F.mono, fontSize:10, color: C.gold, letterSpacing:'0.1em', textTransform:'uppercase', margin:'0 0 2px' }}>{label}</p>
          {sub && <p style={{ fontFamily: F.body, fontSize:12, color: C.outline, margin:0 }}>{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function UserRow({ u, onToggle, onView, onRoleChange }) {
  const st = u.status === 'activo';
  const rc = ROLE_COLORS[u.role] || ROLE_COLORS.usuario;
  return (
    <tr style={{ borderBottom:`1px solid ${C.outlineVar}` }}>
      <td style={{ padding:'12px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg, #5a4200, #001230)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ fontFamily: F.display, fontSize:13, fontWeight:700, fontStyle:'italic', color:'#fff', userSelect:'none' }}>
              {u.name.split(' ').map(w=>w[0]).filter(c=>/[A-Z]/i.test(c)).slice(0,2).join('')}
            </span>
          </div>
          <div>
            <p style={{ fontFamily: F.body, fontSize:13, fontWeight:600, color: C.inkDark, margin:'0 0 1px' }}>{u.name}</p>
            <p style={{ fontFamily: F.mono, fontSize:9, color: C.outline, margin:0 }}>@{u.username}</p>
          </div>
        </div>
      </td>
      <td style={{ padding:'12px 8px' }}>
        <span style={{ padding:'3px 10px', borderRadius:9999, fontFamily: F.mono, fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', backgroundColor: rc.bg, color: rc.color, border:`1px solid ${rc.border}` }}>
          {ROLE_LABEL[u.role]}
        </span>
      </td>
      <td style={{ padding:'12px 8px' }}>
        <span style={{ padding:'3px 10px', borderRadius:9999, fontFamily: F.mono, fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', backgroundColor: st ? 'rgba(26,107,46,0.08)' : 'rgba(0,0,0,0.05)', color: st ? '#1a6b2e' : C.outline, border:`1px solid ${st ? 'rgba(26,107,46,0.25)' : C.outlineVar}` }}>
          {u.status}
        </span>
      </td>
      <td style={{ padding:'12px 8px', fontFamily: F.mono, fontSize:11, color: C.inkLight }}>{u.joined}</td>
      <td style={{ padding:'12px 8px', textAlign:'right' }}>
        <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
          <ActionBtn icon="person" title="Ver perfil" onClick={onView} />
          <ActionBtn icon={st ? 'block' : 'check_circle'} title={st ? 'Desactivar' : 'Activar'} onClick={onToggle} danger={st} />
          <ActionBtn icon="manage_accounts" title="Cambiar rol" onClick={onRoleChange} />
        </div>
      </td>
    </tr>
  );
}

function ActionBtn({ icon, title, onClick, danger }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseOver={() => setHov(true)}
      onMouseOut={() => setHov(false)}
      style={{ width:30, height:30, borderRadius:4, border:`1px solid ${hov ? (danger ? C.error : C.gold) : C.outlineVar}`, backgroundColor: hov ? (danger ? 'rgba(186,26,26,0.06)' : 'rgba(120,90,0,0.06)') : 'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
      <span className="material-symbols-outlined" style={{ fontSize:16, color: hov ? (danger ? C.error : C.gold) : C.outline }}>{icon}</span>
    </button>
  );
}

export default function AdminDashboard() {
  const { width } = useWindowSize();
  const mobile = isMobile(width);
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('usuarios');
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [roleModal, setRoleModal] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);

  const authUser = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem('numismatic_user') || '{}'); }
    catch { return {}; }
  }, []);

  useEffect(() => {
    fetchUsers()
      .then(setAllUsers)
      .catch(() => toast.show('No se pudo cargar el registro de usuarios.', 'error'))
      .finally(() => setLoadingUsers(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // El admin no se gestiona a sí mismo desde esta tabla
  const users      = allUsers.filter(u => u.role === 'usuario');
  const certifiers = allUsers.filter(u => u.role === 'certificador');

  const allForTab = tab === 'usuarios' ? users : certifiers;

  const toggleStatus = async (id) => {
    const target = allUsers.find(u => u.id === id);
    if (!target) return;
    const nextStatus = target.status === 'activo' ? 'inactivo' : 'activo';
    setConfirmModal(null);
    try {
      const updated = await updateUserAPI(id, { status: nextStatus });
      setAllUsers(prev => prev.map(u => u.id === id ? updated : u));
      toast.show('Estado del usuario actualizado', 'success');
    } catch {
      toast.show('No se pudo actualizar el estado. Intente de nuevo.', 'error');
    }
  };

  const changeRole = async () => {
    if (!roleModal || !newRole) return;
    try {
      const updated = await updateUserAPI(roleModal.id, { role: newRole, roleLabel: ROLE_LABEL[newRole] });
      setAllUsers(prev => prev.map(u => u.id === roleModal.id ? updated : u));
      toast.show(`Rol de ${roleModal.name} actualizado a ${ROLE_LABEL[newRole]}`, 'success');
    } catch {
      toast.show('No se pudo actualizar el rol. Intente de nuevo.', 'error');
    }
    setRoleModal(null);
    setNewRole('');
  };

  const activeUsers = users.filter(u => u.status === 'activo').length;
  const activeCerts = certifiers.filter(u => u.status === 'activo').length;
  const totalCertifs = certifiers.reduce((s, c) => s + (c.certifications || 0), 0);
  const pendingCertifs = certifiers.reduce((s, c) => s + (c.pending || 0), 0);

  return (
    <AppLayout>
      <div style={{ minHeight:'100vh', padding: mobile ? '16px' : '40px 48px' }}>

        {/* Header */}
        <div style={{ marginBottom:32 }}>
          <p style={{ fontFamily: F.mono, fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color: C.gold, marginBottom:6 }}>
            PANEL · ADMINISTRACIÓN
          </p>
          <h1 style={{ fontFamily: F.display, fontSize: mobile ? 28 : 38, fontWeight:700, fontStyle:'italic', color: C.navy, margin:'0 0 6px' }}>
            Gestión del Archivo
          </h1>
          <p style={{ fontFamily: F.body, fontSize:14, color: C.inkLight, fontStyle:'italic', margin:0 }}>
            Bienvenido, <strong>{authUser.name}</strong>. Gestione usuarios, certificadores y el estado del sistema.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:16, marginBottom:32 }}>
          <StatCard icon="group"       label="Usuarios Activos"     value={activeUsers}   sub={`${users.length} total`} />
          <StatCard icon="fact_check"  label="Certificadores"       value={activeCerts}   sub={`${certifiers.length} total`} />
          <StatCard icon="verified"    label="Certif. Emitidas"     value={totalCertifs}  sub="históricas" />
          <StatCard icon="pending"     label="Solicitudes Pendientes" value={pendingCertifs} sub="en revisión" />
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:0, marginBottom:24, borderBottom:`1px solid ${C.outlineVar}` }}>
          {[
            { key:'usuarios', label:'Usuarios', count: users.length },
            { key:'certificadores', label:'Certificadores', count: certifiers.length },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding:'12px 24px', background:'none', border:'none', cursor:'pointer',
                fontFamily: tab === t.key ? F.display : F.mono,
                fontSize: tab === t.key ? 16 : 11,
                fontWeight: 700, fontStyle: tab === t.key ? 'italic' : 'normal',
                color: tab === t.key ? C.navy : C.outline,
                letterSpacing: tab === t.key ? '0.01em' : '0.1em',
                textTransform: tab === t.key ? 'none' : 'uppercase',
                borderBottom: tab === t.key ? `2px solid ${C.gold}` : '2px solid transparent',
                transition:'all 0.15s',
              }}
            >
              {t.label}
              <span style={{ marginLeft:8, padding:'1px 7px', borderRadius:9999, backgroundColor: tab===t.key ? 'rgba(120,90,0,0.1)' : 'rgba(0,0,0,0.05)', fontFamily: F.mono, fontSize:10, color: tab===t.key ? C.gold : C.outline }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ position:'relative', overflow:'hidden', backgroundColor:'#ffffff', border:`1px solid ${C.outlineVar}`, borderRadius:6, overflowX:'auto' }}>
          <Corners />
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
            <thead>
              <tr style={{ backgroundColor: C.parchmentLow, borderBottom:`1px solid ${C.outlineVar}` }}>
                {['Erudito','Rol','Estado','Registro','Acciones'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign: h==='Acciones' ? 'right' : 'left', fontFamily: F.mono, fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color: C.gold, fontWeight:700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingUsers ? (
                <tr>
                  <td colSpan={5} style={{ padding:'32px 16px', textAlign:'center', fontFamily: F.body, fontSize:14, fontStyle:'italic', color: C.inkLight }}>
                    Consultando el registro de usuarios...
                  </td>
                </tr>
              ) : allForTab.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding:'32px 16px', textAlign:'center', fontFamily: F.body, fontSize:14, fontStyle:'italic', color: C.inkLight }}>
                    Sin registros en esta categoría.
                  </td>
                </tr>
              ) : allForTab.map(u => (
                <UserRow
                  key={u.id}
                  u={u}
                  onView={() => navigate(`/profile/${u.id}`)}
                  onToggle={() => setConfirmModal(u)}
                  onRoleChange={() => { setRoleModal(u); setNewRole(u.role); }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Confirmar toggle */}
      <Modal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={confirmModal?.status === 'activo' ? 'Desactivar Usuario' : 'Activar Usuario'}
        onConfirm={() => toggleStatus(confirmModal?.id)}
        confirmText={confirmModal?.status === 'activo' ? 'Desactivar' : 'Activar'}
        confirmVariant={confirmModal?.status === 'activo' ? 'danger' : 'primary'}
      >
        <p style={{ fontFamily: F.body, fontSize:14, color: C.inkLight, lineHeight:1.6 }}>
          ¿Confirma que desea <strong>{confirmModal?.status === 'activo' ? 'desactivar' : 'activar'}</strong> la cuenta de <strong>{confirmModal?.name}</strong>?
        </p>
      </Modal>

      {/* Modal: Cambiar rol */}
      <Modal
        isOpen={!!roleModal}
        onClose={() => { setRoleModal(null); setNewRole(''); }}
        title="Cambiar Rol"
        onConfirm={changeRole}
        confirmText="Guardar Cambio"
      >
        <p style={{ fontFamily: F.body, fontSize:14, color: C.inkLight, marginBottom:16 }}>
          Cambiar el rol de <strong>{roleModal?.name}</strong>:
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {['usuario','certificador','admin'].map(r => (
            <label key={r} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:4, border:`1px solid ${newRole===r ? C.gold : C.outlineVar}`, backgroundColor: newRole===r ? 'rgba(120,90,0,0.05)' : 'transparent', cursor:'pointer', transition:'all 0.15s' }}>
              <input type="radio" name="role" value={r} checked={newRole===r} onChange={() => setNewRole(r)} style={{ accentColor: C.gold }} />
              <div>
                <p style={{ fontFamily: F.mono, fontSize:11, fontWeight:700, color: newRole===r ? C.gold : C.inkDark, margin:'0 0 2px', letterSpacing:'0.05em', textTransform:'uppercase' }}>{ROLE_LABEL[r]}</p>
                <p style={{ fontFamily: F.body, fontSize:12, color: C.inkLight, margin:0 }}>
                  {r==='usuario' ? 'Puede coleccionar, subastar y certificar monedas.' : r==='certificador' ? 'Puede revisar y aprobar solicitudes de certificación.' : 'Acceso completo a la gestión del sistema.'}
                </p>
              </div>
            </label>
          ))}
        </div>
      </Modal>
    </AppLayout>
  );
}
