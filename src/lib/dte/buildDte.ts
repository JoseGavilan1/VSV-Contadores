export type DteReceptor = {
  RUTRecep: string;
  CdadRecep: string;
};

export type DteTransporte = {
  Patente: string;
  RUTTrans: string;
  Chofer: string;
  RUTChofer: string;
};

export type DteDetalle = {
  NmbItem: string;
  QtyItem: number;
  UniItem: string;
  PrcItem: number;
  Metodo: string;
  DescuentoPct?: number;
  Descripcion?: string;
  FchEmis: Date;
  Traslado?: string;
  Transporte?: DteTransporte;
};

export type BuildDteParams = {
  TipoDTE: number;
  Receptor: DteReceptor;
  Detalle: DteDetalle;
};



export function buildDteJson(params: BuildDteParams) {
  const { TipoDTE, Receptor, Detalle } = params;

  const dteJson: any = {
    TipoDTE: TipoDTE,
    Encabezado: {
      IdDoc: {
        FmaPago: Detalle.Metodo || "1",
      },
      Receptor: {
        RUTRecep: Receptor.RUTRecep,
        CdadRecep: Receptor.CdadRecep,
      },
    },
    Detalle: {
      NmbItem: Detalle.NmbItem.trim(),
      DscItem: Detalle.Descripcion || "",
      QtyItem: Number(Detalle.QtyItem),
      UnmdItem: Detalle.UniItem.trim(),
      PrcItem: Number(Detalle.PrcItem),
      FchEmis: Detalle.FchEmis,
      ...(Detalle.DescuentoPct ? { DescuentoPct: Number(Detalle.DescuentoPct) } : {}),
      ...(Detalle.Transporte && {
        Transporte: {
            Patente: Detalle.Transporte.Patente,
            RUTTrans: Detalle.Transporte.RUTTrans,
            Chofer: Detalle.Transporte.Chofer,
            RUTChofer: Detalle.Transporte.RUTChofer
        },
      }),
    },
  };

  console.log('DTE JSON:', dteJson);

  return dteJson;
}