import { storageConfig } from '../config/storage.js';
import { localProvider } from './localProvider.js';

export const storageProvider = {
  getImageUrl(category, filename) {
    switch (storageConfig.provider) {
      case 'supabase':
      case 's3':
      case 'cloudinary':
        return localProvider.getImageUrl(category, filename);
      case 'local':
      default:
        return localProvider.getImageUrl(category, filename);
    }
  },
  async streamImage(category, filename, res) {
    return localProvider.streamImage(category, filename, res);
  },
};
