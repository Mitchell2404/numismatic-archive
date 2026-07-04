import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const DATA_PATH  = join(__dirname, '../data/sales.json');

function readSales() {
  try {
    return JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function writeSales(data) {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/sales
export function getSales(req, res) {
  try {
    const sales = readSales();
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: 'Error al leer ventas.' });
  }
}

// POST /api/sales
export function createSale(req, res) {
  try {
    const sales = readSales();
    const { coinId, coinName, buyer, salePrice, date, status, paymentMethod, notes } = req.body;

    if (!coinName || !buyer || !salePrice) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    const newSale = {
      id: `VTA-${Date.now()}`,
      coinId:        coinId        || '',
      coinName:      coinName,
      buyer:         buyer,
      salePrice:     Number(salePrice),
      date:          date || new Date().toISOString().slice(0, 10),
      status:        status        || 'Pendiente',
      paymentMethod: paymentMethod || 'Transferencia Bancaria',
      notes:         notes         || '',
      createdAt:     new Date().toISOString(),
    };

    sales.unshift(newSale);
    writeSales(sales);
    res.status(201).json(newSale);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear venta.' });
  }
}

// PUT /api/sales/:id
export function updateSale(req, res) {
  try {
    const sales = readSales();
    const idx = sales.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Venta no encontrada.' });

    sales[idx] = { ...sales[idx], ...req.body, id: sales[idx].id };
    writeSales(sales);
    res.json(sales[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar venta.' });
  }
}

// DELETE /api/sales/:id
export function deleteSale(req, res) {
  try {
    const sales = readSales();
    const idx = sales.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Venta no encontrada.' });

    const [deleted] = sales.splice(idx, 1);
    writeSales(sales);
    res.json({ deleted: true, id: deleted.id });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar venta.' });
  }
}