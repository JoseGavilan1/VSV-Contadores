import { Router } from 'express';
import { getUsers, updateUser, deleteUser, createUser } from '../controllers/users.controllers.js';
import { requireSession, requireAdmin } from "../middleware/auth.js";
import { validateSchema } from "../middleware/validator.middleware.js";
import { createUserSchema, updateUserSchema, deleteUserSchema } from "../schemas/user.schema.js";

const router = Router();

router.use(requireSession, requireAdmin);

router.get('/', getUsers);
router.post('/', validateSchema(createUserSchema), createUser);
router.put('/:id', validateSchema(updateUserSchema), updateUser);
router.delete('/:id', validateSchema(deleteUserSchema), deleteUser);

export default router;