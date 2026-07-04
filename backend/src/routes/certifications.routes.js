import { Router } from 'express';
import { getCertifications, createCertification, updateCertification } from '../controllers/certifications.controller.js';

const router = Router();
router.get('/',    getCertifications);
router.post('/',   createCertification);
router.put('/:id', updateCertification);

export default router;