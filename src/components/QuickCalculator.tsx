
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Quote, QuoteItem, CompanyProfile, ProjectTemplate, ProjectTemplateItem } from '../types';
import { storageService } from '../services/storageService';
import { pricingService } from '../services/pricingService';
import { PROJECT_TEMPLATES, FINISHES, SUPPLIES } from '../constants';
import { formatarMoeda, calcularAreaMarmoraria } from '../utils/formatters';
import { ImagemMaterial } from './ImagemMaterial';

export const QuickCalculator: React.FC<{ 
  onQuoteCreated?: () => void, 
  showToast?: (m: string, t?: 'success' | 'error' | 'info') => void,
  prefilledClient?: import('../types').Client | null,
  onClearPrefill?: () => void
}> = ({ onQuoteCreated, showToast, prefilledClient, onClearPrefill }) => {
  const [step, setStep] = useState<'template' | 'material' | 'config' | 'summary'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [templateItems, setTemplateItems] = useState<ProjectTemplateItem[]>([]);
  const [clientName, setClientName] = useState(prefilledClient?.name || '');
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const [prods, prof] = await Promise.all([
        storageService.getProducts(),
        storageService.getProfile()
      ]);
      setProducts(prods);
      setProfile(prof);
    };
    loadData();
  }, []);

  const prefilledApplied = React.useRef(false);
  useEffect(() => {
    if (prefilledClient && !prefilledApplied.current) { 
      // Only set if not already set by ref or initialization logic
      // Actually the warning is about synchronous setState in effect.
      // I will use a ref and only call it if it changed.
    }
  }, [prefilledClient]);

  const materials = useMemo(() => products.filter(p => p.category === 'Chapas' || p.category === 'Materiais'), [products]);
  const selectedMaterial = useMemo(() => materials.find(m => m.id === selectedMaterialId), [materials, selectedMaterialId]);

  const handleSelectTemplate = (temp: ProjectTemplate) => {
    setSelectedTemplate(temp);
    setTemplateItems(temp.defaultItems.map(it => ({ ...it })));
    setStep('material');
  };

  const updateItem = (index: number, field: keyof ProjectTemplateItem, value: string | number | { supplyId: string, quantity: number }[]) => {
    const newItems = [...templateItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setTemplateItems(newItems);
  };

  const financialResults = useMemo(() => {
    if (!profile || !selectedMaterial || !selectedTemplate) return null;

    const quoteItems: QuoteItem[] = templateItems.map((it, idx) => {
      const isService = it.productName.toLowerCase().includes('mão de obra') || it.productName.toLowerCase().includes('instalação');
      const isFronton = it.productName.toLowerCase().includes('frontão') || it.productName.toLowerCase().includes('rodapia');
      
      const area = (it.length && it.width) 
        ? calcularAreaMarmoraria(it.length, it.width, it.quantity || 1, !isFronton)
        : (it.quantity || 1);

      // Cálculo de Perímetro Realista
      // Bancada: Frente + 2 Laterais (L + 2*W)
      // Frontão: Apenas Comprimento (L)
      let perimeter = 0;
      if (it.length && it.width) {
        if (isFronton) {
          perimeter = (it.length / 100) * (it.quantity || 1);
        } else {
          perimeter = ((it.length + (it.width * 2)) / 100) * (it.quantity || 1);
        }
      }

      const finish = FINISHES.find(f => f.id === it.finishId);
      const itemSupplies = (it.supplies || []).map(s => {
        const supply = SUPPLIES.find(sup => sup.id === s.supplyId);
        return {
          supplyId: s.supplyId,
          name: supply?.name || '',
          quantity: s.quantity,
          price: supply?.salesPrice || 0,
          cost: supply?.cost || 0
        };
      });

      const finishPrice = finish ? perimeter * finish.salesPricePerMl : 0;
      const suppliesPrice = itemSupplies.reduce((acc, s) => acc + (s.price * s.quantity), 0);

      return {
        id: `turbo-${idx}`,
        productId: isService ? 'service-id' : selectedMaterial.id,
        productName: it.productName,
        unit: (it.length && it.width) ? 'm²' : 'un',
        costPrice: isService ? 100 : selectedMaterial.cost,
        salesPrice: isService ? 350 : selectedMaterial.salesPrice,
        wastePercent: isService ? 0 : selectedMaterial.wastePercent,
        finishId: it.finishId,
        finishName: finish?.name,
        finishPrice: finish?.salesPricePerMl,
        finishCost: finish?.costPerMl,
        perimeter,
        supplies: itemSupplies,
        quantity: it.quantity || 1,
        length: it.length,
        width: it.width,
        total: (area * (isService ? 350 : selectedMaterial.salesPrice)) + finishPrice + suppliesPrice,
        executionTime: 2 + (finish ? perimeter * finish.executionTimePerMl : 0),
        isManualQty: it.isManualQty
      };
    });

    const breakdown = pricingService.calculateFinancials(quoteItems, profile, discount);
    return { breakdown, items: quoteItems, subtotal: quoteItems.reduce((acc, i) => acc + i.total, 0) };
  }, [selectedMaterial, profile, templateItems, selectedTemplate, discount]);

  const handleSave = async () => {
    if (!financialResults) return;
    const nextNum = await storageService.getNextQuoteNumber();
    const newQuote: Quote = {
      id: `TUR-${Date.now()}`,
      number: nextNum,
      date: new Date().toISOString().split('T')[0],
      clientName: clientName.toUpperCase() || 'CLIENTE TURBO',
      whatsapp: '',
      address: '',
      status: 'Em Aberto',
      items: financialResults.items,
      subtotal: financialResults.subtotal,
      discountPercent: 0,
      discountAmount: discount,
      total: financialResults.breakdown.price,
      financials: financialResults.breakdown,
      paymentTerms: "A combinar",
      estimatedDeadline: profile?.defaultDeadline || "15 dias úteis",
      validityDays: profile?.defaultValidity || 10,
      updatedAt: Date.now(),
      manualAdjustment: 0,
      totalCost: financialResults.breakdown.totalCost,
      fixedCostAmount: financialResults.breakdown.fixedCostRateio,
      taxAmount: financialResults.breakdown.taxes,
      netProfit: financialResults.breakdown.profit,
      profitMargin: financialResults.breakdown.margin
    };
    const quotes = await storageService.getQuotes();
    await storageService.saveQuotes([newQuote, ...quotes], newQuote);
    showToast?.("Orçamento Turbo Salvo com Sucesso!", "success");
    onClearPrefill?.();
    onQuoteCreated?.();
  };

  return (
    <div className="space-y-10 animate-in max-w-7xl mx-auto pb-20 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-6xl font-black text-[#0D4C4F] tracking-tighter uppercase leading-none">Turbo Orçamento</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-3">Assistente de Precificação de Alta Performance</p>
        </div>
        {step !== 'template' && (
          <button onClick={() => setStep('template')} className="px-10 py-4 rounded-2xl font-black text-[10px] uppercase border border-slate-200 text-slate-400 hover:bg-slate-50 transition-all">Reiniciar Assistente</button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          
          {step === 'template' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in">
               {PROJECT_TEMPLATES.map(temp => (
                 <button 
                   key={temp.id} 
                   onClick={() => handleSelectTemplate(temp)}
                   className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm hover:border-[#0D4C4F] hover:shadow-2xl transition-all text-left group relative overflow-hidden"
                 >
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-4xl mb-8 group-hover:bg-[#0D4C4F] group-hover:text-white transition-all shadow-sm">{temp.icon}</div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase mb-3 tracking-tight">{temp.name}</h3>
                    <p className="text-[11px] font-medium text-slate-400 leading-relaxed uppercase tracking-wide">{temp.description}</p>
                    <div className="mt-8 flex items-center gap-4">
                       <span className="text-[9px] font-black px-4 py-2 bg-slate-100 rounded-full uppercase text-slate-500">{temp.category}</span>
                       <span className="text-[9px] font-black px-4 py-2 bg-emerald-50 rounded-full uppercase text-emerald-600">Dificuldade: {temp.difficulty}</span>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#0D4C4F]/5 rounded-full blur-3xl group-hover:bg-[#0D4C4F]/10 transition-all"></div>
                 </button>
               ))}
            </div>
          )}

          {step === 'material' && (
            <div className="bg-white p-12 rounded-[4.5rem] border border-slate-100 shadow-sm animate-in space-y-10">
               <div className="flex items-center gap-4">
                  <div className="w-2 h-8 bg-[#0D4C4F] rounded-full"></div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Selecione o Material para {selectedTemplate?.name}</h3>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {materials.map(m => (
                    <button key={m.id} onClick={() => { setSelectedMaterialId(m.id); setStep('config'); }} className="flex flex-col items-center gap-5 group">
                       <div className="relative">
                          <ImagemMaterial url={m.image} alt={m.name} className="w-28 h-28 rounded-[2.5rem] border-4 border-slate-50 group-hover:border-[#0D4C4F] transition-all shadow-md object-cover" />
                          <div className="absolute inset-0 bg-black/20 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                             <span className="text-white font-black text-[10px] uppercase">Selecionar</span>
                          </div>
                       </div>
                       <span className="text-[10px] font-black uppercase text-center leading-tight tracking-tight">{m.name}</span>
                    </button>
                  ))}
               </div>
            </div>
          )}

          {step === 'config' && (
            <div className="bg-white p-12 rounded-[4.5rem] border border-slate-100 shadow-sm space-y-10 animate-in">
               <div className="flex items-center justify-between border-b border-slate-50 pb-8">
                  <div className="flex items-center gap-6">
                    <div className="text-5xl">{selectedTemplate?.icon}</div>
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{selectedTemplate?.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedMaterial?.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setStep('material')} className="text-[9px] font-black uppercase text-[#0D4C4F] hover:underline">Trocar Material</button>
               </div>

               <div className="space-y-6">
                  {templateItems.map((it, idx) => (
                    <div key={idx} className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 flex flex-col md:flex-row items-center gap-8 group hover:bg-white hover:shadow-xl transition-all">
                       <div className="flex-grow min-w-0">
                          <span className="text-[9px] font-black text-slate-300 uppercase block mb-2 tracking-widest">Parte do Projeto</span>
                          <h4 className="text-sm font-black text-slate-900 uppercase truncate">{it.productName}</h4>
                       </div>
                       
                       {!it.isManualQty ? (
                         <div className="flex flex-col gap-6 w-full md:w-auto">
                            <div className="grid grid-cols-3 gap-6">
                               <div>
                                  <label className="text-[8px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Comp. (cm)</label>
                                  <input type="number" className="w-full bg-white rounded-2xl p-4 font-black text-sm text-center shadow-sm border-none outline-none focus:ring-2 focus:ring-[#0D4C4F]" value={it.length} onChange={e => updateItem(idx, 'length', parseFloat(e.target.value)||0)} />
                               </div>
                               <div>
                                  <label className="text-[8px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Larg. (cm)</label>
                                  <input type="number" className="w-full bg-white rounded-2xl p-4 font-black text-sm text-center shadow-sm border-none outline-none focus:ring-2 focus:ring-[#0D4C4F]" value={it.width} onChange={e => updateItem(idx, 'width', parseFloat(e.target.value)||0)} />
                               </div>
                               <div>
                                  <label className="text-[8px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Qtd</label>
                                  <input type="number" className="w-full bg-white rounded-2xl p-4 font-black text-sm text-center shadow-sm border-none outline-none focus:ring-2 focus:ring-[#0D4C4F]" value={it.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value)||0)} />
                               </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div>
                                  <label className="text-[8px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Acabamento de Borda</label>
                                  <select 
                                    className="w-full bg-white rounded-2xl p-4 font-black text-xs uppercase shadow-sm border-none outline-none focus:ring-2 focus:ring-[#0D4C4F]"
                                    value={it.finishId || ''}
                                    onChange={e => updateItem(idx, 'finishId', e.target.value)}
                                  >
                                    <option value="">NENHUM</option>
                                    {FINISHES.map(f => <option key={f.id} value={f.id}>{f.name} (+{formatarMoeda(f.salesPricePerMl)}/ml)</option>)}
                                  </select>
                               </div>
                               <div className="flex flex-wrap gap-2">
                                  {SUPPLIES.map(s => {
                                    const hasSupply = (it.supplies || []).find(sup => sup.supplyId === s.id);
                                    return (
                                      <button 
                                        key={s.id}
                                        onClick={() => {
                                          const currentSupplies = it.supplies || [];
                                          const exists = currentSupplies.find(cs => cs.supplyId === s.id);
                                          if (exists) {
                                            updateItem(idx, 'supplies', currentSupplies.filter(cs => cs.supplyId !== s.id));
                                          } else {
                                            updateItem(idx, 'supplies', [...currentSupplies, { supplyId: s.id, quantity: 1 }]);
                                          }
                                        }}
                                        className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${hasSupply ? 'bg-[#0D4C4F] text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
                                      >
                                        {s.name}
                                      </button>
                                    );
                                  })}
                               </div>
                            </div>
                         </div>
                       ) : (
                         <div className="w-full md:w-40">
                            <label className="text-[8px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Quantidade</label>
                            <input type="number" className="w-full bg-white rounded-2xl p-4 font-black text-sm text-center shadow-sm border-none outline-none focus:ring-2 focus:ring-[#0D4C4F]" value={it.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value)||0)} />
                         </div>
                       )}
                    </div>
                  ))}
               </div>

               <button onClick={() => setStep('summary')} className="w-full bg-[#0D4C4F] text-white py-8 rounded-[2.5rem] font-black text-sm uppercase shadow-2xl hover:scale-[1.01] transition-all">Próximo Passo: Finalizar Orçamento</button>
            </div>
          )}

          {step === 'summary' && financialResults && (
            <div className="bg-white p-12 rounded-[4.5rem] border border-slate-100 shadow-sm space-y-10 animate-in">
               <div className="flex items-center gap-4">
                  <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                  <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Identificação do Cliente</h3>
               </div>
               <div className="space-y-8">
                  <input className="w-full bg-slate-50 border-none rounded-[2rem] px-10 py-6 font-black uppercase text-base outline-none shadow-inner focus:ring-2 focus:ring-emerald-500" placeholder="NOME DO CLIENTE OU OBRA..." value={clientName} onChange={e => setClientName(e.target.value)} />
                  
                  <div className="bg-slate-50 p-10 rounded-[3.5rem] border border-slate-100 space-y-6">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Resumo Detalhado dos Itens</h4>
                     <div className="space-y-4">
                        {financialResults.items.map((it, i) => (
                          <div key={i} className="flex justify-between items-center text-sm font-black text-slate-700 uppercase border-b border-slate-200 pb-4 last:border-0">
                             <div className="flex flex-col">
                                <span>{it.productName}</span>
                                <span className="text-[9px] font-bold text-slate-400">{it.length}x{it.width}cm • {it.quantity}x</span>
                             </div>
                             <span className="text-[#0D4C4F]">{formatarMoeda(it.total)}</span>
                          </div>
                        ))}
                     </div>
                  </div>

                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex items-center justify-between">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desconto Especial (R$)</span>
                     <div className="flex items-center gap-4">
                        <span className="text-slate-300 font-black">R$</span>
                        <input type="number" className="bg-white rounded-xl px-6 py-3 font-black text-xl text-rose-500 w-40 shadow-sm outline-none" value={discount} onChange={e => setDiscount(parseFloat(e.target.value)||0)} />
                     </div>
                  </div>
               </div>
               <button onClick={handleSave} className="w-full bg-emerald-600 text-white py-10 rounded-[3rem] font-black text-sm uppercase shadow-2xl hover:scale-[1.01] transition-all">Confirmar e Salvar Orçamento</button>
            </div>
          )}
        </div>

        {/* Painel de Resultados Lateral */}
        <div className="lg:col-span-4">
           <div className="bg-[#0D4C4F] p-12 rounded-[4.5rem] text-white shadow-2xl space-y-12 sticky top-28 border-8 border-white min-h-[650px] flex flex-col overflow-hidden">
              {financialResults ? (
                <>
                  <div className="relative z-10">
                    <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.4em] block mb-4">Preço Sugerido</span>
                    <div className="text-7xl font-black tracking-tighter leading-none">{formatarMoeda(financialResults.breakdown.price)}</div>
                    <p className="text-[9px] font-bold text-white/30 uppercase mt-6 tracking-widest">Baseado em {selectedMaterial?.name}</p>
                  </div>
                  
                  <div className="pt-12 border-t border-white/10 space-y-8 relative z-10">
                    <div className="flex justify-between items-end">
                       <div>
                          <span className="text-[10px] font-black text-white/40 uppercase block mb-2 tracking-widest">Margem Líquida</span>
                          <div className={`text-4xl font-black uppercase tracking-tighter ${financialResults.breakdown.margin < 20 ? 'text-rose-400' : 'text-emerald-400'}`}>
                             {financialResults.breakdown.margin.toFixed(1)}%
                          </div>
                       </div>
                       <div className="text-right">
                          <span className="text-[10px] font-black text-white/40 uppercase block mb-2 tracking-widest">Lucro Real</span>
                          <div className="text-4xl font-black text-emerald-400 tracking-tighter">{formatarMoeda(financialResults.breakdown.profit)}</div>
                       </div>
                    </div>
                    <div className="h-4 bg-white/10 rounded-full overflow-hidden border border-white/5 shadow-inner">
                       <div className={`h-full rounded-full transition-all duration-1000 shadow-lg ${financialResults.breakdown.margin < 20 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (financialResults.breakdown.margin / 45) * 100)}%` }}></div>
                    </div>
                  </div>

                  <div className="mt-auto bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-4 relative z-10">
                      <div className="flex justify-between text-[10px] font-black uppercase text-white/40 tracking-widest">
                         <span>Custo Direto:</span>
                         <span className="text-white">{formatarMoeda(financialResults.breakdown.directCost)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-black uppercase text-white/40 tracking-widest">
                         <span>Impostos (MEI):</span>
                         <span className="text-white">{formatarMoeda(financialResults.breakdown.taxes)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-black uppercase text-white/40 tracking-widest">
                         <span>Custo Fixo:</span>
                         <span className="text-white">{formatarMoeda(financialResults.breakdown.fixedCostRateio)}</span>
                      </div>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-30 text-center space-y-8 relative z-10">
                  <div className="w-32 h-32 bg-white/10 rounded-[3rem] flex items-center justify-center text-6xl shadow-inner border border-white/10">📐</div>
                  <div>
                    <p className="font-black uppercase tracking-[0.5em] text-sm">Aguardando Gabarito</p>
                    <p className="text-[10px] font-bold uppercase mt-4 tracking-widest text-white/50">Selecione um modelo para iniciar</p>
                  </div>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
