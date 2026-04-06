import React from 'react';
import { motion } from 'framer-motion';
import { Building2, LogIn, RefreshCw, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ConexionSIIStatus = ({ isConnected, onConnect, onSync, isSyncing, lastSync }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className={`bg-gradient-to-r ${isConnected ? 'from-green-500/20 to-emerald-500/20 border-green-500/30' : 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30'} rounded-2xl p-6 border`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 ${isConnected ? 'bg-green-500' : 'bg-yellow-500'} rounded-xl flex items-center justify-center`}>
                        <Link2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Conexión con el SII</h3>
                        {isConnected ? (
                            <p className="text-green-300 text-sm">
                                {lastSync ? `Última sincronización: ${lastSync}` : 'Conectado y listo para sincronizar.'}
                            </p>
                        ) : (
                            <p className="text-yellow-300 text-sm">Se requiere autenticación para sincronizar documentos.</p>
                        )}
                    </div>
                </div>
                {isConnected ? (
                    <div className="flex items-center space-x-3">
                        <Button variant="ghost" size="sm" onClick={onSync} disabled={isSyncing} className="text-white hover:bg-white/10">
                            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                        </Button>
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-green-400 font-medium">Conectado</span>
                        </div>
                    </div>
                ) : (
                    <Button onClick={onConnect} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                        <LogIn className="h-4 w-4 mr-2" />
                        Conectar al SII
                    </Button>
                )}
            </div>
        </motion.div>
    );
};

export default ConexionSIIStatus;