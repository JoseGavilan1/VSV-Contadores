export const getRrhhMetrics = async (req, res) => {
    const { empresaId } = req.query; 

    if (!empresaId) return res.status(400).json({ message: "ID de empresa requerido" });

    try {
        res.json({
            totalEmpleados: 15,
            masaSalarial: 12500000,
            nuevosContratos: 2,
            finiquitos: 1,
            variacionEmpleados: "+1",
            variacionMasa: "+2.5%"
        });
    } catch (error) {
        res.status(500).json({ message: "Error al cargar métricas de RRHH" });
    }
};

export const getEmployees = async (req, res) => {
    try {
        const { empresaId } = req.query;

        if (!empresaId) {
            return res.status(400).json({ message: "ID de empresa requerido" });
        }

        const empleados = [
            { 
                id: '1', 
                nombre: 'Carlos Pérez', 
                rut: '12.345.678-9', 
                cargo: 'Analista Contable', 
                estado: 'Activo' 
            },
            { 
                id: '2', 
                nombre: 'Ana María Silva', 
                rut: '15.987.654-3', 
                cargo: 'Desarrollador Senior', 
                estado: 'Activo' 
            }
        ];

        return res.status(200).json(empleados);

    } catch (error) {
        console.error("❌ Error en el búnker de RRHH:", error);
        return res.status(500).json({ message: "Error interno al recuperar personal" });
    }
};

export const getLiquidaciones = async (req, res) => {
    try {
        const { empresaId } = req.query;

        if (!empresaId) {
            return res.status(400).json({ message: "ID de empresa requerido" });
        }

        const liquidaciones = [
            { 
                id: 'LIQ-001', 
                empleado: 'Carlos Pérez', 
                periodo: '2026-01', 
                liquido: 850000, 
                estado: 'Pagado' 
            },
            { 
                id: 'LIQ-002', 
                empleado: 'Ana María Silva', 
                periodo: '2026-01', 
                liquido: 1250000, 
                estado: 'Pendiente' 
            }
        ];

        return res.status(200).json(liquidaciones);

    } catch (error) {
        console.error("❌ Error en el búnker de liquidaciones:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

export const getDocuments = async (req, res) => {
    try {
        const { empresaId } = req.query;
        
        const documentos = [
            { 
                id: 'DOC-001', 
                tipo: 'Contrato', 
                empleado: 'Carlos Pérez', 
                fecha: '2026-01-15', 
                url: '/archivos/contrato_carlos.pdf' 
            }
        ];

        return res.status(200).json(documentos);
    } catch (error) {
        return res.status(500).json({ message: "Error al acceder al archivo." });
    }
};

export const getAsistencia = async (req, res) => {
    try {
        const { empresaId } = req.query;
        const asistencia = [
            { empleado: 'Juan Carlos Pérez', fecha: '2026-01-27', entrada: '09:01', salida: '18:05', horas: '8h 4m' },
            { empleado: 'María Elena González', fecha: '2026-01-27', entrada: '08:55', salida: '18:01', horas: '8h 6m' }
        ];
        return res.status(200).json(asistencia);
    } catch (error) {
        return res.status(500).json({ message: "Error en el reloj del búnker" });
    }
};

export const generateReport = async (req, res) => {
    try {
        const { empresaId, tipoReporte } = req.query;

        if (!empresaId || !tipoReporte) {
            return res.status(400).json({ message: "Faltan parámetros para generar el reporte" });
        }

        // switch(tipoReporte) {
        //    case 'libro_remuneraciones': generarExcel(); break;
        //    case 'certificados': generarPDF(); break;
        // }

        return res.status(200).json({ 
            message: `Solicitud de ${tipoReporte} recibida correctamente para empresa ${empresaId}.`,
            status: "En cola de procesamiento"
        });

    } catch (error) {
        console.error("❌ Error en generador de reportes:", error);
        return res.status(500).json({ message: "Error interno en el motor de reportes" });
    }
};

// Configuración de RRHH

export const getRrhhConfig = async (req, res) => {
    try {
        const { empresaId } = req.query;

        if (!empresaId) {
            return res.status(400).json({ message: "ID de empresa requerido" });
        }

        // const config = await db.rrhh_configuracion.findUnique({ where: { empresa_id: empresaId } });
        
        const defaultConfig = {
            sueldoMinimo: 560000,
            uf: 38750,
            utm: 69200,
            tasaSeguroCesantia: 0.006,
            tasaSIS: 1.78,
            afpComisiones: {
                'Capital': 1.44, 'Cuprum': 1.44, 'Habitat': 1.27,
                'Modelo': 0.58, 'Planvital': 1.16, 'Provida': 1.45, 'Uno': 0.69,
            }
        };

        return res.status(200).json(defaultConfig);

    } catch (error) {
        console.error("❌ Error al recuperar configuración:", error);
        return res.status(500).json({ message: "Error interno al leer parámetros legales" });
    }
};

export const updateRrhhConfig = async (req, res) => {
    try {
        const { empresaId } = req.query;
        const configData = req.body;

        if (!empresaId) return res.status(400).json({ message: "ID de empresa requerido" });

        return res.status(200).json({ message: "Configuración guardada exitosamente" });
    } catch (error) {
        return res.status(500).json({ message: "Error al guardar en el búnker" });
    }
};