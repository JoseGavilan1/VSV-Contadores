export const getRentaMetrics = async (req, res) => {
    try {
        const { empresaId } = req.query;

        const metrics = {
            regimen: "Propyme General (14 D3)",
            cumplimiento: "Al día",
            proximaDeclaracion: "DJ 1948 - 28/03/2026",
            observacionesCount: 0,
            kpis: {
                liquidez: "1.92",
                endeudamiento: 42.5,
                rentabilidad: 14.8
            },
            aiSuggestion: "La IA sugiere provisionar un 2% adicional para el Impuesto de Primera Categoría basado en el flujo de caja proyectado.",
            alerts: [
                { title: 'Vencimiento DJ 1887', desc: 'Plazo final en 15 días. Información de sueldos lista.', color: 'text-yellow-400' },
                { title: 'Revisión de PPM', desc: 'Tu tasa de PPM (1.5%) es óptima para la utilidad actual.', color: 'text-green-400' },
                { title: 'Balance Cuadrado', desc: 'No se detectan diferencias entre Libro Mayor y Registro de Compras.', color: 'text-blue-400' }
            ]
        };

        return res.status(200).json(metrics);
    } catch (error) {
        return res.status(500).json({ message: "Error al calcular métricas de renta." });
    }
};

export const getAnalisisRenta = async (req, res) => {
    try {
        const analisis = {
            rli: {
                resultadoBalance: 85000000,
                agregados: 12500000,
                deducciones: 8000000,
                rliFinal: 89500000
            },
            cpt: {
                activoTotal: 250000000,
                pasivosExigibles: 120000000,
                cptFinal: 130000000
            }
        };
        return res.status(200).json(analisis);
    } catch (error) {
        return res.status(500).json({ message: "Error en motor de RLI/CPT." });
    }
};

export const getCalculoImpuestos = async (req, res) => {
    try {
        const calculo = {
            impuestoDeterminado: 8950000,
            creditos: 1200000,
            ppmPagados: 4500000,
            saldoAFavor: 0,
            totalAPagar: 3250000
        };
        return res.status(200).json(calculo);
    } catch (error) {
        return res.status(500).json({ message: "Error en cálculo de impuestos." });
    }
};

export const getAnalisisSocios = async (req, res) => {
    try {
        const socios = [
            { nombre: "Socio Principal", rut: "12.345.678-9", retiros: 15000000, credito: 1500000 },
            { nombre: "Socio Minoritario", rut: "18.987.654-3", retiros: 5000000, credito: 500000 }
        ];
        return res.status(200).json(socios);
    } catch (error) {
        return res.status(500).json({ message: "Error al recuperar datos de socios." });
    }
};

export const getDeclaracionesRenta = async (req, res) => {
    try {
        const declaraciones = [
            { codigo: "1887", nombre: "Sueldos", estado: "Aceptada", vencimiento: "19/03/2026" },
            { codigo: "1948", nombre: "Retiros y Créditos", estado: "Pendiente", vencimiento: "28/03/2026" },
            { codigo: "F22", nombre: "Impuesto a la Renta", estado: "Borrador", vencimiento: "30/04/2026" }
        ];
        return res.status(200).json(declaraciones);
    } catch (error) {
        return res.status(500).json({ message: "Error al listar declaraciones." });
    }
};