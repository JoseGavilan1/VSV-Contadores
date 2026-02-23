import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const DelayedLoader = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
      <Loader2 className="h-10 w-10 text-blue-500 animate-spin opacity-40" />
      <span className="text-[10px] text-gray-500 uppercase font-black tracking-[0.3em]">
        Sincronizando Módulo...
      </span>
    </div>
  );
};

export default DelayedLoader;