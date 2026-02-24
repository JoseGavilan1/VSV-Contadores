import { useState, useEffect } from 'react';

export const useClientes = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/clientes-crm')
            .then(res => res.json())
            .then(data => {
                setClients(data);
                setLoading(false);
            });
    }, []);

    return { clients, loading };
};