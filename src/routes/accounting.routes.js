import { Router } from 'express';
import multer from 'multer';

// Controllers
import { 
    getAccountingMetrics, 
    getChartOfAccounts, 
    getJournalEntries, 
    runBankReconciliationIA,
    uploadAccountingExcel
} from '../controllers/accounting.controllers.js';

// Middlewares
import { requireSession } from "../middleware/auth.js";

const router = Router();

// Configuración de Multer para subida en memoria
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireSession);

router.get('/metrics', getAccountingMetrics); 
router.get('/chart-of-accounts', getChartOfAccounts);
router.get('/journal-entries', getJournalEntries);

// Ruta para la IA lista para ser activada
router.post('/reconcile-ia', runBankReconciliationIA);

// Nueva ruta para importar Excel
router.post('/importar-excel', upload.single('archivo'), uploadAccountingExcel);

export default router;