export const imageService = {
  coin(filename)     { return this._resolve('coins',   filename); },
  mascot(filename)   { return this._resolve('mascots', filename); },
  mascotState(state) { return this._resolve('mascots', `mascot-${state}.png`); },
  ui(filename)       { return this._resolve('ui',      filename); },
  _resolve(category, filename) {
    const STORAGE_MODE = import.meta.env.VITE_STORAGE_MODE || 'local';
    const BACKEND_URL  = import.meta.env.VITE_BACKEND_URL  || 'http://localhost:3001';
    switch (STORAGE_MODE) {
      case 'backend': return `${BACKEND_URL}/api/images/${category}/${filename}`;
      case 'cloud':
      case 'local':
      default:        return `/images/${category}/${filename}`;
    }
  },
};
