
import React, { useState, useEffect, useMemo } from 'react';
import { Client, Quote } from '../types';
import { storageService } from '../services/storageService';
import { formatarMoeda } from '../utils/formatters';

const ClientManager: React.FC<{ showToast: (m: string, t?: 'success' | 'error' | 'info') => void }> = ({ showToast }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'Todos' | 'Final' | 'Parceiro'>('Todos');
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClient, setNewClient] = useState({ 
    name: '', 
    whatsapp: '', 
    address: '', 
    type: 'Final' as 'Final' | 'Parceiro',
    status: 'Aguardando' as Client['status']
  });

  useEffect(() => {
    const loadData = async () => {
      const [c, q] = await Promise.all([
        storageService.getClients(),
        storageService.getQuotes()
      ]);
      setClients(c);
      setQuotes(q);
    };
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.whatsapp.includes(search) ||
        (c.materialsHistory || []).some(m => m.toLowerCase().includes(search.toLowerCase()));
      
      const matchesType = filterType === 'Todos' || c.type === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [clients, search, filterType]);

  const stats = useMemo(() => {
    const totalSpent = clients.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
    const avgSpent = clients.length > 0 ? totalSpent / clients.length : 0;
    return { totalSpent, avgSpent, count: clients.length };
  }, [clients]);

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.whatsapp) {
      showToast("Nome e WhatsApp são obrigatórios", "error");
      return;
    }

    const client: Client = {
      id: Math.random().toString(36).substr(2, 9),
      name: newClient.name,
      whatsapp: newClient.whatsapp,
      address: newClient.address,
      type: newClient.type,
      status: newClient.status,
      totalSpent: 0,
      quoteIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      materialsHistory: [],
      photos: []
    };

    const updated = [...clients, client];
    setClients(updated);
    await storageService.saveClients(updated);
    setIsAddingClient(false);
    setNewClient({ name: '', whatsapp: '', address: '', type: 'Final', status: 'Aguardando' });
    showToast("Cliente cadastrado com sucesso!", "success");
  };

  const getFidelityBadge = (spent: number) => {
    if (spent > 50000) return { label: 'Diamante', color: 'bg-blue-500', icon: '💎' };
    if (spent > 20000) return { label: 'Ouro', color: 'bg-amber-500', icon: '🏆' };
    if (spent > 5000) return { label: 'Prata', color: 'bg-slate-400', icon: '🥈' };
    return { label: 'Bronze', color: 'bg-orange-400', icon: '🥉' };
  };

  const getStatusColor = (status?: string) => {
    switch(status) {
      case 'Em Medição': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Em Produção': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Finalizado': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  const startQuickQuote = (client: Client) => {
    // We'll use a custom event to tell App.tsx to switch to calculator and pre-fill
    window.dispatchEvent(new CustomEvent('startQuickQuote', { detail: client }));
    showToast(`Iniciando orçamento para ${client.name}`, "info");
  };

  return (
    <div className="space-y-12 animate-in pb-20 max-w-7xl mx-auto px-4">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none">Clientes</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-4">Gestão de Relacionamento e Fidelidade</p>
        </div>
        <button 
          onClick={() => setIsAddingClient(true)}
          className="bg-[#0D4C4F] text-white px-10 py-5 rounded-2xl font-black text-[11px] uppercase shadow-2xl hover:scale-105 transition-all flex items-center gap-3"
        >
          <span className="text-xl">+</span> Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total de Clientes</span>
          <div className="text-5xl font-black text-slate-900">{stats.count}</div>
        </div>
        <div className="bg-[#0D4C4F] p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Faturamento Acumulado</span>
          <div className="text-4xl font-black">{formatarMoeda(stats.totalSpent)}</div>
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
        </div>
        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Ticket Médio</span>
          <div className="text-4xl font-black text-slate-900">{formatarMoeda(stats.avgSpent)}</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          {['Todos', 'Final', 'Parceiro'].map(type => (
            <button 
              key={type}
              onClick={() => setFilterType(type as 'Todos' | 'Final' | 'Parceiro')}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === type ? 'bg-[#0D4C4F] text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:border-[#0D4C4F]/30'}`}
            >
              {type === 'Todos' ? 'Todos os Clientes' : type === 'Final' ? 'Clientes Finais' : 'Parceiros / Arqs'}
            </button>
          ))}
        </div>

        <div className="bg-white p-6 rounded-[3rem] border border-slate-100 shadow-sm flex items-center gap-6">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl">🔍</div>
          <input 
            className="flex-grow bg-transparent border-none font-black text-sm uppercase outline-none placeholder:text-slate-300" 
            placeholder="Buscar por nome, telefone ou material (ex: Granito)..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {filtered.map(c => {
          const badge = getFidelityBadge(c.totalSpent || 0);
          const clientQuotes = quotes.filter(q => q.clientName === c.name).slice(0, 3);
          
          return (
            <div key={c.id} className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm hover:border-[#0D4C4F]/30 transition-all group relative overflow-hidden">
              {/* Status Tag */}
              <div className={`absolute top-10 right-10 px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${getStatusColor(c.status)}`}>
                {c.status || 'Aguardando'}
              </div>

              <div className="flex justify-between items-start mb-8 pr-24">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-3xl group-hover:bg-[#0D4C4F] group-hover:text-white transition-all">
                    {c.type === 'Parceiro' ? '📐' : '👤'}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase leading-tight flex items-center gap-2">
                      {c.name}
                      {c.type === 'Parceiro' && <span className="text-[8px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md">ARQ/ENG</span>}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mt-1">{c.whatsapp}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 p-6 rounded-3xl">
                  <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Total Investido</span>
                  <span className="text-lg font-black text-[#0D4C4F]">{formatarMoeda(c.totalSpent || 0)}</span>
                </div>
                <div className={`${badge.color} p-6 rounded-3xl text-white shadow-lg`}>
                  <span className="text-[8px] font-black text-white/50 uppercase block mb-1">Fidelidade</span>
                  <span className="text-lg font-black flex items-center gap-2">{badge.icon} {badge.label}</span>
                </div>
              </div>

              {/* Address & Maps */}
              {c.address && (
                <div className="mb-8 p-6 bg-slate-50 rounded-3xl flex justify-between items-center group/map">
                  <div className="flex items-center gap-4">
                    <span className="text-xl">📍</span>
                    <div className="max-w-[200px]">
                      <span className="text-[8px] font-black text-slate-300 uppercase block">Endereço da Obra</span>
                      <span className="text-[10px] font-bold text-slate-600 truncate block">{c.address}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`)}
                    className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:bg-[#0D4C4F] hover:text-white transition-all shadow-sm"
                  >
                    ↗️
                  </button>
                </div>
              )}

              {/* Timeline / Recent Quotes */}
              {clientQuotes.length > 0 && (
                <div className="mb-8">
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest block mb-4">Linha do Tempo (Últimos Pedidos)</span>
                  <div className="space-y-3">
                    {clientQuotes.map(q => (
                      <div key={q.id} className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <span className="text-[8px] font-black text-slate-400">#{q.number}</span>
                          <span className="text-[10px] font-bold text-slate-700">{q.date}</span>
                        </div>
                        <span className="text-[10px] font-black text-[#0D4C4F]">{formatarMoeda(q.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-50">
                <button 
                  onClick={() => startQuickQuote(c)}
                  className="flex-grow bg-[#0D4C4F] text-white py-4 rounded-2xl text-[10px] font-black uppercase hover:scale-105 transition-all shadow-lg"
                >
                  ⚡ Novo Orçamento
                </button>
                <button 
                  onClick={() => window.open(`https://wa.me/${c.whatsapp.replace(/\D/g,'')}`)}
                  className="flex-grow bg-emerald-50 text-emerald-600 py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-500 hover:text-white transition-all"
                >
                  WhatsApp
                </button>
                <button className="px-6 bg-slate-50 text-slate-400 py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-900 hover:text-white transition-all">
                  Perfil Completo
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-40 text-center opacity-20 flex flex-col items-center gap-6">
          <span className="text-9xl">👥</span>
          <div>
            <h3 className="text-xl font-black uppercase tracking-widest">Nenhum cliente encontrado</h3>
            <p className="text-xs font-bold uppercase mt-2">Tente buscar por outro nome ou material</p>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {isAddingClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden animate-in">
            <div className="bg-[#0D4C4F] p-12 text-white">
              <h3 className="text-4xl font-black uppercase tracking-tighter">Novo Cliente</h3>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-2">Cadastre um novo relacionamento</p>
            </div>
            <div className="p-12 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nome Completo</label>
                  <input 
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-2 focus:ring-[#0D4C4F]/10" 
                    value={newClient.name}
                    onChange={e => setNewClient({...newClient, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">WhatsApp</label>
                  <input 
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-2 focus:ring-[#0D4C4F]/10" 
                    placeholder="(00) 00000-0000"
                    value={newClient.whatsapp}
                    onChange={e => setNewClient({...newClient, whatsapp: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tipo de Cliente</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-2 focus:ring-[#0D4C4F]/10"
                    value={newClient.type}
                    onChange={e => setNewClient({...newClient, type: e.target.value as 'Final' | 'Parceiro'})}
                  >
                    <option value="Final">Cliente Final</option>
                    <option value="Parceiro">Parceiro (Arq/Eng)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Status Inicial da Obra</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-2 focus:ring-[#0D4C4F]/10"
                    value={newClient.status}
                    onChange={e => setNewClient({...newClient, status: e.target.value as Client['status']})}
                  >
                    <option value="Aguardando">Aguardando</option>
                    <option value="Em Medição">Em Medição</option>
                    <option value="Em Produção">Em Produção</option>
                    <option value="Finalizado">Finalizado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Endereço da Obra</label>
                <input 
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-2 focus:ring-[#0D4C4F]/10" 
                  value={newClient.address}
                  onChange={e => setNewClient({...newClient, address: e.target.value})}
                />
              </div>
              <div className="flex gap-4 pt-6">
                <button 
                  onClick={() => setIsAddingClient(false)}
                  className="flex-grow bg-slate-100 text-slate-400 py-5 rounded-2xl font-black text-[11px] uppercase hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAddClient}
                  className="flex-grow bg-[#0D4C4F] text-white py-5 rounded-2xl font-black text-[11px] uppercase shadow-xl hover:scale-105 transition-all"
                >
                  Salvar Cliente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManager;
