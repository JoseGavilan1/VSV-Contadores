// Controllers
import { generateAccountingReport } from '../controllers/report.controllers.js';

// Middlewares
import { requireSession } from "../middleware/auth.js";

router.get('/generate', requireSession, generateAccountingReport);