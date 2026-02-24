import { Router } from 'express';
import { addNotaCRM, getClientesCRM, updateClienteCRM } from '../controllers/clientes.controllers.js';
import { requireSession } from '../middleware/auth.js';

const router = Router();

router.get('/crm', requireSession, getClientesCRM);
router.put('/crm/:empresaId', requireSession, updateClienteCRM);
router.post('/crm/:empresaId/notas', requireSession, addNotaCRM);

export default router;
