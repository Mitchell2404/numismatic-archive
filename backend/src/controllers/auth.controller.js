import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const DATA_PATH  = join(__dirname, '../data/users.json');

function readUsers() {
  try { return JSON.parse(readFileSync(DATA_PATH, 'utf-8')); }
  catch { return []; }
}

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

// POST /api/auth/login — valida contra users.json; el rol lo decide el servidor
export function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
  }

  const user = readUsers().find(u => u.email === String(email).trim().toLowerCase());
  if (!user || !user.passwordHash || user.passwordHash !== sha256(password)) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }
  if (user.status !== 'activo') {
    return res.status(403).json({ error: 'Esta cuenta se encuentra desactivada. Contacte al administrador.' });
  }

  const { passwordHash, ...pub } = user;
  return res.json({
    success: true,
    user: {
      id: pub.id,
      name: pub.name,
      email: pub.email,
      role: pub.roleLabel,
      userRole: pub.role,
    },
  });
}

export function logout(req, res) {
  res.json({ success: true });
}
