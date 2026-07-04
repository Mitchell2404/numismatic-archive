import { Router } from 'express';
import { getConversations, sendMessage, deleteMessage } from '../controllers/conversations.controller.js';

const router = Router();
router.get('/', getConversations);
router.post('/:id/messages', sendMessage);
router.delete('/:id/messages/:messageId', deleteMessage);

export default router;