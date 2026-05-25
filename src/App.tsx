/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Download, Save, FileSpreadsheet, ChevronLeft, ChevronRight, Loader2, ClipboardList, Table, LayoutDashboard, ArrowLeft, Camera, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RowData, COLUMNS } from './types';
import PreAlerta from './components/PreAlerta';
import Stats from './components/Stats';

const INITIAL_ROWS_COUNT = 10;

const createEmptyRow = (): RowData => {
  return {
    id: Math.random().toString(36).substring(2, 9),
    iscaNo: '',
    data: '',
    hora: '',
    doca: '',
    cavalo: '',
    carreta: '',
    m3: '',
    destino: '',
    nfNo: '',
    responsavel: '',
    produto: '',
    uma: '',
    valorNf: '',
    preAlertaGr: '',
    planCarreg: false,
    baixaGr: false,
  };
};

export default function App() {
  const [rows, setRows] = useState<RowData[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isScanning, setIsScanning] = useState(false);
  const [currentView, setCurrentView] = useState<'menu' | 'main' | 'pre-alerta' | 'stats'>('menu');
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sliceImage = (imageFile: File, slicesCount: number): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Não foi possível obter o contexto do canvas"));
          return;
        }

        // Fatiamento horizontal
        const sliceHeight = img.height / slicesCount;
        const slices: string[] = [];

        canvas.width = img.width;
        canvas.height = sliceHeight;

        for (let i = 0; i < slicesCount; i++) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(
            img,
            0, i * sliceHeight, img.width, sliceHeight, // Source
            0, 0, img.width, sliceHeight             // Destination
          );
          // Converter para base64 (removendo prefixo para a API)
          const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
          slices.push(base64);
        }
        resolve(slices);
      };
      img.onerror = () => reject(new Error("Erro ao carregar imagem"));
      img.src = URL.createObjectURL(imageFile);
    });
  };

  const processOcrSlice = async (base64Image: string): Promise<RowData[]> => {
    const response = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image })
    });
    if (!response.ok) throw new Error("Erro na resposta da API de OCR");
    const data = await response.json();
    return data.map((item: any) => ({
      ...createEmptyRow(),
      ...item,
      id: Math.random().toString(36).substring(2, 9)
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      // Fatiar a imagem em 3 partes conforme solicitado pelo usuário para melhor resolução
      console.log("Slicing image...");
      const slices = await sliceImage(file, 3);
      
      console.log("Processing OCR slices with Gemini...");
      const resultsBySlice = await Promise.all(slices.map(processOcrSlice));
      
      // Juntar todos os resultados
      const extractedRows = resultsBySlice.flat();
      
      console.log(`OCR finished. Extracted ${extractedRows.length} rows.`);

      if (extractedRows.length > 0) {
        // Remove linhas iniciais vazias se o usuário está começando agora
        let baseRows = rows;
        if (rows.length === INITIAL_ROWS_COUNT && rows.every(r => !r.iscaNo && !r.cavalo)) {
          baseRows = [];
        }

        const updatedRows = [...extractedRows, ...baseRows];
        setRows(updatedRows);
        saveToLocalStorage(updatedRows);
        setCurrentView('main');
      } else {
        alert("Nenhum dado legível foi encontrado na imagem. Tente tirar a foto mais de perto e com boa iluminação.");
      }
    } catch (error) {
      console.error("Erro ao escanear imagem:", error);
      alert("Erro ao processar a imagem com a IA. Verifique sua conexão e tente novamente.");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  useEffect(() => {
    const saved = localStorage.getItem('isca_rows');
    if (saved) {
      try {
        setRows(JSON.parse(saved));
      } catch (e) {
        setRows(Array.from({ length: INITIAL_ROWS_COUNT }, createEmptyRow));
      }
    } else {
      setRows(Array.from({ length: INITIAL_ROWS_COUNT }, createEmptyRow));
    }

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const saveToLocalStorage = (updatedRows: RowData[]) => {
    localStorage.setItem('isca_rows', JSON.stringify(updatedRows));
  };

  const handleInputChange = (id: string, field: keyof RowData, value: string | boolean) => {
    const updatedRows = rows.map((row) => {
      if (row.id === id) {
        let finalValue = value;

        // Remove hifens de nfNo, cavalo e carreta
        if ((field === 'nfNo' || field === 'cavalo' || field === 'carreta') && typeof value === 'string') {
          finalValue = value.replace(/-/g, '');
        }

        // Adiciona R$ automaticamente na coluna valorNf
        if (field === 'valorNf' && typeof value === 'string') {
          if (value !== '' && !value.startsWith('R$ ')) {
            finalValue = `R$ ${value.replace(/^R\$\s?/, '')}`;
          } else if (value === 'R$ ' || value === 'R$') {
            finalValue = '';
          }
        }

        // Formata U.M.A. com pontos (ex: 012.428.030.103)
        if (field === 'uma' && typeof value === 'string') {
          const digits = value.replace(/\D/g, '');
          if (digits.length > 0) {
            // Adiciona ponto a cada 3 dígitos da direita para a esquerda
            finalValue = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
          } else {
            finalValue = '';
          }
        }

        const newRow = { ...row, [field]: finalValue };
        
        // Se o usuário estiver preenchendo qualquer campo (exceto Nº ISCA, data e hora) e a data/hora estiverem vazias, preenche automaticamente
        if (field !== 'data' && field !== 'hora' && field !== 'iscaNo' && finalValue !== '' && finalValue !== false) {
          const now = new Date();
          if (!row.data) {
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            newRow.data = `${day}/${month}`;
          }
          if (!row.hora) {
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            newRow.hora = `${hours}:${minutes}`;
          }
        }

        // Se todos os campos (exceto data, hora e Nº ISCA) estiverem vazios, apaga a data e a hora também
        const otherFieldsEmpty = Object.keys(newRow).every(key => {
          if (key === 'id' || key === 'data' || key === 'hora' || key === 'iscaNo') return true;
          const val = newRow[key as keyof RowData];
          return val === '' || val === false;
        });

        if (otherFieldsEmpty) {
          newRow.data = '';
          newRow.hora = '';
        }

        return newRow;
      }
      return row;
    });
    setRows(updatedRows);
    saveToLocalStorage(updatedRows);
  };

  const addRow = () => {
    const updatedRows = [...rows, createEmptyRow()];
    setRows(updatedRows);
    saveToLocalStorage(updatedRows);
  };

  const removeRow = (id: string) => {
    const updatedRows = rows.filter((row) => row.id !== id);
    setRows(updatedRows);
    saveToLocalStorage(updatedRows);
  };

  const exportToCSV = () => {
    const headers = COLUMNS.map(col => col.label).join(';');
    const csvRows = rows
      .filter(row => row.iscaNo || row.doca || row.cavalo) // Filtra linhas vazias
      .map(row => {
        return COLUMNS.map(col => {
          const val = row[col.id as keyof RowData];
          return typeof val === 'boolean' ? (val ? 'SIM' : 'NÃO') : val;
        }).join(';');
      });
    
    if (csvRows.length === 0) {
      alert('Não há dados para exportar.');
      return;
    }

    const csvContent = "\uFEFF" + [headers, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `embarque_iscas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearAll = () => {
    if (confirm('Tem certeza que deseja limpar todos os dados?')) {
      localStorage.removeItem('isca_rows');
      setRows(Array.from({ length: INITIAL_ROWS_COUNT }, createEmptyRow));
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (tableContainerRef.current) {
      const scrollAmount = 300;
      tableContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (currentView === 'menu') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full flex flex-col items-center"
            >
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                <div className="relative bg-blue-600 rounded-full p-4 text-white">
                  <Loader2 className="animate-spin" size={32} />
                </div>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2 uppercase">Escaneando Prancheta</h3>
              <p className="text-sm font-bold text-gray-500 leading-relaxed">
                Nossa IA está analisando a imagem para extrair os números das iscas automaticamente. Aguarde um instante...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-200">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-gray-900">SISTEMA DE LOGÍSTICA</h1>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Controle & Pré-Alerta</p>
            </div>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-sm font-black text-gray-900">{currentTime.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-tighter">{currentTime.toLocaleTimeString('pt-BR')}</p>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">

            <motion.button
              whileHover={{ scale: 1.02, translateY: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentView('main')}
              className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col items-center text-center group transition-all hover:border-blue-500"
            >
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-inner">
                <Table size={40} strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-black mb-2 text-gray-900 uppercase">Controle de Iscas</h2>
              <p className="text-sm font-bold text-gray-500 leading-relaxed">Gerencie embarques, docas e veículos em tempo real com salvamento automático.</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, translateY: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentView('pre-alerta')}
              className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col items-center text-center group transition-all hover:border-red-500"
            >
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-600 group-hover:text-white transition-colors shadow-inner">
                <ClipboardList size={40} strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-black mb-2 text-gray-900 uppercase">Gerar Pré-Alerta</h2>
              <p className="text-sm font-bold text-gray-500 leading-relaxed">Gere documentos formatados para e-mail e WhatsApp agrupados por veículo.</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, translateY: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fileInputRef.current?.click()}
              className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col items-center text-center group transition-all hover:border-purple-500"
            >
              <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-inner">
                <Camera size={40} strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-black mb-2 text-gray-900 uppercase">Escanear Iscas</h2>
              <p className="text-sm font-bold text-gray-500 leading-relaxed">Use IA para extrair números de iscas diretamente de fotos ou capturas de tela.</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, translateY: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentView('stats')}
              className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col items-center text-center group transition-all hover:border-gray-900 shadow-emerald-100"
            >
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-inner">
                <TrendingUp size={40} strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-black mb-2 text-gray-900 uppercase">Relatórios</h2>
              <p className="text-sm font-bold text-gray-500 leading-relaxed">Visualize estatísticas, volumes e resumo financeiro dos embarques realizados.</p>
            </motion.button>

          </div>
        </main>

        <footer className="p-6 text-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Desenvolvido para Eficiência Logística • 2026</p>
        </footer>
      </div>
    );
  }

  if (currentView === 'pre-alerta') {
    return <PreAlerta rows={rows} onBack={() => setCurrentView('main')} onGoToMenu={() => setCurrentView('menu')} clearAllRows={clearAll} />;
  }

  if (currentView === 'stats') {
    return <Stats rows={rows} onBack={() => setCurrentView('menu')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Header */}
      <header className="bg-black text-white p-4 shadow-md sticky top-0 z-20">
        <div className="max-w-full mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCurrentView('menu')}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all text-gray-300 hover:text-white border border-gray-700 shadow-sm"
              title="Voltar ao Menu Inicial"
            >
              <LayoutDashboard size={20} />
              <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Menu</span>
            </button>
            <div className="bg-white p-2 rounded-lg">
              <FileSpreadsheet className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight uppercase">Controle de Embarque de Iscas</h1>
              <p className="text-xs text-gray-400 font-mono">{formatDate(currentTime)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full md:w-auto justify-center md:justify-end">
            <button 
              onClick={addRow}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium whitespace-nowrap"
            >
              <Plus size={16} /> Adicionar Linha
            </button>
            <button 
              onClick={clearAll}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium whitespace-nowrap"
            >
              <Trash2 size={16} /> Limpar Tudo
            </button>
          </div>
        </div>
        <div className="mt-2 text-[10px] text-center text-gray-300 uppercase font-semibold">
          Favor não esquecer de marcar na última folha o posicionamento da isca na carreta
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        {/* Mobile Scroll Indicators */}
        <div className="md:hidden flex justify-between px-4 py-2 bg-gray-200 border-b border-gray-300 sticky top-0 z-10">
          <button onClick={() => scroll('left')} className="p-1 bg-white rounded shadow active:bg-gray-100">
            <ChevronLeft size={20} />
          </button>
          <span className="text-xs font-bold text-gray-500 flex items-center">DESLIZE PARA OS LADOS</span>
          <button onClick={() => scroll('right')} className="p-1 bg-white rounded shadow active:bg-gray-100">
            <ChevronRight size={20} />
          </button>
        </div>

        <div 
          ref={tableContainerRef}
          className="flex-1 overflow-auto bg-white"
        >
          <table className="w-full border-collapse table-fixed min-w-[1150px]">
            <thead className="sticky top-0 z-10 bg-gray-100 shadow-sm">
              <tr>
                <th className="w-6 border border-gray-300 p-1 text-[10px] font-bold uppercase bg-gray-200 text-center">#</th>
                {COLUMNS.map((col) => (
                  <th 
                    key={col.id} 
                    className={`${col.width} border border-gray-300 p-2 text-[10px] font-bold uppercase text-center bg-gray-200`}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="w-12 border border-gray-300 p-2 text-[10px] font-bold uppercase bg-gray-200 text-center">Ação</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {rows.map((row, index) => (
                  <motion.tr 
                    key={row.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                  >
                    <td className="border border-gray-300 p-1 text-center text-xs font-mono text-gray-900 font-bold">
                      {index + 1}
                    </td>
                    {COLUMNS.map((col) => (
                      <td key={col.id} className="border border-gray-300 p-0">
                        {col.type === 'checkbox' ? (
                          <div className="flex justify-center items-center h-10">
                            <input 
                              type="checkbox"
                              checked={row[col.id as keyof RowData] as boolean}
                              onChange={(e) => handleInputChange(row.id, col.id as keyof RowData, e.target.checked)}
                              className="w-5 h-5 cursor-pointer accent-black"
                            />
                          </div>
                        ) : col.type === 'select' ? (
                          <select
                            value={row[col.id as keyof RowData] as string}
                            onChange={(e) => handleInputChange(row.id, col.id as keyof RowData, e.target.value)}
                            className="w-full h-10 px-2 text-sm font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 border-none bg-transparent appearance-none cursor-pointer text-center"
                          >
                            {(col as any).options?.map((opt: string) => (
                              <option key={opt} value={opt}>
                                {opt || 'Selecione...'}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input 
                            type="text"
                            value={row[col.id as keyof RowData] as string}
                            onChange={(e) => handleInputChange(row.id, col.id as keyof RowData, e.target.value)}
                            className="w-full h-10 px-2 text-sm font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 border-none bg-transparent text-center"
                          />
                        )}
                      </td>
                    ))}
                    <td className="border border-gray-300 p-1 text-center">
                      <button 
                        onClick={() => removeRow(row.id)}
                        className="text-red-400 hover:text-red-600 p-1 transition-colors"
                        title="Remover Linha"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white p-3 text-center border-t border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-center max-w-full mx-auto gap-2">
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase">
            CONTROLE DE EMBARQUE DE ISCAS
          </div>
          <div className="text-[10px] font-mono text-gray-400">
            {formatDate(currentTime)}
          </div>
          <div className="text-[10px] text-gray-500 italic">
            Uso do GR: PRÉ-ALERTA, PLAN. CARREG, BAIXA GR
          </div>
        </div>
      </footer>
    </div>
  );
}
