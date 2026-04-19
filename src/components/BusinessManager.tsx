
import React, { useState, useEffect, useRef } from 'react';
import { StockItem, CompanyProfile, FixedCostsSettings, TaxSettings, CloudConfig } from '../types';
import { storageService } from '../services/storageService';

const BusinessManager: React.FC<{ showToast?: (m: string, t?: 'success' | 'error' | 'info') => void }> = ({ showToast }) => {
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'fixed-costs' | 'taxes' | 'cloud' | 'sync' | 'ai-settings'>('stock');
  const [stock, setStock] = useState<StockItem[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [newStockItem, setNewStockItem] = useState<Partial<StockItem>>({
    materialName: '',
    width: 300,
    height: 180,
    status: 'Disponível'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [fixedCosts, setFixedCosts] = useState<FixedCostsSettings>({
    id: 'current', 
    referenceMonth: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    energy: 0, water: 0, rent: 0, salariesAdmin: 0, internetTelefone: 0, maintenance: 0, fixedTaxes: 0, other: 0, total: 0, productiveHours: 176
  });

  const [taxSettings, setTaxSettings] = useState<TaxSettings>({
    regime: 'MEI / Isento', simplesAnexo: 'III', monthlyRevenue: 0, fixedRate: 0, issRate: 0, effectiveRate: 0
  });

  const [cloudConfig, setCloudConfig] = useState<CloudConfig>({
    enabled: false,
    provider: 'supabase',
    url: '',
    apiKey: ''
  });

  useEffect(() => {
    const loadData = async () => {
      const [stk, prof] = await Promise.all([
        storageService.getStock(),
        storageService.getProfile()
      ]);
      setStock(stk);
      setProfile(prof);
      if (prof.fixedCosts) setFixedCosts(prof.fixedCosts);
      if (prof.taxSettings) setTaxSettings(prof.taxSettings);
      if (prof.cloudConfig) setCloudConfig(prof.cloudConfig);
    };
    loadData();
  }, []);

  const savePricingSettings = async () => {
    if (!profile) return;
    const totalFixed = fixedCosts.energy + fixedCosts.water + fixedCosts.rent + fixedCosts.salariesAdmin + fixedCosts.internetTelefone + fixedCosts.maintenance + fixedCosts.fixedTaxes + fixedCosts.other;
    
    const updatedProfile = {
      ...profile,
      fixedCosts: { ...fixedCosts, total: totalFixed },
      taxSettings,
      cloudConfig,
      taxPercent: taxSettings.regime === 'MEI / Isento' ? 0 : profile.taxPercent
    };
    await storageService.saveProfile(updatedProfile);
    showToast?.("Configurações Financeiras Atualizadas!", "success");
  };

  const handleAddStock = async () => {
    if (!newStockItem.materialName || !newStockItem.width || !newStockItem.height) {
      showToast?.("Preencha todos os campos da chapa.", "error");
      return;
    }
    
    const newItem: StockItem = {
      id: `STK-${Date.now()}`,
      materialName: newStockItem.materialName.toUpperCase(),
      width: newStockItem.width || 0,
      height: newStockItem.height || 0,
      type: 'Chapa',
      status: 'Disponível',
      updatedAt: Date.now(),
      materialId: 'MANUAL'
    };
    
    const updatedStock = [newItem, ...stock];
    await storageService.saveStock(updatedStock);
    setStock(updatedStock);
    setIsAddingStock(false);
    setNewStockItem({ materialName: '', width: 300, height: 180, status: 'Disponível' });
    showToast?.("Nova chapa adicionada ao estoque!", "success");
  };

  const menuItems = [
    { id: 'stock', label: 'Estoque de Chapas', icon: '📦' },
    { id: 'fixed-costs', label: 'Custos Operacionais', icon: '🏭' },
    { id: 'taxes', label: 'Tributação e MEI', icon: '🏛️' },
    { id: 'ai-settings', label: 'IA e Assistente', icon: '🤖' },
    { id: 'sync', label: 'Backup e Segurança', icon: '🔄' }
  ];

  return (
    <div className="space-y-10 animate-in pb-20 max-w-7xl mx-auto px-4">
      <div className="flex flex-col gap-3">
        <h2 className="text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">Gestão da Empresa</h2>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-3">Configurações de Alta Performance Financeira</p>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-4 bg-slate-100 p-3 rounded-[2.5rem] shadow-inner">
        {menuItems.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as 'stock' | 'fixed-costs' | 'taxes' | 'cloud' | 'sync' | 'ai-settings')} 
            className={`flex items-center gap-4 px-10 py-5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === tab.id ? 'bg-[#0D4C4F] text-white shadow-2xl scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
          >
            <span className="text-xl">{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-12 md:p-16 rounded-[4.5rem] border border-slate-100 shadow-sm min-h-[650px]">
         
         {activeSubTab === 'fixed-costs' && (
           <div className="animate-in space-y-12">
              <div className="border-b border-slate-50 pb-10 flex justify-between items-end">
                 <div>
                    <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Custos Fixos Mensais</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Defina o overhead que será rateado em cada orçamento.</p>
                 </div>
                 <div className="text-right">
                    <span className="text-[9px] font-black text-slate-300 uppercase block mb-2">Mês de Referência</span>
                    <input className="bg-slate-50 rounded-2xl px-6 py-3 font-black text-xs text-[#0D4C4F] border-none outline-none shadow-inner" value={fixedCosts.referenceMonth} onChange={e => setFixedCosts({...fixedCosts, referenceMonth: e.target.value})} />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                 {[
                   { label: 'Energia Elétrica', key: 'energy' },
                   { label: 'Água e Esgoto', key: 'water' },
                   { label: 'Aluguel do Galpão', key: 'rent' },
                   { label: 'Salários Admin.', key: 'salariesAdmin' },
                   { label: 'Internet / Telefone', key: 'internetTelefone' },
                   { label: 'Manutenção Equip.', key: 'maintenance' },
                   { label: 'Impostos Fixos', key: 'fixedTaxes' },
                   { label: 'Outros Custos', key: 'other' }
                 ].map(item => (
                   <div key={item.key} className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:bg-white hover:border-[#0D4C4F]/30 group">
                      <label className="text-[9px] font-black text-slate-400 group-hover:text-[#0D4C4F] uppercase block mb-4 tracking-widest">{item.label}</label>
                      <div className="flex items-center gap-3">
                         <span className="text-slate-300 font-black text-sm">R$</span>
                         <input 
                           type="number" 
                           className="w-full bg-transparent border-none p-0 font-black text-slate-900 text-2xl outline-none" 
                           value={(fixedCosts as unknown as Record<string, string | number>)[item.key]} 
                           onChange={e => setFixedCosts({...fixedCosts, [item.key]: parseFloat(e.target.value) || 0})} 
                         />
                        </div>
                     </div>
                   ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center bg-[#0D4C4F] p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden border-8 border-white">
                   <div className="lg:col-span-4 space-y-6">
                      <span className="text-[10px] font-black text-white/40 uppercase block tracking-[0.4em]">Capacidade Operacional</span>
                      <div className="flex items-center gap-8">
                         <input 
                            type="number" 
                            className="bg-white/10 border border-white/20 rounded-[2rem] px-10 py-6 w-48 font-black text-4xl text-center outline-none focus:ring-4 focus:ring-emerald-400 transition-all" 
                            value={fixedCosts.productiveHours} 
                            onChange={e => setFixedCosts({...fixedCosts, productiveHours: parseInt(e.target.value) || 0})} 
                         />
                         <div>
                            <span className="text-2xl font-black block">Horas Úteis</span>
                            <span className="text-[10px] font-bold text-white/40 uppercase">Capacidade Mensal</span>
                         </div>
                      </div>
                   </div>

                   <div className="lg:col-span-4 text-center border-l border-r border-white/10 px-10">
                      <span className="text-[10px] font-black text-white/40 uppercase block mb-3 tracking-[0.4em]">Total de Custos Fixos</span>
                      <div className="text-5xl font-black tracking-tighter">R$ {(fixedCosts.energy + fixedCosts.water + fixedCosts.rent + fixedCosts.salariesAdmin + fixedCosts.internetTelefone + fixedCosts.maintenance + fixedCosts.fixedTaxes + fixedCosts.other).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                   </div>

                   <div className="lg:col-span-4 text-right">
                      <span className="text-[10px] font-black text-emerald-400 uppercase block mb-3 tracking-[0.4em]">Custo Hora Real</span>
                      <div className="text-6xl font-black text-emerald-400 tracking-tighter">
                        R$ {( (fixedCosts.energy + fixedCosts.water + fixedCosts.rent + fixedCosts.salariesAdmin + fixedCosts.internetTelefone + fixedCosts.maintenance + fixedCosts.fixedTaxes + fixedCosts.other) / (fixedCosts.productiveHours || 1)).toFixed(2)}
                      </div>
                   </div>
                </div>

                <button onClick={savePricingSettings} className="w-full bg-[#0D4C4F] text-white py-10 rounded-[3rem] font-black text-sm uppercase shadow-2xl hover:scale-[1.01] transition-all">Salvar Estrutura de Custos Fixos</button>
             </div>
           )}

           {activeSubTab === 'taxes' && (
             <div className="animate-in space-y-12">
                <div className="border-b border-slate-50 pb-10">
                   <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Configuração Tributária</h3>
                   <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Defina o impacto dos impostos sobre o faturamento bruto.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                   <div className="space-y-10">
                      <div className="bg-slate-50 p-12 rounded-[3.5rem] border border-slate-100 space-y-8">
                         <label className="text-[10px] font-black text-slate-400 uppercase block mb-6 tracking-widest">Regime Tributário</label>
                         <div className="flex flex-wrap gap-4">
                            {['Simples Nacional', 'Lucro Presumido', 'MEI / Isento'].map(reg => (
                              <button 
                                key={reg} 
                                onClick={() => setTaxSettings({...taxSettings, regime: reg as 'Simples Nacional' | 'Lucro Presumido' | 'MEI / Isento'})}
                                className={`flex-1 min-w-[160px] py-6 rounded-2xl font-black text-xs uppercase transition-all ${taxSettings.regime === reg ? 'bg-[#0D4C4F] text-white shadow-2xl scale-105' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
                              >
                                {reg}
                              </button>
                            ))}
                         </div>
                      </div>

                      {taxSettings.regime === 'MEI / Isento' ? (
                         <div className="bg-emerald-50 p-12 rounded-[3.5rem] border border-emerald-100 space-y-6 animate-in">
                            <div className="flex items-center gap-4">
                               <span className="text-4xl">🛡️</span>
                               <h4 className="text-emerald-700 font-black uppercase text-sm tracking-widest">Modo MEI Ativado</h4>
                            </div>
                            <p className="text-[11px] font-medium text-emerald-600 leading-relaxed">
                               Neste regime, o sistema assume que não há impostos incidentes sobre o valor da venda (Alíquota 0%). O lucro líquido será calculado apenas deduzindo os custos diretos e fixos. Ideal para microempreendedores individuais.
                            </p>
                         </div>
                      ) : taxSettings.regime === 'Lucro Presumido' ? (
                         <div className="grid grid-cols-2 gap-8 animate-in">
                            <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100">
                               <label className="text-[10px] font-black text-slate-400 uppercase block mb-4 tracking-widest">Alíquota Fixa (%)</label>
                               <div className="flex items-center gap-3">
                                  <input type="number" className="w-full bg-white rounded-2xl p-5 font-black text-2xl outline-none shadow-sm" value={taxSettings.fixedRate} onChange={e => setTaxSettings({...taxSettings, fixedRate: parseFloat(e.target.value) || 0})} />
                                  <span className="font-black text-slate-300 text-2xl">%</span>
                               </div>
                            </div>
                            <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100">
                               <label className="text-[10px] font-black text-slate-400 uppercase block mb-4 tracking-widest">ISS Municipal (%)</label>
                               <div className="flex items-center gap-3">
                                  <input type="number" className="w-full bg-white rounded-2xl p-5 font-black text-2xl outline-none shadow-sm" value={taxSettings.issRate} onChange={e => setTaxSettings({...taxSettings, issRate: parseFloat(e.target.value) || 0})} />
                                  <span className="font-black text-slate-300 text-2xl">%</span>
                               </div>
                            </div>
                         </div>
                      ) : (
                         <div className="bg-slate-50 p-12 rounded-[3.5rem] border border-slate-100 space-y-8 animate-in">
                            <div className="space-y-4">
                               <label className="text-[10px] font-black text-slate-400 uppercase block tracking-widest">Anexo do Simples</label>
                               <select className="w-full bg-white rounded-[1.5rem] px-8 py-6 font-black text-sm uppercase shadow-sm border-none outline-none" value={taxSettings.simplesAnexo} onChange={e => setTaxSettings({...taxSettings, simplesAnexo: e.target.value as 'I' | 'III' | 'IV'})}>
                                  <option value="I">Anexo I (Comércio de Pedras)</option>
                                  <option value="III">Anexo III (Serviços de Marmoraria)</option>
                                  <option value="IV">Anexo IV (Obras de Construção)</option>
                                </select>
                             </div>
                             <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase block tracking-widest">Faturamento Médio Mensal (R$)</label>
                                <input type="number" className="w-full bg-white rounded-[1.5rem] px-8 py-6 font-black text-2xl shadow-sm border-none outline-none" value={taxSettings.monthlyRevenue} onChange={e => setTaxSettings({...taxSettings, monthlyRevenue: parseFloat(e.target.value) || 0})} />
                             </div>
                          </div>
                       )}
                    </div>
  
                    <div className="bg-[#0D4C4F] p-20 rounded-[5rem] text-white shadow-2xl flex flex-col justify-center items-center text-center space-y-8 border-[12px] border-white relative overflow-hidden">
                       <span className="text-xs font-black text-emerald-400 uppercase tracking-[0.6em] relative z-10">Alíquota Efetiva de Venda</span>
                       <div className="text-[10rem] font-black tracking-tighter leading-none relative z-10">
                          {taxSettings.regime === 'MEI / Isento' ? '0.0' : taxSettings.regime === 'Lucro Presumido' ? (taxSettings.fixedRate + taxSettings.issRate).toFixed(1) : '10.5'}%
                       </div>
                       <div className="space-y-3 relative z-10">
                          <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">Carga tributária aplicada sobre o PREÇO DE VENDA BRUTO.</p>
                       </div>
                       <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>
                    </div>
                 </div>
                 <button onClick={savePricingSettings} className="w-full bg-[#0D4C4F] text-white py-10 rounded-[3rem] font-black text-sm uppercase shadow-2xl hover:scale-[1.01] transition-all">Salvar Configurações Tributárias</button>
              </div>
            )}
  
            {activeSubTab === 'ai-settings' && (
               <div className="animate-in space-y-12">
                  <div className="border-b border-slate-50 pb-10">
                     <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Assistente MarmoAI</h3>
                     <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Configure a inteligência artificial do seu sistema.</p>
                  </div>
  
                  <div className="bg-slate-50 p-12 rounded-[4rem] border border-slate-100 flex items-center justify-between group hover:bg-white transition-all">
                     <div className="flex items-center gap-8">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-4xl shadow-sm group-hover:bg-[#0D4C4F] group-hover:text-white transition-all">🤖</div>
                        <div>
                           <h4 className="text-lg font-black text-slate-900 uppercase">Ativar MarmoAI Pro</h4>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-md">Habilita o assistente flutuante em todas as telas para suporte técnico e financeiro em tempo real.</p>
                        </div>
                     </div>
                     <button 
                       onClick={async () => {
                         if (!profile) return;
                         const updated = { ...profile, aiAssistantEnabled: !profile.aiAssistantEnabled };
                         setProfile(updated);
                         await storageService.saveProfile(updated);
                         window.dispatchEvent(new CustomEvent('profileUpdated'));
                         showToast?.(updated.aiAssistantEnabled ? "Assistente IA Ativado" : "Assistente IA Desativado", "info");
                       }}
                       className={`w-24 h-12 rounded-full relative transition-all ${profile?.aiAssistantEnabled !== false ? 'bg-emerald-500' : 'bg-slate-200'}`}
                     >
                       <div className={`absolute top-1 w-10 h-10 bg-white rounded-full shadow-lg transition-all ${profile?.aiAssistantEnabled !== false ? 'left-13' : 'left-1'}`}></div>
                     </button>
                  </div>
  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-emerald-50 p-10 rounded-[3rem] border border-emerald-100">
                        <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-4">O que ele faz?</h5>
                        <ul className="space-y-3">
                           {['Cálculos de Markup', 'Sugestão de Materiais', 'Análise de Lucratividade', 'Dicas de Produção'].map(i => (
                             <li key={i} className="flex items-center gap-3 text-[10px] font-bold text-emerald-600 uppercase">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> {i}
                             </li>
                           ))}
                        </ul>
                     </div>
                     <div className="bg-slate-900 p-10 rounded-[3rem] text-white">
                        <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Privacidade</h5>
                        <p className="text-[10px] font-medium text-white/60 leading-relaxed uppercase">Seus dados de orçamentos são processados de forma anônima para fornecer insights. Nenhuma informação pessoal é compartilhada externamente.</p>
                     </div>
                  </div>
               </div>
             )}
  
             {activeSubTab === 'sync' && (
  
               <div className="animate-in space-y-16">
                  <div className="border-b border-slate-50 pb-10">
                     <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Backup e Segurança de Dados</h3>
                     <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Proteja seus orçamentos e produtos exportando arquivos de segurança.</p>
                  </div>
  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                     <div className="bg-slate-50 p-16 rounded-[4rem] border border-slate-100 flex flex-col items-center text-center space-y-8 group hover:bg-white hover:border-[#0D4C4F] transition-all shadow-sm">
                        <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center text-5xl shadow-sm group-hover:bg-[#0D4C4F] group-hover:text-white transition-all">📥</div>
                        <div>
                           <h4 className="text-sm font-black text-slate-900 uppercase mb-2">Exportar Banco de Dados</h4>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Gera um arquivo .json com tudo o que você cadastrou.</p>
                        </div>
                        <button onClick={() => storageService.exportFullDatabase()} className="bg-[#0D4C4F] text-white px-16 py-5 rounded-2xl font-black text-[11px] uppercase shadow-2xl hover:scale-105 transition-all">Download Backup Completo</button>
                     </div>
  
                     <div className="bg-slate-50 p-16 rounded-[4rem] border border-slate-100 flex flex-col items-center text-center space-y-8 group hover:bg-white hover:border-emerald-500 transition-all shadow-sm">
                        <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center text-5xl shadow-sm group-hover:bg-emerald-500 group-hover:text-white transition-all">📤</div>
                        <div>
                           <h4 className="text-sm font-black text-slate-900 uppercase mb-2">Importar Backup</h4>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Restaura dados de um arquivo baixado anteriormente.</p>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={e => {
                           const f = e.target.files?.[0];
                           if (f) {
                             const r = new FileReader();
                             r.onload = async ev => {
                               try {
                                 const data = JSON.parse(ev.target?.result as string);
                                 await storageService.importBackup(data);
                                 showToast?.("Backup Restaurado! Reiniciando...", "success");
                                 setTimeout(() => window.location.reload(), 1500);
                               } catch (error) {
                                 console.error("Erro ao ler arquivo de backup:", error);
                                 showToast?.("Erro ao ler arquivo de backup.", "error");
                               }
                             };
                             r.readAsText(f);
                           }
                        }} />
                        <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-500 text-white px-16 py-5 rounded-2xl font-black text-[11px] uppercase shadow-2xl hover:scale-105 transition-all">Selecionar Arquivo JSON</button>
                     </div>
                  </div>
               </div>
            )}

         {activeSubTab === 'stock' && (
           <div className="animate-in space-y-10">
              <div className="border-b border-slate-50 pb-10 flex justify-between items-end">
                 <div>
                    <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Estoque de Chapas e Retalhos</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Controle de materiais físicos disponíveis para produção.</p>
                 </div>
                 <button 
                   onClick={() => setIsAddingStock(true)}
                   className="bg-[#0D4C4F] text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all"
                 >
                   + Nova Chapa
                 </button>
              </div>

              {isAddingStock && (
                <div className="bg-slate-50 p-10 rounded-[3rem] border-2 border-[#0D4C4F] animate-in space-y-8">
                   <div className="flex justify-between items-center">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Cadastrar Novo Material</h4>
                      <button onClick={() => setIsAddingStock(false)} className="text-rose-500 font-black uppercase text-[10px]">Cancelar</button>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-1">
                         <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Nome do Material</label>
                         <input 
                           className="w-full bg-white rounded-2xl px-6 py-4 font-black text-xs uppercase outline-none shadow-sm" 
                           placeholder="EX: PRETO SÃO GABRIEL" 
                           value={newStockItem.materialName}
                           onChange={e => setNewStockItem({...newStockItem, materialName: e.target.value})}
                         />
                      </div>
                      <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Comprimento (cm)</label>
                         <input 
                           type="number"
                           className="w-full bg-white rounded-2xl px-6 py-4 font-black text-xs outline-none shadow-sm" 
                           value={newStockItem.width}
                           onChange={e => setNewStockItem({...newStockItem, width: parseInt(e.target.value) || 0})}
                         />
                      </div>
                      <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Altura (cm)</label>
                         <input 
                           type="number"
                           className="w-full bg-white rounded-2xl px-6 py-4 font-black text-xs outline-none shadow-sm" 
                           value={newStockItem.height}
                           onChange={e => setNewStockItem({...newStockItem, height: parseInt(e.target.value) || 0})}
                         />
                      </div>
                   </div>
                   <button 
                     onClick={handleAddStock}
                     className="w-full bg-[#0D4C4F] text-white py-5 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-slate-900 transition-all"
                   >
                     Confirmar Entrada no Estoque
                   </button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {stock.map(item => (
                   <div key={item.id} className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                      <div className="text-[9px] font-black text-slate-300 uppercase mb-2">#{item.id.slice(0, 6)}</div>
                      <h4 className="text-base font-black text-slate-900 uppercase mb-4">{item.materialName}</h4>
                      <div className="flex justify-between items-end">
                         <span className="text-xs font-black text-[#0D4C4F]">{item.width} x {item.height} cm</span>
                         <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full ${item.status === 'Disponível' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{item.status}</span>
                      </div>
                   </div>
                 ))}
                 {stock.length === 0 && (
                   <div className="col-span-full py-32 text-center opacity-20">
                      <span className="text-8xl block mb-6">📦</span>
                      <p className="font-black uppercase tracking-widest text-xs">Nenhum material em estoque</p>
                   </div>
                 )}
              </div>
           </div>
         )}
      </div>
    </div>
  );
};

export default BusinessManager;
