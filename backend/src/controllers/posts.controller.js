import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const DATA_PATH  = join(__dirname, '../data/posts.json');

function readPosts() {
  try { return JSON.parse(readFileSync(DATA_PATH, 'utf-8')); }
  catch { return []; }
}
function writePosts(data) {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/posts
export function getPosts(req, res) {
  try { res.json(readPosts()); }
  catch { res.status(500).json({ error: 'Error al leer publicaciones.' }); }
}

// POST /api/posts
export function createPost(req, res) {
  try {
    const posts = readPosts();
    const { author, body, imageUrl, tags } = req.body;

    if (!body && !imageUrl) {
      return res.status(400).json({ error: 'La publicación necesita texto o imagen.' });
    }

    const post = {
      id: `POST-${Date.now()}`,
      author:   author || 'Dr. Alejandro Vega',
      body:     body || '',
      imageUrl: imageUrl || null,
      tags:     tags || [],
      likes: 0,
      favs: 0,
      comments: [],
      createdAt: new Date().toISOString(),
    };

    posts.unshift(post);
    writePosts(posts);
    res.status(201).json(post);
  } catch { res.status(500).json({ error: 'Error al crear publicación.' }); }
}

// PUT /api/posts/:id  (para likes, favs, comentarios)
export function updatePost(req, res) {
  try {
    const posts = readPosts();
    const idx = posts.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Publicación no encontrada.' });
    posts[idx] = { ...posts[idx], ...req.body, id: posts[idx].id };
    writePosts(posts);
    res.json(posts[idx]);
  } catch { res.status(500).json({ error: 'Error al actualizar publicación.' }); }
}

// DELETE /api/posts/:id
export function deletePost(req, res) {
  try {
    const posts = readPosts();
    const idx = posts.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Publicación no encontrada.' });
    const [deleted] = posts.splice(idx, 1);
    writePosts(posts);
    res.json({ deleted: true, id: deleted.id });
  } catch { res.status(500).json({ error: 'Error al eliminar publicación.' }); }
}

// POST /api/posts/:id/comments
export function addComment(req, res) {
  try {
    const posts = readPosts();
    const idx = posts.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Publicación no encontrada.' });

    const { author, text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'El comentario no puede estar vacío.' });
    }

    const comment = {
      id: Date.now(),
      author: author || 'Dr. Alejandro Vega',
      text: text.trim(),
      time: new Date().toISOString(),
    };

    posts[idx].comments = [...(posts[idx].comments || []), comment];
    writePosts(posts);
    res.status(201).json(posts[idx]);
  } catch { res.status(500).json({ error: 'Error al añadir comentario.' }); }
}