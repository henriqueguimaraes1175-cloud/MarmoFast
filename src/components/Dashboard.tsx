
import React, { useMemo } from 'react';
import { Quote } from '../types';
import { formatarMoeda } from '../utils/formatters';
import AppLogo from './AppLogo';

const Dashboard: React.FC<{ quotes: Quote[] }> = ({ quotes }) => {
  const stats = useMemo(() => {
    const approved = quotes.filter(q => q.status === 'Aprovado');
    const pending = quotes.filter(q => q.status === 'Em Aberto');
    
    return {
      totalRevenue: quotes.reduce((acc, q) => acc + q.total, 0),
      approvedRevenue: approved.reduce((acc, q) => acc + q.total, 0),
      pendingRevenue: pending.reduce((acc, q) => acc + q.total, 0),
      totalProfit: approved.reduce((acc, q) => acc + (q.financials?.profit || 0), 0),
      avgMargin: approved.length > 0 
        ? approved.reduce((acc, q) => acc + (q.financials?.margin || 0), 0) / approved.length 
        : 0,
      count: quotes.length,
      approvedCount: approved.length
    };
  }, [quotes]);

  return (
    <div className="space-y-12 animate-in pb-20 max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none">Painel Executivo</h2>
          <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.5em] mt-4">Gestão de Performance e Saúde Financeira</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
           <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Sistema Operacional</span>
        </div>
      </div>

      {/* Grid de Métricas em Destaque */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="bg-white p-12 rounded-[4.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all group relative overflow-hidden">
          <div className="relative z-10">
            <AppLogo size="md" className="mb-8 group-hover:scale-110 transition-all shadow-sm" />
            <span className="text-[11px] font-black text-slate-300 uppercase block mb-2 tracking-widest group-hover:text-[#0D4C4F]">Faturamento Total</span>
            <div className="text-4xl font-black text-[#0D4C4F] tracking-tighter">{formatarMoeda(stats.totalRevenue)}</div>
            <div className="mt-6 flex items-center gap-2">
               <span className="text-[9px] font-black px-3 py-1 bg-slate-100 rounded-full uppercase text-slate-500">{stats.count} Orçamentos</span>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-slate-50 rounded-full blur-3xl group-hover:bg-[#0D4C4F]/5 transition-all"></div>
        </div>

        <div className="bg-emerald-600 p-12 rounded-[4.5rem] text-white shadow-2xl hover:shadow-emerald-900/20 hover:-translate-y-1 transition-all group relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl mb-8 group-hover:bg-white group-hover:text-emerald-600 transition-all shadow-sm">✅</div>
            <span className="text-[11px] font-black text-white/40 uppercase block mb-2 tracking-widest group-hover:text-white">Vendas Aprovadas</span>
            <div className="text-4xl font-black text-white tracking-tighter">{formatarMoeda(stats.approvedRevenue)}</div>
            <div className="mt-6 flex items-center gap-2">
               <span className="text-[9px] font-black px-3 py-1 bg-white/10 rounded-full uppercase text-white/60">{stats.approvedCount} Projetos</span>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all"></div>
        </div>

        <div className="bg-slate-900 p-12 rounded-[4.5rem] text-white shadow-2xl hover:-translate-y-1 transition-all group relative overflow-hidden border-4 border-white">
          <div className="relative z-10">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl mb-8 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">📈</div>
            <span className="text-[11px] font-black text-white/40 uppercase block mb-2 tracking-widest">Lucro Líquido</span>
            <div className="text-4xl font-black text-emerald-400 tracking-tighter">{formatarMoeda(stats.totalProfit)}</div>
            <div className="mt-6 flex items-center gap-2">
               <span className="text-[9px] font-black px-3 py-1 bg-white/10 rounded-full uppercase text-emerald-400">Margem: {stats.avgMargin.toFixed(1)}%</span>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
        </div>

        <div className="bg-white p-12 rounded-[4.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all group relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl mb-8 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">⏳</div>
            <span className="text-[11px] font-black text-slate-300 uppercase block mb-2 tracking-widest group-hover:text-amber-600">Em Negociação</span>
            <div className="text-4xl font-black text-amber-600 tracking-tighter">{formatarMoeda(stats.pendingRevenue)}</div>
            <div className="mt-6 flex items-center gap-2">
               <span className="text-[9px] font-black px-3 py-1 bg-amber-50 rounded-full uppercase text-amber-600">Potencial de Fechamento</span>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-amber-50 rounded-full blur-3xl group-hover:bg-amber-500/5 transition-all"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
         <div className="lg:col-span-8 bg-white p-12 rounded-[4.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-10 flex items-center gap-4">
               <span className="w-2 h-6 bg-[#0D4C4F] rounded-full"></span> Fluxo Recente de Vendas
            </h3>
            <div className="space-y-4">
               {quotes.slice(0, 6).map(q => (
                 <div key={q.id} className="flex justify-between items-center p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-lg transition-all group">
                    <div className="flex items-center gap-6">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${q.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          {q.status === 'Aprovado' ? '✅' : '⏳'}
                       </div>
                       <div>
                          <span className="text-[10px] font-black text-[#0D4C4F] uppercase block tracking-tight">{q.clientName}</span>
                          <span className="text-[8px] font-bold text-slate-300 uppercase">{q.date} • #{q.number}</span>
                       </div>
                    </div>
                    <div className="text-right">
                       <span className="text-lg font-black text-slate-900 block">{formatarMoeda(q.total)}</span>
                       <span className={`text-[8px] font-black uppercase tracking-widest ${q.status === 'Aprovado' ? 'text-emerald-500' : 'text-amber-500'}`}>{q.status}</span>
                    </div>
                 </div>
               ))}
               {quotes.length === 0 && (
                 <div className="py-32 text-center opacity-20 font-black uppercase tracking-widest text-xs">Aguardando primeiros orçamentos...</div>
               )}
            </div>
         </div>

         <div className="lg:col-span-4 space-y-8">
            <div className="bg-[#0D4C4F] p-12 rounded-[4rem] text-white shadow-2xl border-4 border-white">
               <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-8">Saúde Financeira</h3>
               <div className="space-y-8">
                  <div>
                     <div className="flex justify-between text-[9px] font-black uppercase text-white/40 mb-2">
                        <span>Conversão de Vendas</span>
                        <span>{stats.count > 0 ? ((stats.approvedCount / stats.count) * 100).toFixed(0) : 0}%</span>
                     </div>
                     <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.count > 0 ? (stats.approvedCount / stats.count) * 100 : 0}%` }}></div>
                     </div>
                  </div>
                  <div>
                     <div className="flex justify-between text-[9px] font-black uppercase text-white/40 mb-2">
                        <span>Margem Média Real</span>
                        <span>{stats.avgMargin.toFixed(1)}%</span>
                     </div>
                     <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (stats.avgMargin / 40) * 100)}%` }}></div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm text-center space-y-6">
               <AppLogo size="lg" className="mx-auto" />
               <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">MarmoFast Pro</h4>
               <p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed">Versão 2.0.0 • Sua marmoraria em alta performance.</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
