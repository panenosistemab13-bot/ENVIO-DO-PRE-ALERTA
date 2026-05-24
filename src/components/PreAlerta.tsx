import React, { useState } from 'react';
import { ArrowLeft, Printer, Copy, Check, Truck, MapPin, Calendar, User, Package, Hash, FileText, ChevronRight, Eye, Layers, MousePointer2, Square, Box, CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RowData } from '../types';

interface PreAlertaProps {
  rows: RowData[];
  onBack: () => void;
  onGoToMenu: () => void;
  clearAllRows: () => void;
}

const FROTA_3C_PLATES = [
  'PNH3093', 'PNP5084', 'PNY2215', 'PNY2605', 'POD0255', 'POD0345', 'POD0645', 
  'POZ3241', 'POZ4431', 'SAR8D82', 'SAS2D02', 'SBK4I42', 'SBK4J52', 'SBK5A52', 
  'SBK5B52', 'SBK5C22', 'SBN4J62', 'SBQ1I22', 'THX5I51', 'THX8C51', 'THX8J51', 
  'TYQ6F51', 'TYT8A14'
];

interface GroupData {
  cavalo: string;
  nfs: Set<string>;
  carretas: string[];
  iscas: string[];
  produtos: string[];
  umas: string[];
  destino: string;
  data: string;
  motorista: string;
  isManual?: boolean;
}

