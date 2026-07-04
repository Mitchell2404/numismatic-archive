import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { serverConfig } from './config/server.js';
import router from './routes/index.js';

dotenv.config();
const app = express();

app.use(cors(serverConfig.cors));
app.use(express.json());
app.use(express.static('public'));
app.use('/api', router);

app.listen(serverConfig.port, () => {
  console.log(`🏛️  Numismatic Archive API → http://localhost:${serverConfig.port}`);
});
