import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const DATA_PATH  = join(__dirname, '../data/auctions.json');

function readAuctions() {
  try { return JSON.parse(readFileSync(DATA_PATH, 'utf-8')); }
  catch { return []; }
}
function writeAuctions(data) {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function getAuctions(req, res) {
  try { res.json(readAuctions()); }
  catch { res.status(500).json({ error: 'Error al leer subastas.' }); }
}

export function createAuction(req, res) {
  try {
    const auctions = readAuctions();
    const { coinId, coinName, coinGrade, coinMint, coinYear, imageUrl,
            auctionHouse, startingBid, auctionDate, lotRef, notes } = req.body;

    if (!coinName || !startingBid) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    const lot = {
      id: `LOT-${Date.now()}`,
      coinId:       coinId       || '',
      coinName:     coinName,
      coinGrade:    coinGrade    || '',
      coinMint:     coinMint     || '',
      coinYear:     coinYear     || '',
      imageUrl:     imageUrl     || null,
      auctionHouse: auctionHouse || '',
      startingBid:  Number(startingBid),
      currentBid:   Number(startingBid),
      auctionDate:  auctionDate  || '',
      lotRef:       lotRef       || '',
      notes:        notes        || '',
      status:       'active',
      createdAt:    new Date().toISOString(),
    };

    auctions.unshift(lot);
    writeAuctions(auctions);
    res.status(201).json(lot);
  } catch { res.status(500).json({ error: 'Error al crear subasta.' }); }
}

export function updateAuction(req, res) {
  try {
    const auctions = readAuctions();
    const idx = auctions.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Lote no encontrado.' });
    auctions[idx] = { ...auctions[idx], ...req.body, id: auctions[idx].id };
    writeAuctions(auctions);
    res.json(auctions[idx]);
  } catch { res.status(500).json({ error: 'Error al actualizar subasta.' }); }
}

// POST /api/auctions/:id/bids — registra una puja validada por el servidor
export function placeBid(req, res) {
  try {
    const auctions = readAuctions();
    const idx = auctions.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Lote no encontrado.' });

    const lot = auctions[idx];
    if (lot.status !== 'active') {
      return res.status(409).json({ error: 'Esta subasta ya no admite pujas.' });
    }
    if (lot.auctionDate && new Date(lot.auctionDate).getTime() < Date.now()) {
      return res.status(409).json({ error: 'La subasta ya cerró.' });
    }

    const amount = Number(req.body.amount);
    const bidder = String(req.body.bidder || 'Anónimo').slice(0, 60);
    if (!amount || Number.isNaN(amount)) {
      return res.status(400).json({ error: 'Monto de puja inválido.' });
    }
    const floor = lot.currentBid || lot.startingBid || 0;
    if (amount <= floor) {
      return res.status(409).json({ error: `La puja debe superar la actual (S/. ${floor}).` });
    }

    const bid = { amount, bidder, time: new Date().toISOString() };
    lot.bids = [...(lot.bids || []), bid];
    lot.currentBid = amount;
    writeAuctions(auctions);
    res.status(201).json(lot);
  } catch { res.status(500).json({ error: 'Error al registrar la puja.' }); }
}

export function deleteAuction(req, res) {
  try {
    const auctions = readAuctions();
    const idx = auctions.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Lote no encontrado.' });
    const [deleted] = auctions.splice(idx, 1);
    writeAuctions(auctions);
    res.json({ deleted: true, id: deleted.id });
  } catch { res.status(500).json({ error: 'Error al eliminar lote.' }); }
}