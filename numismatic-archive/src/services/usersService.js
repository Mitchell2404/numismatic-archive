import { api } from './api.js';

// ─── AUTH ────────────────────────────────────────────────────────────────
// El backend decide el rol; el cliente nunca lo infiere de datos locales.
export async function loginAPI(email, password) {
  try {
    const data = await api.post('/api/auth/login', { email, password });
    return data.user;
  } catch (err) {
    // api.js lanza "API error 401: Unauthorized" — lo traducimos a algo humano
    if (String(err.message).includes('401')) throw new Error('Las credenciales ingresadas no son válidas. Verifique su identidad e inténtelo de nuevo.');
    if (String(err.message).includes('403')) throw new Error('Esta cuenta se encuentra desactivada. Contacte al administrador.');
    throw new Error('No se pudo conectar con el servidor del Archivo.');
  }
}

// ─── USERS ───────────────────────────────────────────────────────────────
export async function fetchUsers({ role, q } = {}) {
  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (q) params.set('q', q);
  const qs = params.toString();
  return api.get(`/api/users${qs ? `?${qs}` : ''}`);
}

export async function fetchUser(id) {
  return api.get(`/api/users/${id}`);
}

export async function updateUserAPI(id, fields) {
  return api.put(`/api/users/${id}`, fields);
}
