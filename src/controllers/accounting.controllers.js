export const getAccountingMetrics = async (req, res) => {
    const { empresaId } = req.query;
    
    if (!empresaId || empresaId === 'undefined') {
        return res.status(400).json({ message: "ID de entidad no válido para el búnker" });
    }

    try {
        res.json({
            totalActivos: 15500000,
            totalPasivos: 8200000,
            patrimonio: 7300000,
            asientosMes: 48,
            variacion: "+12.5%",
            status: "Sincronizado"
        });
    } catch (error) {
        console.error("❌ Error en Métricas:", error);
        res.status(500).json({ message: "Fallo en el cálculo de estados financieros" });
    }
};

export const getChartOfAccounts = async (req, res) => {
    const { empresaId } = req.query;
    try {
        res.json({
            plan: [
                { id: 1, codigo: "1", nombre: "ACTIVO", tipo: "Grupo", protegida: true, nivel: 1 },
                { id: 2, codigo: "1.1", nombre: "ACTIVO CORRIENTE", tipo: "Subgrupo", protegida: true, nivel: 2 },
                { id: 3, codigo: "1.1.01", nombre: "EFECTIVO Y EQUIVALENTES", tipo: "Cuenta", protegida: false, nivel: 3 },
                { id: 4, codigo: "1.1.01.001", nombre: "CAJA GENERAL", tipo: "Subcuenta", protegida: false, nivel: 4, saldo: 1500000 },
                { id: 5, codigo: "1.1.01.002", nombre: "BANCO ESTADO", tipo: "Subcuenta", protegida: false, nivel: 4, saldo: 12000000 },
                { id: 6, codigo: "2", nombre: "PASIVO", tipo: "Grupo", protegida: true, nivel: 1 },
                { id: 7, codigo: "2.1", nombre: "PASIVO CORRIENTE", tipo: "Subgrupo", protegida: true, nivel: 2 },
            ]
        });
    } catch (error) {
        res.status(500).json({ message: "Error al mapear plan de cuentas" });
    }
};

export const getJournalEntries = async (req, res) => {
    const { empresaId, page = 0, search = "" } = req.query;
    try {
        res.json({
            asientos: [
                { 
                    id: "as-001", 
                    fecha: "2026-01-20", 
                    descripcion: "Apertura de Caja Mensual", 
                    debe: 500000, 
                    haber: 0, 
                    estado: "Mayorizado",
                    usuario: "Admin"
                },
                { 
                    id: "as-002", 
                    fecha: "2026-01-21", 
                    descripcion: "Pago Proveedores Servicios", 
                    debe: 0, 
                    haber: 120000, 
                    estado: "Pendiente",
                    usuario: "Sistema"
                }
            ],
            total: 2,
            page: Number(page)
        });
    } catch (error) {
        res.status(500).json({ message: "Error al consultar el libro diario" });
    }
};

export const runBankReconciliationIA = async (req, res) => {
    const { empresaId, cartolaId } = req.body;
    try {
        setTimeout(() => {
            res.json({ 
                success: true, 
                message: "IA ha procesado la cartola exitosamente",
                matchedCount: 15,
                pendingCount: 2,
                accuracy: "98%"
            });
        }, 1500);
    } catch (error) {
        res.status(500).json({ message: "Fallo en el motor de IA contable" });
    }
};