// backend/src/routes/coins.js
// Reemplaza o actualiza el archivo de rutas de monedas existente.

import { Router } from 'express';
import { getCoins, createCoin, updateCoin, deleteCoin } from '../controllers/coins.controller.js';

const router = Router();

router.get('/',      getCoins);     // GET  /api/coins
router.post('/',     createCoin);   // POST /api/coins
router.put('/:id',   updateCoin);   // PUT  /api/coins/:id
router.delete('/:id', deleteCoin);  // DELETE /api/coins/:id

export default router;