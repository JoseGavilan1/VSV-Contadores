export const generateAccountingReport = async (req, res) => {
    const { empresaId, tipo, desde, hasta } = req.query;

    if (!empresaId || !tipo) {
        return res.status(400).json({ message: "Contexto de reporte incompleto" });
    }

    try {
        switch (tipo) {
            case 'balance_8_columnas':
                return await getBalance8Columnas(empresaId, desde, hasta, res);
            case 'libro_diario':
                return await getLibroDiario(empresaId, desde, hasta, res);
            case 'estado_resultados':
                return await getEstadoResultados(empresaId, desde, hasta, res);
            default:
                res.status(404).json({ message: "Tipo de reporte no soportado" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error al generar el reporte" });
    }
};