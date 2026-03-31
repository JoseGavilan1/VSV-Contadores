import pkg from 'xlsx';
const { readFile, utils } = pkg;
import * as fs from 'fs';

// Ruta corregida con el nombre exacto del archivo
const rutaArchivo = 'C:\\Users\\felip\\OneDrive\\Documentos\\VS\\VSV-Contadores\\src\\components\\facturacion\\CONTABILIDAD 2026 (2).xlsx';

function generarArregloFacturacion() {
    try {
        if (!fs.existsSync(rutaArchivo)) {
            console.error('Error: El archivo no existe en la ruta:', rutaArchivo);
            return [];
        }

        const workbook = readFile(rutaArchivo);
        const hoja = workbook.Sheets['MARZO'];
        const registros = utils.sheet_to_json(hoja);

        const facturasAProcesar = registros.filter(fila => {
            const razonSocial = fila['RAZON SOCIAL'] ? fila['RAZON SOCIAL'].toString().toUpperCase() : '';
            const estadoPago = fila['PAGO SERVICIO'] ? fila['PAGO SERVICIO'].toString().toUpperCase().trim() : '';
            
            // Filtros: PAGADO/NO PAGADO y Exclusiones de seguridad
            const estadoValido = (estadoPago === 'PAGADO' || estadoPago === 'NO PAGADO');
            const esExcluido = razonSocial.includes('HAMABU') || razonSocial.includes('ANITA MARIA VEAS');

            return estadoValido && !esExcluido;
        }).map(fila => {
            // Procesar RUT Receptor (Columna RUT)
            const rutFull = fila['RUT'] ? fila['RUT'].toString().trim().replace(/\./g, '') : '';
            const [rRecep, dRecep] = rutFull.split('-');

            // Procesar RUT Solicita (Columna RUT rl)
            const rutSolFull = fila['RUT rl'] ? fila['RUT rl'].toString().trim().replace(/\./g, '') : '';
            const [rSol, dSol] = rutSolFull.split('-');

            // Construcción del objeto con campos fijos y dinámicos
            return {
                razonSocial: fila['RAZON SOCIAL'],
                rutReceptor: rRecep || '',
                dvReceptor: dRecep || '',
                ciudadEmisor: 'Santiago',       // FIJO
                telefonoEmisor: '56978278733',   // FIJO
                ciudadReceptor: 'Santiago',     // FIJO
                contactoReceptor: fila['CORREO'] || '',
                rutSolicita: rSol || '',
                dvSolicita: dSol || '',
                producto: {
                    nombre: `Plan ${fila['PLAN CONTABLE'] || 'GO'}`, // Dinámico: Plan + nombre del plan
                    cantidad: '1',
                    unidad: '1',
                    precio: fila['NETO'] ? fila['NETO'].toString().replace(/[^0-9]/g, '') : '0',
                    descripcion: 'Marzo'
                }
            };
        });

        return facturasAProcesar;

    } catch (error) {
        console.error("Error crítico al generar el arreglo:", error.message);
        return [];
    }
}

// Generar y mostrar el arreglo antes de cualquier otro proceso
const facturasAProcesar = generarArregloFacturacion();

console.log("=== ARREGLO DE FACTURAS GENERADO ===");
console.log(JSON.stringify(facturasAProcesar, null, 2));
console.log(`\nTotal de registros para procesar: ${facturasAProcesar.length}`);

export { facturasAProcesar };