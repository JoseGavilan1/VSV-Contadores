import { z } from 'zod';
import { rutSchema, emailSchema, uuidParamsSchema } from './baseSchemas.js';

const userBase = z.object({
  nombre: z.string().min(3, "Nombre muy corto").trim(),
  rut: rutSchema,
  email: emailSchema,
  clave: z.string().min(8, "Mínimo 8 caracteres").max(128).optional().or(z.literal('')),
  rol: z.enum(['Administrador', 'Consultor', 'Cliente']),
  activo: z.boolean().optional(),
  assignedCompanies: z.array(z.string().uuid("ID de compañía no válido")).optional()
});

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    clave: z.string().min(1, "La clave es requerida")
  })
});

export const createUserSchema = z.object({ body: userBase });

export const updateUserSchema = z.object({
  body: userBase.partial().extend({
    clave: z.string().min(8).optional().or(z.literal(''))
  })
});

export const deleteUserSchema = uuidParamsSchema;