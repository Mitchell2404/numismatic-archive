import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const DATA_PATH       = join(__dirname, '../data/certifications.json');
const COINS_DATA_PATH = join(__dirname, '../data/coins.json'); // ← NUEVO

function readCerts() {
  try { return JSON.parse(readFileSync(DATA_PATH, 'utf-8')); }
  catch { return []; }
}
function writeCerts(data) {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ← NUEVO: helpers para coins
function readCoins() {
  try { return JSON.parse(readFileSync(COINS_DATA_PATH, 'utf-8')); }
  catch { return []; }
}
function writeCoins(data) {
  writeFileSync(COINS_DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/certifications
export function getCertifications(req, res) {
  try { res.json(readCerts()); }
  catch { res.status(500).json({ error: 'Error al leer certificaciones.' }); }
}

// POST /api/certifications
export function createCertification(req, res) {
  try {
    const certs = readCerts();
    const { coinId, coinName, tier, tierPrice, urgent, urgentSurcharge, insurance, total, deliveryDate, returnDate } = req.body;

    if (!coinId || !tier) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    // ← NUEVO: rechaza si ya hay una certificación en trámite para esa moneda
    const PENDING_STATUSES = ['en proceso', 'pendiente'];
    const alreadyPending = certs.some(
      c => c.coinId === coinId && PENDING_STATUSES.includes(c.status?.toLowerCase())
    );
    if (alreadyPending) {
      return res.status(409).json({ error: 'Esta pieza ya tiene una certificación en proceso.' });
    }

    const cert = {
      id: `CERT-${Date.now()}`,
      coinId, coinName,
      tier, tierPrice: Number(tierPrice),
      urgent: !!urgent,
      urgentSurcharge: Number(urgentSurcharge || 0),
      insurance: Number(insurance || 0),
      total: Number(total),
      deliveryDate: deliveryDate || '',
      returnDate: returnDate || '',
      status: 'En Proceso',
      createdAt: new Date().toISOString(),
    };

    certs.unshift(cert);
    writeCerts(certs);
    res.status(201).json(cert);
  } catch { res.status(500).json({ error: 'Error al crear certificación.' }); }
}

// PUT /api/certifications/:id
export function updateCertification(req, res) {
  try {
    const certs = readCerts();
    const idx = certs.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Certificación no encontrada.' });

    const previousStatus = certs[idx].status;
    certs[idx] = { ...certs[idx], ...req.body, id: certs[idx].id };
    writeCerts(certs);

    // ← NUEVO: si pasó a "Aprobado" y antes no lo estaba, sincroniza la moneda en coins.json
    const newStatus = certs[idx].status;
    if (newStatus === 'Aprobado' && previousStatus !== 'Aprobado') {
      const coins = readCoins();
      const coinIdx = coins.findIndex(c => c.id === certs[idx].coinId);
      if (coinIdx !== -1) {
        coins[coinIdx].status = 'certified';
        writeCoins(coins);
      }
    }

    res.json(certs[idx]);
  } catch { res.status(500).json({ error: 'Error al actualizar certificación.' }); }
}