import { Router } from 'express';
import { getImage, upload, uploadImage } from '../controllers/images.controller.js';

const router = Router();

// GET /api/images/:category/:filename -> Para mostrar las imágenes en la app
router.get('/:category/:filename', getImage);

// POST /api/images/upload -> Para recibir las fotos desde el formulario del frontend
// 'image' es el nombre del campo (FormData) que enviará React
router.post('/upload/:category', upload.single('image'), uploadImage);
router.post('/upload', upload.single('image'), uploadImage);

export default router;