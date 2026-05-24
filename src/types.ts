export interface RowData {
  id: string;
  iscaNo: string;
  data: string;
  hora: string;
  doca: string;
  cavalo: string;
  carreta: string;
  m3: string;
  destino: string;
  nfNo: string;
  responsavel: string;
  produto: string;
  uma: string;
  valorNf: string;
  preAlertaGr: string;
  planCarreg: boolean;
  baixaGr: boolean;
}

export const COLUMNS = [
  { id: 'iscaNo', label: 'Nº ISCA', width: 'w-32' },
  { id: 'data', label: 'DATA', width: 'w-16' },
  { id: 'hora', label: 'HORA', width: 'w-14' },
  { 
    id: 'doca', 
    label: 'DOCA', 
    width: 'w-12', 
    type: 'select', 
    options: ['', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15'] 
  },
  { id: 'cavalo', label: 'CAVALO', width: 'w-20' },
  { id: 'carreta', label: 'CARRETA', width: 'w-24' },
  { id: 'm3', label: 'M³', width: 'w-10' },
  { id: 'destino', label: 'DESTINO', width: 'w-32' },
  { id: 'nfNo', label: 'Nº NF', width: 'w-24' },
  { id: 'responsavel', label: 'RESPONSÁVEL', width: 'w-28' },
  { id: 'produto', label: 'PRODUTO', width: 'w-28' },
  { id: 'uma', label: 'U.M.A.', width: 'w-32' },
  { id: 'valorNf', label: 'VALOR NF (R$)', width: 'w-32' },
  { 
    id: 'preAlertaGr', 
    label: 'PRÉ-ALERTA GR', 
    width: 'w-32', 
    type: 'select', 
    options: ['', 'Jeff', 'vini', 'douglas', 'ulisses', 'pedro', 'Rayson'] 
  },
  { id: 'planCarreg', label: 'PLAN. CARREG', width: 'w-24', type: 'checkbox' },
  { id: 'baixaGr', label: 'BAIXA GR', width: 'w-24', type: 'checkbox' },
];
