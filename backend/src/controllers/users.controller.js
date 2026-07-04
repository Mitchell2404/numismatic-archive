import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const DATA_PATH  = join(__dirname, '../data/users.json');

function readUsers() {
  try { return JSON.parse(readFileSync(DATA_PATH, 'utf-8')); }
  catch { return []; }
}
function writeUsers(data) {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// El hash de contraseña nunca sale del servidor
function toPublic(user) {
  const { passwordHash, ...pub } = user;
  return pub;
}

// GET /api/users
export function getUsers(req, res) {
  try {
    let users = readUsers();
    const { role, q } = req.query;
    if (role) users = users.filter(u => u.role === role);
    if (q) {
      const needle = q.toLowerCase();
      users = users.filter(u =>
        u.name.toLowerCase().includes(needle) ||
        u.username.toLowerCase().includes(needle)
      );
    }
    res.json(users.map(toPublic));
  } catch { res.status(500).json({ error: 'Error al leer usuarios.' }); }
}

// GET /api/users/:id
export function getUserById(req, res) {
  try {
    const user = readUsers().find(u => u.id === req.params.id || u.username === req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json(toPublic(user));
  } catch { res.status(500).json({ error: 'Error al leer usuario.' }); }
}

// PUT /api/users/:id  (gestión de admin: status, role, roleLabel, etc.)
export function updateUser(req, res) {
  try {
    const users = readUsers();
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado.' });

    // Campos gestionables — nunca permitir sobrescribir id ni passwordHash por esta vía
    const ALLOWED = ['status', 'role', 'roleLabel', 'name', 'location', 'bio', 'rating', 'coins', 'certifications', 'pending', 'auctions', 'badges'];
    for (const key of ALLOWED) {
      if (key in req.body) users[idx][key] = req.body[key];
    }
    writeUsers(users);
    res.json(toPublic(users[idx]));
  } catch { res.status(500).json({ error: 'Error al actualizar usuario.' }); }
}
