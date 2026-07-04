import { mascots } from '../data/mockData.js';

export function getAll(req, res) {
  res.json(mascots);
}

export function getById(req, res) {
  const mascot = mascots.find(m => m.id === req.params.id);
  if (!mascot) return res.status(404).json({ error: 'Mascot not found' });
  res.json(mascot);
}
