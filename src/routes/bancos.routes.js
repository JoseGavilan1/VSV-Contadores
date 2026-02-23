import { Router } from 'express';
import { 
    getConnectedBanks,
    getMovimientosBancarios, 
    uploadCartola, 
    connectBank, 
    autoConciliar,
    disconnectBank,
    updateEstadoMovimiento
} from '../controllers/bancos.controllers.js';

const router = Router();

router.get('/connected', getConnectedBanks);
router.get('/movimientos', getMovimientosBancarios);
router.post('/cartola', uploadCartola);
router.post('/connect', connectBank);
router.post('/conciliar/auto', autoConciliar);
router.delete('/connect/:bancoId', disconnectBank);
router.patch('/movimientos/:movimientoId', updateEstadoMovimiento);

export default router;