import { pool } from "../database/db.js";

export const getDashboardData = async (req, res) => {
    const { empresaId } = req.query; 

    if (!empresaId) {
        return res.status(400).json({ 
            success: false, 
            message: "Contexto insuficiente: Se requiere ID de entidad para extraer métricas." 
        });
    }

    try {
        const metrics = {
            ingresosMes: 1,
            gastosMes: 2,
            dteEmitidos: 3,
            empleadosActivos: 12,
            success: true
        };

        const chartData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; 

        res.json({
            ...metrics,
            chartData,
            message: "Sincronización de métricas completada."
        });

    } catch (error) {
        console.error("❌ Error en Dashboard Controller:", error.message);
        res.status(500).json({ 
            success: false,
            message: "Fallo en el puente de datos del búnker." 
        });
    }
};