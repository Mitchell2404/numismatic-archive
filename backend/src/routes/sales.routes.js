import { Router } from 'express';
import { getSales, createSale, updateSale, deleteSale } from '../controllers/sales.controller.js';

const router = Router();

router.get('/',       getSales);    // GET    /api/sales
router.post('/',      createSale);  // POST   /api/sales
router.put('/:id',    updateSale);  // PUT    /api/sales/:id
router.delete('/:id', deleteSale);  // DELETE /api/sales/:id

export default router;