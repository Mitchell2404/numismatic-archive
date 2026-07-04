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

// GET /api/activity — combina ventas y subastas recientes, ordenadas por fecha
export function getActivity(req, res) {
  try {
    const sales     = readJSON('sales.json');
    const auctions  = readJSON('auctions.json');

    const saleEvents = sales.map(s => ({
      id: `activity-sale-${s.id}`,
      type: 'sale',
      title: s.status === 'Completada' ? 'Venta completada' : 'Venta registrada',
      coinName: s.coinName,
      detail: `${s.buyer} · S/. ${Number(s.salePrice).toLocaleString('es-PE')}`,
      status: s.status,
      timestamp: s.createdAt,
    }));

    const auctionEvents = auctions.map(a => ({
      id: `activity-auction-${a.id}`,
      type: 'auction',
      title: 'Lote registrado en subasta',
      coinName: a.coinName,
      detail: `${a.auctionHouse} · Base S/. ${Number(a.startingBid).toLocaleString('es-PE')}`,
      status: a.status,
      timestamp: a.createdAt,
    }));

    const combined = [...saleEvents, ...auctionEvents]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20); // últimos 20 eventos

    res.json(combined);
  } catch {
    res.status(500).json({ error: 'Error al cargar actividad.' });
  }
}