# Instrucciones para asistentes de IA (Copilot / agentes)

Resumen rápido
- Repositorio: aplicación web React + backend Express (Node). Frontend con Vite en `src/` y backend en `src/server.js`.
- Start local: frontend con `npm run dev` (Vite, puerto 3000), backend con `npm run server` (Express, puerto 4000 por defecto).

Arquitectura y límites de responsabilidad
- Frontend: `src/main.jsx` y componentes en `src/components/`. UI y llamadas a la API consumen rutas bajo `/api/*`.
- Backend: `src/server.js` monta rutas desde `src/routes/` y la lógica de negocio vive en `src/controllers/` y `src/services/`.
- Base de datos: conexión central en `src/database/db.js`. También hay helpers de Supabase en `src/database/supabase.js`.
- Scripts y herramientas auxiliares: tareas offline o ETL en la raíz (`agregarDatos.mjs`, `extraccionSii.mjs`, `insertar.js`) y utilidades en `DatabaseThings/`.

Patrones y convenciones del proyecto (útiles para generar o modificar código)
- Rutas → Controllers: cada archivo en `src/routes` importa funciones desde `src/controllers` y exporta un `Router`. Ejemplo: [src/routes/accounting.routes.js](src/routes/accounting.routes.js) usa funciones de [src/controllers/accounting.controllers.js](src/controllers/accounting.controllers.js).
- Middlewares: autenticación y rate-limiter se aplican en `src/server.js` con `apiLimiter` y `requireSession`. Revisa [src/middleware/auth.js](src/middleware/auth.js) para la sesión.
- Errores: el backend expone un middleware de manejo de errores global en `src/server.js`; los controladores devuelven JSON con `message` y códigos HTTP.
- Mock / placeholder responses: varios controladores retornan datos simulados (útil para generar pruebas o mocks). Ej.: `getAccountingMetrics` en `src/controllers/accounting.controllers.js`.

Flujos críticos y comandos de desarrollo
- Levantar frontend: `npm run dev` (Vite) — escucha en `--port 3000` según `package.json`.
- Levantar backend: `npm run server` — ejecuta `node ./src/server.js` (puerto por `process.env.PORT || 4000`).
- Desarrollo típico: abrir dos terminales, ejecutar `npm run dev` y `npm run server` para tener frontend + API.
- Health check: `GET /health` expone estado de base de datos y uptime (ver [src/server.js](src/server.js)).

Integraciones y dependencias externas
- Base de datos PostgreSQL: usa `pg` y el pool está en `src/database/db.js`.
- Supabase: presente en dependencias y helpers en `src/database/supabase.js`.
- Puppeteer: utilizado tanto en scripts raíz como importado en `src/server.js` (automatización / scraping).
- DTE / SII: hay módulos y scripts relacionados (`extraccionSii.mjs`, `src/controllers/dte*.js`).

Consejos prácticos para agentes
- Cuando modifiques una ruta, actualiza el correspondiente controller y valida el middleware `requireSession` si aplica.
- Para cambios en el modelo de datos, revisar primero `src/services/*` y `src/database/db.js` antes de tocar controladores.
- Evitar suponer contratos externos: inspeccionar el controlador para ver si responde con datos reales o mocks antes de generar tests.
- Variables de entorno: el servidor carga `dotenv` — documenta nuevas env vars en `README.md` si las añades.

Archivos clave (menciona para consultas rápidas)
- Servidor principal: [src/server.js](src/server.js)
- Rutas: [src/routes](src/routes)
- Controladores: [src/controllers](src/controllers)
- Servicios: [src/services](src/services)
- DB pool: [src/database/db.js](src/database/db.js)
- Scripts raíz: `agregarDatos.mjs`, `extraccionSii.mjs`, `insertar.js` (raíz del repo)

Qué evitar
- No cambiar el comportamiento de autenticación (`src/middleware/auth.js`) sin coordinar; afecta todas las rutas.
- No asumir que los controladores devuelven datos reales (muchos son placeholders) — confirma con la fuente antes de escribir código que dependa de ellos.

Si necesitas más contexto
- Pide al desarrollador que comparta el `.env` de ejemplo o explique los flujos SII/DTE si vas a tocar esos módulos.

Si algo falta o es incorrecto, dime qué sección quieres que expanda o corrija.
