export const storageConfig = {
  provider: process.env.STORAGE_PROVIDER || 'local',
  localBasePath: './public/images',
  // supabaseUrl: process.env.SUPABASE_URL,
  // supabaseKey: process.env.SUPABASE_KEY,
  // supabaseBucket: process.env.SUPABASE_BUCKET || 'numismatic-images',
};
