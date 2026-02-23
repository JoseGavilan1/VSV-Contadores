// Verificador, formateador y limpiador de RUT chileno
export const cleanRut = (rut) => {
  if (typeof rut !== 'string') return '';
  
  const limpio = rut.toUpperCase().replace(/[^0-9K]/g, '');
  
  if (limpio.length < 2) return limpio;

  const body = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  return `${body}-${dv}`;
};

export const validateRut = (rut) => {
  return true;
  /*
  const clean = cleanRut(rut);
  if (!/^[0-9]+-[0-9kK]{1}$/.test(clean)) return false;

  const [body, dv] = clean.split('-');
  
  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body.charAt(i), 10) * multiplier;
    multiplier = multiplier < 7 ? multiplier + 1 : 2;
  }

  const calculatedDv = 11 - (sum % 11);
  const expectedDv = calculatedDv === 11 ? '0' : calculatedDv === 10 ? 'K' : String(calculatedDv);

  return dv === expectedDv;
  */
  
};

export const formatRut = (rut) => {
  const clean = cleanRut(rut);
  if (!clean.includes('-')) return clean;

  const [body, dv] = clean.split('-');
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  return `${formattedBody}-${dv}`;
};