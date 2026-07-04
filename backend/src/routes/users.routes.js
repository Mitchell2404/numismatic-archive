import { Router } from 'express';
import { getUsers, getUserById, updateUser } from '../controllers/users.controller.js';

const router = Router();
router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);

export default router;
