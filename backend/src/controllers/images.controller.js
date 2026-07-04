import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ALLOWED_CATEGORIES = ['coins', 'posts', 'messages'];

function ensureDir(category) {
  const dir = path.join(__dirname, '../../public/images', category);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = ALLOWED_CATEGORIES.includes(req.params.category)
      ? req.params.category
      : 'messages';
    cb(null, ensureDir(category));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || (file.mimetype.startsWith('audio/') ? '.webm' : '.jpg');
    const category = ALLOWED_CATEGORIES.includes(req.params.category) ? req.params.category : 'messages';
    const safeName = `${category}-${Date.now()}${ext}`;
    cb(null, safeName);
  },
});

// Acepta imágenes (jpg, png, webp) y audio (para mensajes de voz)
const fileFilter = (req, file, cb) => {
  const allowedImages = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedAudio  = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/wav'];
  if (allowedImages.includes(file.mimetype) || allowedAudio.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato no soportado.'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // máx 5 MB
});

// POST /api/images/upload/:category
export const uploadImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo.' });
  }
  const category = ALLOWED_CATEGORIES.includes(req.params.category) ? req.params.category : 'messages';
  const url = `/api/images/${category}/${req.file.filename}`;
  res.status(201).json({ url, mimetype: req.file.mimetype });
};

// ─── NUEVA FUNCIÓN: GET /api/images/:category/:filename ──────────────────────
// Busca el archivo dinámicamente en la carpeta de la categoría correspondiente
export const getImage = (req, res) => {
  const { category, filename } = req.params;
  
  // Resuelve la ruta dinámica (ej: backend/public/images/coins/coin-xxxx.jpg)
  const imgPath = path.join(__dirname, '../../public/images', category, filename);

  if (fs.existsSync(imgPath)) {
    return res.sendFile(imgPath);
  } else {
    return res.status(404).json({ error: 'La imagen solicitada no existe en el archivo.' });
  }
};