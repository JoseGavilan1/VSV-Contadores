import 'dotenv/config';
// Corregimos la ruta: salimos de DatabaseThings con ../ para entrar a sii_core
import { guardarEmpresa } from '../sii_core/sii_datos_empresa/sii_database.mjs';

const datosMrPasta = {
    razonSocial: "MR PASTA SPA",
    rut: "77944164-4",
    direccion: "CALLE FALSA 123", 
    comuna: "SANTIAGO",
    giro: "RESTAURANTES Y COMIDAS", 
    correo: "cfellay@forsend.cl; jm_astudillo@hotmail.com",
    telefono: "56977977216",
    whatsapp: "56977977216",
    regimenTributario: "Pro Pyme General",
    inicioActividades: "SI",
    estadoCumplimiento: "AL DIA",
    pagoServicio: "PAGADO",
    estadoFormulario: "DECLARADO",
    neto: 3695363, 
    bruto: 142800,  
    ventas: 55132143,
    compras: 32425184,
    contratoRenta: true,
    representantes: [
        { nombre: "CRISTOBAL ALEJANDRO FELLAY MUÑOZ", rut: "16020045-6" }
    ]
};

async function ejecutar() {
    try {
        console.log("🚀 Iniciando carga manual de MR PASTA SPA...");
        // Usamos las credenciales que me diste
        await guardarEmpresa(datosMrPasta, "16020045-6", "mafe2018");
        console.log("✨ MR PASTA SPA inyectado con éxito en el búnker.");
    } catch (error) {
        console.error("❌ Fallo en la carga:", error.message);
    }
}

ejecutar();