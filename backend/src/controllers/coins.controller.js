import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COINS_FILE = path.join(__dirname, '../data/coins.json');

// Helpers para leer/escribir el JSON
function readCoins() {
  if (!fs.existsSync(COINS_FILE)) {
    fs.writeFileSync(COINS_FILE, '[]', 'utf-8');
  }
  return JSON.parse(fs.readFileSync(COINS_FILE, 'utf-8'));
}

function writeCoins(coins) {
  fs.writeFileSync(COINS_FILE, JSON.stringify(coins, null, 2), 'utf-8');
}

// GET /api/coins
export const getCoins = (req, res) => {
  try {
    const coins = readCoins();
    res.json(coins);
  } catch (err) {
    res.status(500).json({ error: 'Error al leer las monedas.' });
  }
};

// POST /api/coins
export const createCoin = (req, res) => {
  try {
    const coins = readCoins();
    const { name, year, mint, grade, estimatedValue, status, description, imageUrl } = req.body;

    if (!name || !year || !mint) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: name, year, mint.' });
    }

    const newCoin = {
      id: `NA-${String(Date.now()).slice(-6)}`,  // ID único basado en timestamp
      name,
      year: Number(year),
      mint,
      grade: grade || 'MS-63',
      estimatedValue: Number(estimatedValue) || 0,
      status: status || 'active',
      description: description || '',
      imageUrl: imageUrl || null,   // URL relativa: /api/images/coins/archivo.jpg
      private: false,
    };

    coins.unshift(newCoin);  // Agrega al inicio del array
    writeCoins(coins);
    res.status(201).json(newCoin);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear la moneda.' });
  }
};

// PUT /api/coins/:id
export const updateCoin = (req, res) => {
  try {
    const coins = readCoins();
    const index = coins.findIndex(c => c.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Moneda no encontrada.' });
    }

    // Mezcla los campos existentes con los nuevos (no sobreescribe id)
    const updated = { ...coins[index], ...req.body, id: coins[index].id };
    coins[index] = updated;
    writeCoins(coins);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar la moneda.' });
  }
};

// DELETE /api/coins/:id
export const deleteCoin = (req, res) => {
  try {
    const coins = readCoins();
    const index = coins.findIndex(c => c.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Moneda no encontrada.' });
    }

    const [deleted] = coins.splice(index, 1);

    // Si la moneda tenía imagen local, eliminarla del disco
    if (deleted.imageUrl && deleted.imageUrl.startsWith('/api/images/coins/')) {
      const filename = path.basename(deleted.imageUrl);
      const imgPath = path.join(__dirname, '../../public/images/coins', filename);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    writeCoins(coins);
    res.json({ message: 'Moneda eliminada.', deleted });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar la moneda.' });
  }
};