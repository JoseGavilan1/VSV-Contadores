import rateLimit from 'express-rate-limit';
import { FRONTEND_URL } from '../../config.js';

// Configuración de CORS
export const corsOptions = {
  origin: (origin, callback) => {
    const allowed = [
      FRONTEND_URL, 
      'http://localhost:3000', 
      'http://localhost:5173',
      'https://vsv-contadores-five.vercel.app',
      'https://vsv-contadores-production.up.railway.app'
    ]

    if (!origin || allowed.some(a => origin === a || (a && origin.startsWith(a)))) {
      return callback(null, true);
    }
    callback(new Error('Bloqueado por seguridad VSV'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-session-id', 
    'x-company-id',
    'x-company-rut'
  ],
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