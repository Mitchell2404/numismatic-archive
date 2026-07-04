import { api } from './api.js';
import { mascots as localMascots } from '../data/mockData.js';

export const mascotsService = {
  // Catálogo servido por el backend (/api/mascots). Si el servidor no
  // responde, se usa la copia local para no dejar la página vacía —
  // el llamador decide si avisa al usuario (flag fromFallback).
  async getAll() {
    try {
      const data = await api.get('/api/mascots');
      return { data, fromFallback: false };
    } catch {
      return { data: localMascots, fromFallback: true };
    }
  },

  async getById(id) {
    try { return await api.get(`/api/mascots/${id}`); }
    catch { return localMascots.find(m => m.id === id) || null; }
  },
};
