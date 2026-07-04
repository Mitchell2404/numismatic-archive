import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.join(__dirname, '../../public/images');

export const localProvider = {
  getImageUrl(category, filename) {
    return `/images/${category}/${filename}`;
  },
  async streamImage(category, filename, res) {
    const filePath = path.join(BASE, category, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
    res.setHeader('Content-Type', mimeTypes[ext] || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(filePath).pipe(res);
  },
};
