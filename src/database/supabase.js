import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// Cargamos la clave maestra desde tu .env
// OJO: Asegúrate de que en tu .env diga VITE_SUPABASE_SERVICE_ROLE_KEY
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Acceso 1: Normal (el que ya usas)
export const supabase = createClient(supabaseUrl, supabaseKey);

// Acceso 2: Administrador (este es el que te permite ver los documentos)
export const supabaseAdmin = createClient(supabaseUrl, serviceKey);