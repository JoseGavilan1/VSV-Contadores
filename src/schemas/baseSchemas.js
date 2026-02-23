import { z } from 'zod';
import { cleanRut, validateRut } from '../lib/rut.js';

export const rutSchema = z.string()
  .refine((val) => validateRut(val), { message: "RUT matemáticamente inválido" })
  .transform((val) => cleanRut(val));

export const emailSchema = z.string()
  .email("Email no válido")
  .trim()
  .toLowerCase();

export const uuidParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid("ID de usuario no válido")
  })
});