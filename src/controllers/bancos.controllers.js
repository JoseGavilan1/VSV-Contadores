export const getConnectedBanks = async (req, res) => {
    try {
        const { empresaId } = req.query;

        const bancosConectados = [
            { banco_id: 'santander' },
            { banco_id: 'chile' }
        ];

        return res.status(200).json(bancosConectados);
    } catch (error) {
        return res.status(500).json({ message: "Error al recuperar bancos conectados." });
    }
};

export const getMovimientosBancarios = async (req, res) => {
    try {
        const { empresaId } = req.query;

        const movimientos = [
            { id: 1, fecha: '2026-01-25', descripcion: 'PAGO FACTURA 455 - CLIENTE ALFA', monto: 1250000, tipo: 'ABONO', estado: 'CONCILIADO' },
            { id: 2, fecha: '2026-01-26', descripcion: 'PAGO PROVEEDOR - SERVICIOS NUBE', monto: -45000, tipo: 'CARGO', estado: 'PENDIENTE' },
            { id: 3, fecha: '2026-01-27', descripcion: 'TRANSFERENCIA RECIBIDA - VENTA WEB', monto: 85000, tipo: 'ABONO', estado: 'PENDIENTE' }
        ];

        return res.status(200).json(movimientos);
    } catch (error) {
        return res.status(500).json({ message: "Error al recuperar movimientos bancarios." });
    }
};

export const uploadCartola = async (req, res) => {
    try {
        const { empresaId } = req.query;
        const { movimientos } = req.body;

        if (!movimientos || movimientos.length === 0) {
            return res.status(400).json({ message: "No se detectaron movimientos para importar." });
        }
        
        console.log(`📥 Importando ${movimientos.length} movimientos para empresa: ${empresaId}`);

        return res.status(201).json({ 
            message: "Cartola procesada exitosamente",
            count: movimientos.length 
        });
    } catch (error) {
        console.error("❌ Error en importación:", error);
        return res.status(500).json({ message: "Error interno al procesar la cartola." });
    }
};

export const connectBank = async (req, res) => {
    try {
        const { empresaId } = req.query;
        const { banco_id } = req.body;

        return res.status(200).json({ 
            message: `Conexión con ${banco_id} establecida correctamente.`,
            banco_id 
        });
    } catch (error) {
        return res.status(500).json({ message: "Fallo en la conexión bancaria." });
    }
};

export const autoConciliar = async (req, res) => {
    try {
        const { empresaId } = req.query;
        
        return res.status(200).json({ 
            message: "Proceso de conciliación automática iniciado.",
            sugerencias_encontradas: 12 
        });
    } catch (error) {
        return res.status(500).json({ message: "Error en el motor de conciliación." });
    }
};

export const disconnectBank = async (req, res) => {
    try {
        const { empresaId } = req.query;
        const { bancoId } = req.params;
        return res.status(200).json({ message: `Banco ${bancoId} desconectado del búnker.` });
    } catch (error) {
        return res.status(500).json({ message: "Error al desconectar el banco." });
    }
};

export const updateEstadoMovimiento = async (req, res) => {
    try {
        const { empresaId } = req.query;
        const { movimientoId } = req.params;
        const { estado } = req.body;
        return res.status(200).json({ message: "Estado actualizado.", movimientoId, estado });
    } catch (error) {
        return res.status(500).json({ message: "Error al actualizar el movimiento." });
    }
};