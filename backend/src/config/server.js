export const serverConfig = {
  port: process.env.PORT || 3001,
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
};
