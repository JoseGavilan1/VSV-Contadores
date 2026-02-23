import { z } from 'zod';
import { rutSchema, emailSchema, uuidParamsSchema } from './baseSchemas.js';
import { cleanRut } from '../lib/rut.js';

const companyBase = z.object({
  // Identidad Corporativa
  razonSocial: z.string().trim().min(3, "Mínimo 3 caracteres").max(200),
  rut: rutSchema,
  giro: z.string().trim().min(5, "Giro insuficiente").max(255),
  regimenTributario: z.string().trim().min(3, "Especifique régimen"),

  // Ubicación y contacto
  direccion: z.string().trim().min(5, "Dirección incompleta"),
  comuna: z.string().trim().min(3, "Comuna inválida"),
  ciudad: z.string().trim().min(3, "Ciudad inválida"),
  
  telefonoCorporativo: z.string()
    .trim()
    .regex(/^\+?[0-9\s]{7,20}$/, "Formato de teléfono inválido (debe incluir prefijo)")
    .optional()
    .or(z.literal('')),
    
  emailCorporativo: emailSchema.optional().or(z.literal('')),

  // Credenciales SII
  siiRut: rutSchema.refine(val => {
    const clean = cleanRut(val); 
    return clean.length >= 9 && clean.length <= 10;
  }, {
    message: "RUT SII debe tener entre 9 y 10 caracteres"
  }),
  siiEmail: emailSchema,
  siiPassword: z.string()
    .trim()
    .optional() 
    .or(z.literal('')) 
    .refine(val => !val || val.length >= 4, {
      message: "Si vas a cambiar la clave, debe tener al menos 4 caracteres"
    }),

  // Representación Legal
  nombreRep: z.string().trim().max(100).optional().or(z.literal('')),
  
  rutRep: z.string()
    .trim()
    .optional()
    .nullable()
    .or(z.literal(''))
    .refine(val => {
      if (!val || val === "") return true;
      const clean = val.replace(/\./g, '');
      return /^[0-9]+-[0-9kK]{1}$/.test(clean);
    }, {
      message: "Formato de RUT Representante debe ser XXXXXXXX-X"
    }),
  
  activo: z.boolean().default(true),
  usuarioId: z.string().uuid("ID de usuario no válido").optional()
});

export const createCompanySchema = z.object({ 
  body: companyBase 
});

export const updateCompanySchema = z.object({
  body: companyBase.partial()
});

export const deleteCompanySchema = uuidParamsSchema;