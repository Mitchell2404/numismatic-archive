// PREPARADO para activar en el futuro.
// Descomentar e instalar: npm install @supabase/supabase-js

// import { createClient } from '@supabase/supabase-js';
// import { storageConfig } from '../config/storage.js';
// const supabase = createClient(storageConfig.supabaseUrl, storageConfig.supabaseKey);

export const cloudProvider = {
  getImageUrl(category, filename) {
    throw new Error('Cloud provider not configured yet. Set STORAGE_PROVIDER=local in .env');
  },
  async streamImage(category, filename, res) {
    const url = this.getImageUrl(category, filename);
    res.redirect(url);
  },
};
