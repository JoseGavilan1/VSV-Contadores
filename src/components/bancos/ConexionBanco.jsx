import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Plus, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConexionBancoModal from './modals/ConexionBancoModal';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { connectBankApi, getConnectedBanksApi } from '@/services/bancoService';

const bancosDisponibles = [
    { id: 'santander', nombre: 'Santander', logo: 'https://logospng.org/download/santander/logo-santander-2048.png' },
    { id: 'bci', nombre: 'BCI', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Bci_Logotype.svg/2560px-Bci_Logotype.svg.png' },
    { id: 'chile', nombre: 'Banco de Chile', logo: 'https://companieslogo.com/img/orig/BCH-1e8f26ec.png?t=1720244490' },
    { id: 'estado', nombre: 'BancoEstado', logo: 'https://play-lh.googleusercontent.com/2S9GpuqzXOcjhTIHcScTMRYeSFsl-6x-cDQRpz0bwv0iDrojl6vi-BIXmwmxC_yXww' },
    { id: 'itau', nombre: 'Itaú', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Ita%C3%BA_Unibanco_logo_2023.svg/2048px-Ita%C3%BA_Unibanco_logo_2023.svg.png' },
    { id: 'scotiabank', nombre: 'Scotiabank', logo: 'https://images.icon-icons.com/2699/PNG/512/scotiabank_logo_icon_170755.png' },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: {
            type: "spring",
            damping: 25,
            stiffness: 120
        }
    }
};

const ConexionBanco = () => {
    const { selectedCompany, user } = useAuth();
    const empresaId = selectedCompany?.id;
    const queryClient = useQueryClient();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBank, setSelectedBank] = useState(null);

    const { data: connectedBanks = [], isLoading } = useQuery({
        queryKey: ['connected-banks', empresaId],
        queryFn: async () => {
            const res = await getConnectedBanksApi(user?.sessionId, empresaId);
            if (!res.ok) throw new Error("Error al obtener bancos");
            const data = await res.json();
            return data.map(b => b.banco_id);
        },
        enabled: !!empresaId && !!user?.sessionId,
    });

    const mutation = useMutation({
        mutationFn: (bankData) => connectBankApi(user?.sessionId, empresaId, bankData),
        onSuccess: () => {
            queryClient.invalidateQueries(['connected-banks', empresaId]);
            setIsModalOpen(false);
        }
    });

    const handleConnectClick = (banco) => {
        setSelectedBank(banco);
        setIsModalOpen(true);
    };

    const handleConnect = (bancoId) => {
        mutation.mutate({ banco_id: bancoId });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <>
            <ConexionBancoModal 
                isOpen={isModalOpen} 
                setIsOpen={setIsModalOpen} 
                banco={selectedBank}
                onConnect={handleConnect}
                empresaRUT={selectedCompany?.rut}
            />
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
            >
                <h3 className="text-xl font-semibold text-white mb-4 uppercase tracking-tighter italic">Conexiones Bancarias</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {bancosDisponibles.map(banco => {
                        const isConnected = connectedBanks.includes(banco.id);
                        return (
                            <motion.div 
                                key={banco.id} 
                                variants={itemVariants}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`relative p-4 rounded-xl flex flex-col items-center justify-center space-y-3 border transition-colors duration-300 ${
                                    isConnected ? 'bg-green-500/10 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-white/5 hover:bg-white/10 border-white/10'
                                }`}
                            >
                                <div className="h-10 w-full flex items-center justify-center">
                                    <img 
                                        src={banco.logo} 
                                        alt={`Logo ${banco.nombre}`} 
                                        className="h-full max-w-[120px] object-contain grayscale-[0.5] group-hover:grayscale-0 transition-all" 
                                    />
                                </div>
                                <p className="text-white font-black text-[10px] uppercase tracking-widest text-center">{banco.nombre}</p>
                                
                                <div className="min-h-[32px] flex items-center">
                                    {isConnected ? (
                                        <div className="flex items-center text-green-400 text-[10px] font-black uppercase tracking-tighter">
                                            <CheckCircle className="h-3 w-3 mr-1" /> Conectado
                                        </div>
                                    ) : (
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="text-[10px] h-8 font-bold uppercase border-white/10 hover:bg-white/20" 
                                            onClick={() => handleConnectClick(banco)}
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Conectar
                                        </Button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>
        </>
    );
};

export default memo(ConexionBanco);