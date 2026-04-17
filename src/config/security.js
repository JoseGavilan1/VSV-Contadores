import rateLimit from 'express-rate-limit';
import { FRONTEND_URL } from '../../config.js';

// Configuración de CORS
// src/config/security.js

// src/config/security.js

export const corsOptions = {
  origin: true, // Esto le dice al servidor: "Acepta a cualquiera que venga con credenciales"
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id', 'x-company-id', 'x-company-rut'],
  exposedHeaders: ['x-session-id']
};

// Configuración de Rate Limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // Limite de peticiones por IP
  standardHeaders: true, 
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Intente más tarde.' }
});