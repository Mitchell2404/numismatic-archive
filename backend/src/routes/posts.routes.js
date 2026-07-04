import { Router } from 'express';
import { getPosts, createPost, updatePost, deletePost, addComment } from '../controllers/posts.controller.js';

const router = Router();
router.get('/',       getPosts);
router.post('/',      createPost);
router.put('/:id',    updatePost);
router.delete('/:id', deletePost);
router.post('/:id/comments', addComment);

export default router;