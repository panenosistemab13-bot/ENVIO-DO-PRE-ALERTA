import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, TrendingUp, Package, Truck, LayoutPanelTop, DollarSign, Target, Clock } from 'lucide-react';
import { RowData } from '../types';

interface StatsProps {
  rows: RowData[];
  onBack: () => void;
}

export default function Stats({ rows, onBack }: StatsProps) {
  const activeRows = rows.filter(r => r.iscaNo || r.cavalo || r.carreta);
  
  const totalValue = activeRows.reduce((acc, row) => {
    const val = row.valorNf?.replace('R$ ', '').replace(/\./g, '').replace(',', '.') || '0';
    return acc + parseFloat(val);
  }, 0);

  const totalM3 = activeRows.reduce((acc, row) => {
    return acc + (parseFloat(row.m3) || 0);
  }, 0);

  const uniqueCavalos = new Set(activeRows.map(r => r.cavalo).filter(Boolean)).size;
  const uniqueDocas = new Set(activeRows.map(r => r.doca).filter(Boolean)).size;

  const stats = [
    { label: 'Total de Iscas', value: activeRows.length, icon: <Package className="text-blue-500" />, desc: 'Registros ativos' },
    { label: 'Veículos (Cavalos)', value: uniqueCavalos, icon: <Truck className="text-green-500" />, desc: 'Placas únicas' },
    { label: 'Docas Ocupadas', value: uniqueDocas, icon: <LayoutPanelTop className="text-purple-500" />, desc: 'Pátio em uso' },
    { label: 'Volume Total (M³)', value: totalM3.toFixed(2), icon: <Target className="text-orange-500" />, desc: 'Capacidade cúbica' },
    { label: 'Valor em Mercadoria', value: `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: <DollarSign className="text-emerald-500" />, desc: 'Valor total NF' },
    { label: 'Média M³/Veículo', value: uniqueCavalos ? (totalM3 / uniqueCavalos).toFixed(2) : 0, icon: <TrendingUp className="text-pink-500" />, desc: 'Eficiência de carga' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <header className="max-w-6xl mx-auto mb-12 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-blue-500 transition-all text-blue-600"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Relatórios & Insights</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Análise de Embarques em Tempo Real</p>
          </div>
        </div>
        <div className="bg-blue-600 px-6 py-3 rounded-2xl font-black text-white text-xs uppercase tracking-widest shadow-xl shadow-blue-200 flex items-center gap-2">
          <Clock size={16} />
          {new Date().toLocaleDateString('pt-BR')}
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col items-center text-center group"
          >
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
              {React.cloneElement(item.icon as React.ReactElement, { size: 32, strokeWidth: 2.5 })}
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{item.label}</p>
            <h3 className="text-3xl font-black text-gray-900 mb-2">{item.value}</h3>
            <p className="text-xs font-bold text-gray-500 uppercase">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto mt-12">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50">
          <h2 className="text-xl font-black text-gray-900 uppercase mb-8 flex items-center gap-2">
            <TrendingUp size={24} className="text-blue-600" />
            Distribuição por Destino
          </h2>
          <div className="space-y-4">
            {Object.entries(
              activeRows.reduce((acc, row) => {
                const d = row.destino || 'Sem Destino';
                acc[d] = (acc[d] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([dest, count], idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-32 text-xs font-black text-gray-600 uppercase truncate">{dest}</div>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / activeRows.length) * 100}%` }}
                    className="h-full bg-blue-600"
                  />
                </div>
                <div className="w-12 text-right text-xs font-black text-gray-900">{count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
