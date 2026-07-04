import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Tutorial from './components/mascots/Tutorial.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { MascotProvider } from './context/MascotContext.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Ledger from './pages/Ledger.jsx';
import Sales from './pages/Sales.jsx';
import Certification from './pages/Certification.jsx';
import AuctionRoom from './pages/AuctionRoom.jsx';
import Messaging from './pages/Messaging.jsx';
import Mascots from './pages/Mascots.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import CertifierDashboard from './pages/CertifierDashboard.jsx';
import UserSearch from './pages/UserSearch.jsx';
import UserProfile from './pages/UserProfile.jsx';

function getUser() {
  try { return JSON.parse(localStorage.getItem('numismatic_user') || '{}'); }
  catch { return {}; }
}

function RequireAuth({ children }) {
  const user = getUser();
  if (!user.email) return <Navigate to="/" replace />;
  return children;
}

function RequireRole({ children, roles }) {
  const user = getUser();
  if (!user.email) return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.userRole || 'usuario')) {
    const role = user.userRole || 'usuario';
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'certificador') return <Navigate to="/certifier" replace />;
    return <Navigate to="/home" replace />;
  }
  return children;
}

function TutorialGate() {
  useLocation(); // recalcula al navegar, para reevaluar sesión tras login/logout
  const user = getUser();
  if (!user.email) return null;
  return <Tutorial onFinish={() => {}} />;
}

function App() {
  return (
    <ToastProvider>
      <MascotProvider>
        <BrowserRouter>
          <TutorialGate />
          <Routes>
            <Route path="/" element={<Login />} />

            {/* Rutas de Usuario */}
            <Route path="/home"          element={<RequireRole roles={['usuario']}><Home /></RequireRole>} />
            <Route path="/ledger"        element={<RequireRole roles={['usuario']}><Ledger /></RequireRole>} />
            <Route path="/sales"         element={<RequireRole roles={['usuario']}><Sales /></RequireRole>} />
            <Route path="/certification" element={<RequireRole roles={['usuario']}><Certification /></RequireRole>} />
            <Route path="/auction"       element={<RequireRole roles={['usuario']}><AuctionRoom /></RequireRole>} />
            <Route path="/mascots"       element={<RequireAuth><Mascots /></RequireAuth>} />

            {/* Mensajes — accesible para usuario y certificador */}
            <Route path="/messaging" element={<RequireRole roles={['usuario','certificador']}><Messaging /></RequireRole>} />

            {/* Búsqueda y perfiles — para todos */}
            <Route path="/search"        element={<RequireAuth><UserSearch /></RequireAuth>} />
            <Route path="/profile/:id"   element={<RequireAuth><UserProfile /></RequireAuth>} />

            {/* Panel Certificador */}
            <Route path="/certifier" element={<RequireRole roles={['certificador']}><CertifierDashboard /></RequireRole>} />

            {/* Panel Admin */}
            <Route path="/admin" element={<RequireRole roles={['admin']}><AdminDashboard /></RequireRole>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </MascotProvider>
    </ToastProvider>
  );
}

export default App;