export default function PreAlerta({ rows, onBack, onGoToMenu }: PreAlertaProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia,';
    if (hour >= 12 && hour < 18) return 'Boa tarde,';
    return 'Boa noite,';
  };

  const [copied, setCopied] = useState<string | null>(null);
  const [rota, setRota] = useState('SANTA LUZIA/MG x RIO DE JANEIRO/RJ;');
  const [saudacao, setSaudacao] = useState(getGreeting());
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | 'all'>('all');
  
  // Estado para armazenar transportadoras e motoristas por cavalo
  const [transportadoras, setTransportadoras] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    rows.forEach(row => {
      if (row.cavalo && !initial[row.cavalo]) {
        const isFrota3C = FROTA_3C_PLATES.includes(row.cavalo.toUpperCase().trim());
        initial[row.cavalo] = isFrota3C ? 'FROTA 3C' : '';
      }
    });
    return initial;
  });

  const [motoristas, setMotoristas] = useState<Record<string, string>>({});
  const [selectedEsquemas, setSelectedEsquemas] = useState<Record<string, any>>({});
  const [isEsquemaModalOpen, setIsEsquemaModalOpen] = useState(false);
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [manualGroups, setManualGroups] = useState<Record<string, GroupData>>({});

  const addManualGroup = () => {
    const id = `manual-${Date.now()}`;
    setManualGroups(prev => ({
      ...prev,
      [id]: {
        cavalo: 'PLACA CAVALO',
        nfs: new Set(['000000']),
        carretas: ['PLACA CARRETA'],
        iscas: ['000000'],
        produtos: ['PRODUTO'],
        umas: ['000000'],
        destino: 'DESTINO',
        data: new Date().toLocaleDateString(),
        motorista: '',
        isManual: true
      }
    }));
    setSelectedGroupKey(id);
  };

  const updateManualField = (groupKey: string, field: keyof GroupData, value: any) => {
    setManualGroups(prev => {
      const group = prev[groupKey];
      if (!group) return prev;
      
      let newValue = value;
      if (field === 'nfs') {
        // Remove hifens e separa por espaço
        newValue = new Set(value.replace(/-/g, '').split(' '));
      } else if (field === 'cavalo') {
        newValue = value.replace(/-/g, '');
      }

      return {
        ...prev,
        [groupKey]: {
          ...group,
          [field]: newValue
        }
      };
    });
  };

  const addManualRow = (groupKey: string) => {
    setManualGroups(prev => {
      const group = prev[groupKey];
      if (!group) return prev;
      return {
        ...prev,
        [groupKey]: {
          ...group,
          carretas: [...group.carretas, ''],
          iscas: [...group.iscas, ''],
          produtos: [...group.produtos, ''],
          umas: [...group.umas, ''],
        }
      };
    });
  };

  const updateManualRowField = (groupKey: string, field: 'carretas' | 'iscas' | 'produtos' | 'umas', index: number, value: string) => {
    setManualGroups(prev => {
      const group = prev[groupKey];
      if (!group) return prev;
      
      let newValue = value;
      if (field === 'carretas') {
        newValue = value.replace(/-/g, '');
      }

      const newArray = [...group[field]];
      newArray[index] = newValue;
      return {
        ...prev,
        [groupKey]: {
          ...group,
          [field]: newArray
        }
      };
    });
  };

  const removeManualGroup = (groupKey: string) => {
    setManualGroups(prev => {
      const newGroups = { ...prev };
      delete newGroups[groupKey];
      return newGroups;
    });
    if (selectedGroupKey === groupKey) {
      setSelectedGroupKey('all');
    }
  };

  const AI_PROMPT = `Atue como um especialista em Logística e Gerenciamento de Risco.
Objetivo: Analisar o documento "PRÉ-ALERTA 2026 - ISCA" e extrair todas as informações operacionais de forma estruturada.
Instruções de Processamento:
1. Identificação de Veículos: Localize todas as placas de veículos mencionadas (ex: TQT8E11, SDX0J86, RXV9C19, etc.) e identifique se são classificadas como "CAVALO", "TRUCK" ou "CARRETA".
2. Tipo de Carga: Identifique se a carga é "B" (Carga Batida) ou "P" (Carga Paletizada) para cada registro encontrado.
3. Monitoramento de Iscas: Extraia os locais exatos de implantação das iscas de segurança conforme as imagens e legendas (ex: "Isca implantada sob a caixa", "Isca por baixo do fardo").
4. Modelos de Dispositivos: Diferencie entre o "MODELO ANTIGO" e o "NOVO MODELO" (Elo de Isca/Isca Menor) conforme as fotos comparativas.
5. Data e Hora: Registre o carimbo de data/hora presente no documento.
Formato de Saída Sugerido:
Forneça um resumo em formato de tabela contendo:
| Placa | Tipo de Veículo | Tipo de Carga (B/P) | Localização da Isca |
| :--- | :--- | :--- | :--- |
Observação Importante: Algumas imagens são rotuladas como "IMAGEM ILUSTRATIVA" e outras como "IMAGEM REAL". Priorize os dados das imagens reais para relatórios de conformidade.`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(AI_PROMPT);
    setShowPrompt(true);
    setTimeout(() => setShowPrompt(false), 2000);
  };

  const ESQUEMAS = [
    {
      id: 'template-pdf-1',
      title: 'Diagrama Completo (Pág 1)',
      description: 'Diagramas de Truck e Cavalo com legendas oficiais.',
      icon: <FileText size={24} />,
      content: (
        <div className="p-6 bg-white border-2 border-black font-mono text-black" style={{ width: '100%', maxWidth: '650px' }}>
          <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-2">
            <div className="text-xs font-bold">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
            <div className="text-[10px] font-bold text-red-600 underline uppercase">Favor inserir placas do cavalo e carreta(s)</div>
          </div>
          
          <div className="flex gap-6 mb-8 text-[10px] font-bold uppercase">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 border-2 border-black flex items-center justify-center bg-white">
                <div className="w-2 h-2 bg-red-600 rounded-full mr-1"></div> B
              </div>
              <span>Carga Batida</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 text-white flex items-center justify-center border-2 border-black">P</div>
              <span>Carga Paletizada</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold mb-1">TQT8E11</span>
              <div className="w-12 h-48 border-2 border-black flex flex-col">
                <div className="h-6 bg-black text-white text-[8px] flex items-center justify-center border-b-2 border-black">TRUCK</div>
                <div className="h-8 bg-red-600 text-white flex items-center justify-center font-bold border-b-2 border-black">P</div>
                {[...Array(8)].map((_, i) => <div key={i} className="flex-1 border-b border-black last:border-b-0"></div>)}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold mb-1">SDX0J86</span>
              <div className="w-12 h-48 border-2 border-black flex flex-col">
                <div className="h-6 bg-black text-white text-[8px] flex items-center justify-center border-b-2 border-black">CAVALO</div>
                <div className="h-6 flex items-center justify-center text-[7px] font-bold border-b-2 border-black">INSUMO</div>
                <div className="h-8 bg-red-600 text-white flex items-center justify-center font-bold border-b-2 border-black">P</div>
                {[...Array(6)].map((_, i) => <div key={i} className="flex-1 border-b border-black last:border-b-0"></div>)}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold mb-1">SDX0J86</span>
              <div className="w-12 h-48 border-2 border-black flex flex-col">
                <div className="h-6 bg-black text-white text-[8px] flex items-center justify-center border-b-2 border-black">CAVALO</div>
                <div className="h-12 flex items-center justify-center text-[7px] font-bold border-b-2 border-black">GAIOLAS</div>
                <div className="h-8 bg-red-600 text-white flex items-center justify-center font-bold border-b-2 border-black">P</div>
                {[...Array(4)].map((_, i) => <div key={i} className="flex-1 border-b border-black last:border-b-0"></div>)}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold mb-1">RXV9C19</span>
              <div className="w-12 h-48 border-2 border-black flex flex-col">
                <div className="h-6 bg-black text-white text-[8px] flex items-center justify-center border-b-2 border-black">CAVALO</div>
                {[...Array(8)].map((_, i) => <div key={i} className="flex-1 border-b border-black"></div>)}
                <div className="h-8 flex">
                  <div className="flex-1 bg-red-600 text-white flex items-center justify-center font-bold text-[8px] border-r border-black">C</div>
                  <div className="flex-1 bg-red-600 text-white flex items-center justify-center font-bold text-[8px]">P</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'isca-caixa-pdf',
      title: 'Isca sob Caixa (Pág 2)',
      description: 'Destaque amarelo e legenda lateral fiel ao PDF.',
      icon: <Square size={24} />,
      content: (
        <div className="p-6 bg-white border-2 border-black font-mono" style={{ width: '100%', maxWidth: '650px' }}>
          <div className="text-red-600 font-bold text-xs mb-4 uppercase text-center">Imagem Ilustrativa</div>
          <div className="flex gap-6 items-center">
            <div className="relative">
              <img 
                src="https://picsum.photos/seed/isca-caixa-pdf/500/400" 
                alt="Isca sob Caixa" 
                className="w-64 h-64 object-cover border-2 border-black"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-[45%] left-[35%] w-16 h-12 border-4 border-yellow-400"></div>
              <div className="absolute top-[50%] left-[62%] flex items-center">
                <div className="text-yellow-400 text-3xl font-bold mr-2">←</div>
                <div className="bg-white border-2 border-black p-1 text-[7px] font-bold leading-tight uppercase">
                  Isca implantada<br/>sob a caixa
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-yellow-400 text-black text-center font-bold text-xs py-1 uppercase border-t-2 border-black">
                Isca por baixo da caixa
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold mb-1">QUV9856</span>
              <div className="w-12 h-48 border-2 border-black flex flex-col">
                <div className="h-6 bg-black text-white text-[8px] flex items-center justify-center border-b-2 border-black">CAVALO</div>
                <div className="h-8 bg-red-600 text-white flex items-center justify-center font-bold border-b-2 border-black">P</div>
                {[...Array(8)].map((_, i) => <div key={i} className="flex-1 border-b border-black last:border-b-0"></div>)}
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'isca-fardo-pdf',
      title: 'Isca sob Fardo (Pág 2)',
      description: 'Destaque azul e legenda lateral fiel ao PDF.',
      icon: <Box size={24} />,
      content: (
        <div className="p-6 bg-white border-2 border-black font-mono" style={{ width: '100%', maxWidth: '650px' }}>
          <div className="text-red-600 font-bold text-xs mb-4 uppercase text-center">Imagem Ilustrativa</div>
          <div className="flex gap-6 items-center">
            <div className="relative">
              <img 
                src="https://picsum.photos/seed/isca-fardo-pdf/500/400" 
                alt="Isca sob Fardo" 
                className="w-64 h-64 object-cover border-2 border-black"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-[20%] right-[20%] w-20 h-12 border-4 border-red-600"></div>
              <div className="absolute top-[25%] right-[5%] text-black text-4xl font-bold">←</div>
              <div className="absolute bottom-[25%] right-[-10%] bg-blue-600 text-white border-4 border-white p-2 text-[8px] font-bold uppercase leading-tight text-center max-w-[140px] shadow-lg">
                Isca implantada por baixo do fardo
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold mb-1">JBZ9H48</span>
              <div className="w-12 h-48 border-2 border-black flex flex-col">
                <div className="h-6 bg-black text-white text-[8px] flex items-center justify-center border-b-2 border-black">CAVALO</div>
                <div className="h-8 bg-red-600 text-white flex items-center justify-center font-bold border-b-2 border-black">P</div>
                {[...Array(8)].map((_, i) => <div key={i} className="flex-1 border-b border-black last:border-b-0"></div>)}
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'modelo-dispositivo',
      title: 'Modelos de Isca (Pág 2)',
      description: 'Comparativo entre modelo antigo e novo.',
      icon: <Layers size={24} />,
      content: (
        <div className="p-6 bg-white border-2 border-black font-mono" style={{ width: '100%', maxWidth: '650px' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-black text-sm uppercase">Novo Modelo de Isca (Isca Menor)</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <img src="https://picsum.photos/seed/antiga/300/200" alt="Antiga" className="w-full h-32 object-cover border-2 border-black" referrerPolicy="no-referrer" />
              <div className="absolute top-2 left-2 bg-black text-white px-2 py-0.5 text-[10px] font-bold">ANTIGA</div>
            </div>
            <div className="relative">
              <img src="https://picsum.photos/seed/nova/300/200" alt="Nova" className="w-full h-32 object-cover border-2 border-black" referrerPolicy="no-referrer" />
              <div className="absolute top-2 left-2 bg-black text-white px-2 py-0.5 text-[10px] font-bold">NOVA</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'imagem-real-pdf',
      title: 'Imagem Real (Pág 5)',
      description: 'Destaque circular amarelo fiel ao PDF.',
      icon: <Eye size={24} />,
      content: (
        <div className="p-6 bg-white border-2 border-black font-mono" style={{ width: '100%', maxWidth: '650px' }}>
          <div className="text-red-600 font-bold text-xs mb-4 uppercase text-center">Imagem Real</div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold mb-1">ONB8F78</span>
            <div className="relative">
              <img 
                src="https://picsum.photos/seed/real-pdf/600/500" 
                alt="Imagem Real" 
                className="w-80 h-96 object-cover border-2 border-black"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-[15%] left-[10%] w-24 h-24 border-8 border-yellow-400 rounded-full"></div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleSelectEsquema = (esquema: any) => {
    if (activeGroupKey) {
      setSelectedEsquemas(prev => ({ ...prev, [activeGroupKey]: esquema }));
      setIsEsquemaModalOpen(false);
    }
  };

  const handleTransportadoraChange = (cavalo: string, value: string) => {
    setTransportadoras(prev => ({ ...prev, [cavalo]: value }));
  };

  const handleMotoristaChange = (groupKey: string, value: string) => {
    setMotoristas(prev => ({ ...prev, [groupKey]: value }));
  };

  // Agrupar dados por CAVALO e DESTINO
  const autoGroupedData = rows.reduce((acc, row) => {
    if (!row.cavalo) return acc;
    const cavaloKey = row.cavalo.toUpperCase().trim();
    const destinoKey = (row.destino || 'SEM DESTINO').toUpperCase().trim();
    const groupKey = `${cavaloKey}|${destinoKey}`;
    
    if (!acc[groupKey]) {
      acc[groupKey] = {
        cavalo: cavaloKey,
        nfs: new Set<string>(),
        carretas: [],
        iscas: [],
        produtos: [],
        umas: [],
        destino: row.destino,
        data: row.data,
        motorista: '',
      };
    }
    if (row.nfNo) acc[groupKey].nfs.add(row.nfNo);
    acc[groupKey].carretas.push(row.carreta);
    acc[groupKey].iscas.push(row.iscaNo);
    acc[groupKey].produtos.push(row.produto);
    acc[groupKey].umas.push(row.uma);
    return acc;
  }, {} as Record<string, GroupData>);

  const clearAllGroups = () => {
    if (confirm('Tem certeza que deseja apagar todos os pré-alertas?')) {
      setManualGroups({});
      clearAllRows();
    }
  };

  const handleCopy = (id: string) => {
    // Atualiza a saudação automaticamente antes de copiar
    const currentGreeting = getGreeting();
    setSaudacao(currentGreeting);
    
    // Pequeno delay para garantir que o React renderizou a nova saudação no DOM
    setTimeout(() => {
      const table = document.getElementById(id);
      if (table) {
        const range = document.createRange();
        range.selectNode(table);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
        document.execCommand('copy');
        window.getSelection()?.removeAllRanges();
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
      }
    }, 50);
  };

  const handlePrint = () => {
    window.print();
  };

  const groups: [string, GroupData][] = [
    ...(Object.entries(autoGroupedData) as [string, GroupData][]), 
    ...(Object.entries(manualGroups) as [string, GroupData][])
  ];

  return (
    <div className="flex-1 min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Header / Toolbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm no-print">
        <div className="flex items-center gap-6">
          <button 
            onClick={onGoToMenu}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors font-black uppercase text-xs tracking-widest"
          >
            <ArrowLeft size={18} strokeWidth={3} /> Menu Inicial
          </button>
          <div className="h-6 w-px bg-gray-200"></div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-gray-900 uppercase">Gerador de Pré-Alerta</h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{groups.length} Documentos Gerados</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={clearAllGroups}
            className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl hover:bg-red-700 transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-red-200"
          >
            <Trash2 size={18} /> Apagar Todos
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar Selector */}
        <aside className="w-full lg:w-80 bg-white border-r border-gray-200 overflow-y-auto no-print p-4 flex flex-col gap-4">
          <div className="px-2 flex flex-col gap-2">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Lista de Documentos</h2>
            <button
              onClick={() => setSelectedGroupKey('all')}
              className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group ${
                selectedGroupKey === 'all' 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText size={20} />
                <span className="font-black text-xs uppercase">Visualizar Todos</span>
              </div>
              <ChevronRight size={16} className={selectedGroupKey === 'all' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} />
            </button>

            <button 
              onClick={addManualGroup}
              className="w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-100"
            >
              <div className="flex items-center gap-3">
                <Plus size={20} />
                <span className="font-black text-xs uppercase">Criar Manual</span>
              </div>
              <ChevronRight size={16} className="opacity-0 group-hover:opacity-100" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {groups.map(([key, data]) => (
              <button
                key={key}
                onClick={() => setSelectedGroupKey(key)}
                className={`w-full text-left p-4 rounded-2xl transition-all flex flex-col gap-2 group border ${
                  selectedGroupKey === key 
                  ? 'bg-white border-blue-500 shadow-xl shadow-blue-100 ring-2 ring-blue-500/10' 
                  : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-lg ${selectedGroupKey === key ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400 group-hover:text-gray-600'}`}>
                    <Truck size={18} />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase">{data.data}</span>
                    {data.isManual && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeManualGroup(key);
                        }}
                        className="text-[8px] font-black text-red-500 uppercase hover:underline"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-black text-sm text-gray-900 uppercase tracking-tight">{data.cavalo}</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase truncate flex items-center gap-1">
                    <MapPin size={10} /> {data.destino}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Document Preview Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Global Config (Editable in Preview) */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8 no-print">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Configurações Gerais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Saudação</label>
                  <select 
                    value={saudacao} 
                    onChange={(e) => setSaudacao(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-blue-500"
                  >
                    <option>Boa noite,</option>
                    <option>Bom dia,</option>
                    <option>Boa tarde,</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Rota Padrão</label>
                  <input 
                    type="text" 
                    value={rota}
                    onChange={(e) => setRota(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Documents */}
            <div id="pre-alerta-table" className="space-y-12">
              {groups
                .filter(([key]) => selectedGroupKey === 'all' || selectedGroupKey === key)
                .map(([key, data], index) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={key} 
                  className={`bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 relative group/doc ${
                    index > 0 ? 'page-break-before' : ''
                  }`}
                >
                  {/* Floating Action Bar for each doc */}
                  <div className="absolute top-6 right-6 flex gap-2 no-print opacity-0 group-hover/doc:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setActiveGroupKey(key);
                        setIsEsquemaModalOpen(true);
                      }}
                      className="flex items-center gap-2 bg-purple-50 text-purple-600 px-4 py-2 rounded-xl hover:bg-purple-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                      <Eye size={14} /> Esquema
                    </button>
                    <button 
                      onClick={() => handleCopy(`doc-${key}`)}
                      className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl hover:bg-blue-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                      {copied === `doc-${key}` ? <Check size={14} /> : <Copy size={14} />}
                      {copied === `doc-${key}` ? 'Copiado!' : 'Copiar Tabela'}
                    </button>
                  </div>

                  <div id={`doc-${key}`} className="document-content mx-auto" style={{ maxWidth: '700px', lineHeight: '1.2' }}>
                    <div className="mb-2">
                      <div className="text-sm font-bold">{saudacao}</div>
                    </div>

                    <div className="bg-red-600 text-white px-3 py-0.5 inline-block font-bold text-sm mb-2 uppercase tracking-tighter" style={{ backgroundColor: '#dc2626', color: 'white', padding: '2px 8px' }}>
                      Favor se atentar ao resgate!
                    </div>

                    <div className="text-sm font-bold mb-2">
                      Atentar às informações abaixo:
                    </div>

                    <div className="mb-3">
                      <div className="border-2 border-[#B7D2ED] p-2 inline-block min-w-[300px] bg-[#B7D2ED] rounded-sm" style={{ border: '2px solid #B7D2ED', padding: '8px', backgroundColor: '#B7D2ED' }}>
                        <div className="flex flex-col gap-0.5">
                          <div className="text-xs font-bold text-black">{rota}</div>
                          <div className="text-xs font-bold text-black">• Favor, acusar o recebimento do pré-alerta;</div>
                        </div>
                      </div>
                    </div>

                    <table className="w-full border-collapse border-2 border-black text-xs" style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', fontSize: '12px' }}>
                      <thead>
                        <tr className="bg-[#B7D2ED] text-black">
                          <th colSpan={8} className="border border-black p-1.5 text-center font-bold uppercase text-sm tracking-wider" style={{ border: '1px solid black', padding: '6px', backgroundColor: '#B7D2ED', color: 'black' }}>
                            PRÉ - ALERTA DE ISCA EMBARCADA
                          </th>
                        </tr>
                        <tr className="bg-white">
                          <th className="border border-black p-1 text-center font-bold w-1/4 bg-gray-50" style={{ border: '1px solid black', padding: '4px', width: '25%', backgroundColor: '#f9fafb' }}>NÚMERO DA NF:</th>
                          <td colSpan={2} className="border border-black p-1 text-center font-bold text-black" style={{ border: '1px solid black', padding: '4px', color: 'black' }}>
                            <div 
                              contentEditable={data.isManual}
                              onBlur={(e) => data.isManual && updateManualField(key, 'nfs', e.currentTarget.textContent || '')}
                              suppressContentEditableWarning={true}
                              className={`w-full text-center focus:outline-none ${data.isManual ? 'cursor-text hover:bg-blue-50' : ''}`}
                            >
                              {Array.from(data.nfs).join(' ')}
                            </div>
                          </td>
                          <th className="border border-black p-1 text-center font-bold bg-gray-50" style={{ border: '1px solid black', padding: '4px', backgroundColor: '#f9fafb' }}>TRANSPORTADORA:</th>
                          <td colSpan={4} className="border border-black p-1 text-center font-bold text-black" style={{ border: '1px solid black', padding: '4px', color: 'black' }}>
                            <div 
                              contentEditable
                              onBlur={(e) => handleTransportadoraChange(data.cavalo, e.currentTarget.textContent || '')}
                              suppressContentEditableWarning={true}
                              className="w-full text-center focus:outline-none font-bold"
                              style={{ width: '100%', textAlign: 'center', fontWeight: 'bold', minHeight: '16px' }}
                            >
                              {transportadoras[data.cavalo] || ''}
                            </div>
                          </td>
                        </tr>
                        <tr className="bg-[#B7D2ED] text-black">
                          <th className="border border-black p-1 text-center font-bold w-[25%]" style={{ border: '1px solid black', padding: '4px', width: '25%', backgroundColor: '#B7D2ED', color: 'black' }}>MOTORISTA</th>
                          <th className="border border-black p-1 text-center font-bold w-[8%]" style={{ border: '1px solid black', padding: '4px', width: '8%', backgroundColor: '#B7D2ED', color: 'black' }}>CAVALO</th>
                          <th className="border border-black p-1 text-center font-bold w-[8%]" style={{ border: '1px solid black', padding: '4px', width: '8%', backgroundColor: '#B7D2ED', color: 'black' }}>CARRETAS</th>
                          <th className="border border-black p-1 text-center font-bold w-[8%]" style={{ border: '1px solid black', padding: '4px', width: '8%', backgroundColor: '#B7D2ED', color: 'black' }}>Nº ISCAS</th>
                          <th className="border border-black p-1 text-center font-bold w-[10%]" style={{ border: '1px solid black', padding: '4px', width: '10%', backgroundColor: '#B7D2ED', color: 'black' }}>PRODUTO EMBARCADO</th>
                          <th className="border border-black p-1 text-center font-bold w-[13%]" style={{ border: '1px solid black', padding: '4px', width: '13%', backgroundColor: '#B7D2ED', color: 'black' }}>CÓDIGO U.M.A.</th>
                          <th className="border border-black p-1 text-center font-bold w-[18%]" style={{ border: '1px solid black', padding: '4px', width: '18%', backgroundColor: '#B7D2ED', color: 'black' }}>DESTINO</th>
                          <th className="border border-black p-1 text-center font-bold w-[10%]" style={{ border: '1px solid black', padding: '4px', width: '10%', backgroundColor: '#B7D2ED', color: 'black' }}>DATA ENVIADA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.carretas.map((carreta, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            {idx === 0 && (
                              <td rowSpan={data.carretas.length} className="border border-black p-1 text-center font-bold align-middle" style={{ border: '1px solid black', padding: '4px', verticalAlign: 'middle' }}>
                                <div 
                                  contentEditable
                                  onBlur={(e) => handleMotoristaChange(key, e.currentTarget.textContent || '')}
                                  suppressContentEditableWarning={true}
                                  className="w-full text-center focus:outline-none font-bold uppercase empty:before:content-['MOTORISTA'] empty:before:text-gray-300"
                                  style={{ width: '100%', textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', minHeight: '16px' }}
                                >
                                  {motoristas[key] || ''}
                                </div>
                              </td>
                            )}
                            {idx === 0 && (
                              <td rowSpan={data.carretas.length} className="border border-black p-1 text-center font-bold align-middle" style={{ border: '1px solid black', padding: '4px', verticalAlign: 'middle' }}>
                                <div 
                                  contentEditable={true}
                                  onBlur={(e) => data.isManual ? updateManualField(key, 'cavalo', e.currentTarget.textContent || '') : null}
                                  suppressContentEditableWarning={true}
                                  className={`w-full text-center focus:outline-none ${data.isManual ? 'cursor-text hover:bg-blue-50' : ''}`}
                                >
                                  {data.cavalo}
                                </div>
                              </td>
                            )}
                            <td className="border border-black p-1 text-center font-bold" style={{ border: '1px solid black', padding: '4px' }}>
                              <div 
                                contentEditable={data.isManual}
                                onBlur={(e) => data.isManual && updateManualRowField(key, 'carretas', idx, e.currentTarget.textContent || '')}
                                suppressContentEditableWarning={true}
                                className={`w-full text-center focus:outline-none ${data.isManual ? 'cursor-text hover:bg-blue-50' : ''}`}
                              >
                                {carreta}
                              </div>
                            </td>
                            <td className="border border-black p-1 text-center font-bold" style={{ border: '1px solid black', padding: '4px' }}>
                              <div 
                                contentEditable={data.isManual}
                                onBlur={(e) => data.isManual && updateManualRowField(key, 'iscas', idx, e.currentTarget.textContent || '')}
                                suppressContentEditableWarning={true}
                                className={`w-full text-center focus:outline-none ${data.isManual ? 'cursor-text hover:bg-blue-50' : ''}`}
                              >
                                {data.iscas[idx]}
                              </div>
                            </td>
                            <td className="border border-black p-1 text-center font-bold" style={{ border: '1px solid black', padding: '4px' }}>
                              <div 
                                contentEditable={data.isManual}
                                onBlur={(e) => data.isManual && updateManualRowField(key, 'produtos', idx, e.currentTarget.textContent || '')}
                                suppressContentEditableWarning={true}
                                className={`w-full text-center focus:outline-none ${data.isManual ? 'cursor-text hover:bg-blue-50' : ''}`}
                              >
                                {data.produtos[idx]}
                              </div>
                            </td>
                            <td className="border border-black p-1 text-center font-bold" style={{ border: '1px solid black', padding: '4px' }}>
                              <div 
                                contentEditable={data.isManual}
                                onBlur={(e) => data.isManual && updateManualRowField(key, 'umas', idx, e.currentTarget.textContent || '')}
                                suppressContentEditableWarning={true}
                                className={`w-full text-center focus:outline-none ${data.isManual ? 'cursor-text hover:bg-blue-50' : ''}`}
                              >
                                {data.umas[idx]}
                              </div>
                            </td>
                            {idx === 0 && (
                              <td rowSpan={data.carretas.length} className="border border-black p-1 text-center font-bold align-middle" style={{ border: '1px solid black', padding: '4px', verticalAlign: 'middle' }}>
                                <div 
                                  contentEditable={data.isManual}
                                  onBlur={(e) => data.isManual && updateManualField(key, 'destino', e.currentTarget.textContent || '')}
                                  suppressContentEditableWarning={true}
                                  className={`w-full text-center focus:outline-none ${data.isManual ? 'cursor-text hover:bg-blue-50' : ''}`}
                                >
                                  {data.destino}
                                </div>
                              </td>
                            )}
                            {idx === 0 && (
                              <td rowSpan={data.carretas.length} className="border border-black p-1 text-center font-bold align-middle" style={{ border: '1px solid black', padding: '4px', verticalAlign: 'middle' }}>
                                <div 
                                  contentEditable={data.isManual}
                                  onBlur={(e) => data.isManual && updateManualField(key, 'data', e.currentTarget.textContent || '')}
                                  suppressContentEditableWarning={true}
                                  className={`w-full text-center focus:outline-none ${data.isManual ? 'cursor-text hover:bg-blue-50' : ''}`}
                                >
                                  {data.data}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                        {data.isManual && (
                          <tr className="no-print">
                            <td colSpan={8} className="p-2 text-center">
                              <button 
                                onClick={() => addManualRow(key)}
                                className="text-[10px] font-black text-purple-600 uppercase hover:underline flex items-center gap-1 mx-auto"
                              >
                                <Plus size={12} /> Adicionar Linha
                              </button>
                            </td>
                          </tr>
                        )}
                        {/* Parametrização and Esquema as table rows for better framing in email */}
                        <tr>
                          <td colSpan={8} className="border border-black bg-[#B7D2ED] p-1 text-center font-bold text-xs text-black" style={{ border: '1px solid black', padding: '4px', backgroundColor: '#B7D2ED', textAlign: 'center', color: 'black' }}>
                            Parametrização das iscas
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={8} className="border border-black border-t-0 bg-white p-0" style={{ border: '1px solid black', padding: '0' }}>
                            <div 
                              contentEditable 
                              className="min-h-[8px] p-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-400 empty:before:content-['Clique_para_adicionar_texto_ou_colar_imagem...'] empty:before:text-gray-300"
                              suppressContentEditableWarning={true}
                              style={{ minHeight: '25px', padding: '4px', fontWeight: 'bold' }}
                            ></div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    
                    <div className="mt-2 font-bold text-xs uppercase text-black flex items-center gap-1.5" style={{ padding: '4px', fontWeight: 'bold', textTransform: 'uppercase', color: 'black' }}>
                      <span className="w-1.5 h-1.5 bg-[#B7D2ED] rounded-full"></span>
                      ESQUEMA DE EMBARQUE DA ISCA:
                    </div>
                    
                    {selectedEsquemas[key] && (
                      <div className="mt-2">
                        {selectedEsquemas[key].content}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Esquema Selector Modal */}
      <AnimatePresence>
        {isEsquemaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Escolher Esquema de Embarque</h2>
                  <p className="text-xs font-bold text-gray-500 uppercase">Selecione um modelo visual para o documento</p>
                </div>
                <button 
                  onClick={() => setIsEsquemaModalOpen(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <ArrowLeft size={24} className="rotate-90" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {ESQUEMAS.map((esquema) => (
                  <button
                    key={esquema.id}
                    onClick={() => handleSelectEsquema(esquema)}
                    className="flex flex-col gap-4 p-6 rounded-2xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50/30 transition-all text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {esquema.icon}
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-gray-900 uppercase">{esquema.title}</h3>
                        <p className="text-[10px] font-bold text-gray-500 uppercase">{esquema.description}</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-100 pointer-events-none scale-75 origin-top">
                      {esquema.content}
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button 
                  onClick={() => setIsEsquemaModalOpen(false)}
                  className="px-6 py-3 bg-black text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-gray-800 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .page-break-before {
            page-break-before: always;
          }
          body {
            background: white !important;
          }
          main {
            overflow: visible !important;
            padding: 0 !important;
          }
          .bg-gray-50 {
            background: white !important;
          }
          .shadow-xl {
            box-shadow: none !important;
          }
          .rounded-3xl {
            border-radius: 0 !important;
          }
          .border {
            border-color: black !important;
          }
          .document-content {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
