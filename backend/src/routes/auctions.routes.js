import { Router } from 'express';
import { getAuctions, createAuction, updateAuction, deleteAuction, placeBid }
  from '../controllers/auctions.controller.js';

const router = Router();
router.get('/',          getAuctions);
router.post('/',         createAuction);
router.put('/:id',       updateAuction);
router.post('/:id/bids', placeBid);
router.delete('/:id',    deleteAuction);

export default router;
