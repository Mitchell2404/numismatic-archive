import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

function readJSON(file) {
  try {
    return JSON.parse(readFileSync(join(__dirname, '../data/', file), 'utf-8'));
  } catch { return []; }
}

// GET /api/summary
export function getSummary(req, res) {
  try {
    const coins = readJSON('coins.json');
    const sales = readJSON('sales.json');

    const totalCollected = sales
      .filter(s => s.status === 'Completada')
      .reduce((acc, s) => acc + Number(s.salePrice), 0);

    const pendingSales = sales.filter(s => s.status === 'Pendiente');
    const pendingAmount = pendingSales.reduce((acc, s) => acc + Number(s.salePrice), 0);

    const activeInventoryValue = coins
      .filter(c => c.status !== 'sold')
      .reduce((acc, c) => acc + Number(c.estimatedValue || 0), 0);

    const activeInventoryCount = coins.filter(c => c.status !== 'sold').length;

    res.json({
      totalCollected,
      pendingAmount,
      pendingCount: pendingSales.length,
      activeInventoryValue,
      activeInventoryCount,
    });
  } catch {
    res.status(500).json({ error: 'Error al calcular resumen.' });
  }
}