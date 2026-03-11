import fs from 'fs';
import path from 'path';

// Función recursiva para dibujar el árbol de carpetas
function imprimirArbol(directorio, nivel = 0) {
    try {
        const elementos = fs.readdirSync(directorio);

        elementos.forEach(elemento => {
            // Ignoramos carpetas pesadas o irrelevantes
            if (elemento === 'node_modules' || elemento === '.git' || elemento === '.vscode') {
                return;
            }

            const rutaCompleta = path.join(directorio, elemento);
            const stats = fs.statSync(rutaCompleta);
            const esDirectorio = stats.isDirectory();
            
            // Dibujamos con sangría e iconos
            const sangria = '│   '.repeat(nivel);
            const icono = esDirectorio ? '📁' : '📄';
            
            console.log(`${sangria}├── ${icono} ${elemento}`);

            // Si es carpeta, entramos a leerla (recursividad)
            if (esDirectorio) {
                imprimirArbol(rutaCompleta, nivel + 1);
            }
        });
    } catch (error) {
        console.error(`Error leyendo el directorio ${directorio}:`, error.message);
    }
}

console.log("\n🌳 Estructura actual de tu proyecto:");
console.log("📁 (Raíz)");
// Puedes cambiar './' por la ruta específica si no quieres leer donde estás parado
imprimirArbol('./');
console.log("\n");