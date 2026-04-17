import rateLimit from 'express-rate-limit';
import { FRONTEND_URL } from '../../config.js';

// Configuración de CORS
// src/config/security.js

export const corsOptions = {
  origin: (origin, callback) => {
    const allowed = [
      'https://vsv-contadores-five.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173'
    ];

    // Logica ultra-flexible: 
    // Si no hay origen (como el health check) o si el origen contiene nuestra URL de vercel
    if (!origin || allowed.some(a => origin.includes('vercel.app') || origin === a)) {
      return callback(null, true);
    }
    
    console.log("Origen rechazado:", origin); // Esto saldrá en los logs de Railway
    callback(new Error('Bloqueado por seguridad VSV'));
  },
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