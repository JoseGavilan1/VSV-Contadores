import { Router } from 'express';
import { loginUser } from '../controllers/auth.controllers.js';
import { validateSchema } from "../middleware/validator.middleware.js";
import { loginSchema, createUserSchema } from "../schemas/user.schema.js";
import { createUser } from '../controllers/users.controllers.js';

const router = Router();

router.post('/login', validateSchema(loginSchema), loginUser);
router.post('/register', validateSchema(createUserSchema), createUser);

export default router;