import { Router } from 'express';

// Controllers
import { 
    getAccountingMetrics, 
    getChartOfAccounts, 
    getJournalEntries, 
    runBankReconciliationIA 
} from '../controllers/accounting.controllers.js';

// Middlewares
import { requireSession } from "../middleware/auth.js";

const router = Router();

router.use(requireSession);

router.get('/metrics', getAccountingMetrics); 
router.get('/chart-of-accounts', getChartOfAccounts);
router.get('/journal-entries', getJournalEntries);

// Ruta para la IA lista para ser activada
router.post('/reconcile-ia', runBankReconciliationIA);

export default router;