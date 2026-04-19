
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Quote, QuoteItem, Product, CompanyProfile } from '../types';
import { storageService } from '../services/storageService';
import { pricingService } from '../services/pricingService';
import { formatarMoeda, calcularAreaMarmoraria, valorPorExtenso } from '../utils/formatters';

export const QuoteManager: React.FC<{ showToast: (m: string, t?: 'success' | 'error' | 'info') => void }> = ({ showToast }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<Partial<Quote> | null>(null);
  const [search, setSearch] = useState('');

  const refreshData = useCallback(async () => {
    const [q, p, prof] = await Promise.all([
      storageService.getQuotes(),
      storageService.getProducts(),
      storageService.getProfile()
    ]);
    setQuotes(q.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
    setProducts(p);
    setProfile(prof);
  }, []);

  useEffect(() => { 
    const load = async () => {
      await refreshData();
    };
    load();
  }, [refreshData]);

  const syncQuote = useCallback((quote: Partial<Quote>): Partial<Quote> => {
    if (!profile) return quote;
    
    const processedItems = (quote.items || []).map(it => {
      const area = (it.unit === 'm²' && it.length && it.width)
        ? (it.isManualQty ? it.quantity : calcularAreaMarmoraria(it.length, it.width, it.quantity))
        : it.quantity;
      return { ...it, total: area * (it.salesPrice || 0) };
    });

    const subtotal = processedItems.reduce((acc, it) => acc + it.total, 0);
    const financials = pricingService.calculateFinancials(processedItems, profile, quote.discountAmount || 0);

    return { 
      ...quote, 
      items: processedItems,
      subtotal,
      total: financials.price, 
      financials
    };
  }, [profile]);

  const handleSave = async () => {
    if (!currentQuote?.clientName) return showToast("Nome do cliente obrigatório.", 'error');
    const finalToSave = syncQuote(currentQuote) as Quote;
    finalToSave.updatedAt = Date.now();
    
    const allQuotes = await storageService.getQuotes();
    const updated = allQuotes.some(q => q.id === finalToSave.id) 
      ? allQuotes.map(q => q.id === finalToSave.id ? finalToSave : q) 
      : [finalToSave, ...allQuotes];
    
    await storageService.saveQuotes(updated, finalToSave);
    showToast("Orçamento salvo com sucesso!", "success");
    setIsCreating(false);
    await refreshData();
  };

  const generatePDF = async (quote: Quote) => {
    const element = document.getElementById(`quote-pdf-${quote.id}`);
    if (!element) {
      showToast("Erro: Elemento do PDF não encontrado.", "error");
      return;
    }
    
    showToast("Gerando PDF, aguarde...", "info");

    const cleanNumber = quote.number.replace(/[^a-z0-9]/gi, '_');
    const cleanName = quote.clientName.replace(/[^a-z0-9]/gi, '_');
    
    const opt = {
      margin: 0,
      filename: `Orcamento_${cleanNumber}_${cleanName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true,
        scrollY: 0,
        logging: false
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      // @ts-expect-error html2pdf is loaded from CDN
      await html2pdf().set(opt).from(element).save();
      showToast("PDF Gerado com Sucesso!", "success");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      showToast("Erro ao gerar PDF. Tente novamente.", "error");
    }
  };

  const sendWhatsApp = (quote: Quote) => {
    const text = `*ORÇAMENTO MARMOFAST PRO #${quote.number}*\n\n` +
      `Olá, *${quote.clientName}*!\n` +
      `Segue o resumo do seu orçamento:\n\n` +
      `*Total:* ${formatarMoeda(quote.total)}\n` +
      `*Prazo:* ${quote.estimatedDeadline}\n` +
      `*Validade:* ${quote.validityDays} dias\n\n` +
      `_Gerado por MarmoFast Pro_`;
    
    const url = `https://wa.me/${quote.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => q.clientName.toLowerCase().includes(search.toLowerCase()) || q.number.includes(search));
  }, [quotes, search]);

  return (
    <div className="space-y-10 animate-in pb-20 max-w-7xl mx-auto px-4">
      {!isCreating ? (
        <div className="space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h2 className="text-6xl font-black text-slate-900 uppercase tracking-tighter leading-none">Gestão de Vendas</h2>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-3">Controle de Orçamentos e Carteira de Clientes</p>
            </div>
            <button onClick={() => { 
                storageService.getNextQuoteNumber().then(num => {
                  setCurrentQuote(syncQuote({
                    id: Date.now().toString(), 
                    number: num, 
                    date: new Date().toISOString().split('T')[0],
                    clientName: '', 
                    status: 'Em Aberto', 
                    items: [], 
                    discountAmount: 0,
                    paymentTerms: '50% sinal + 50% na entrega',
                    estimatedDeadline: '15 dias úteis',
                    validityDays: 10
                  }));
                  setIsCreating(true);
                });
              }} 
              className="bg-[#0D4C4F] text-white px-12 py-5 rounded-[2rem] font-black text-xs uppercase shadow-2xl hover:scale-105 transition-all">
              + Novo Orçamento
            </button>
          </div>

          <div className="bg-white p-6 rounded-[3rem] shadow-sm border border-slate-100 flex items-center gap-6">
             <div className="text-2xl ml-4">🔍</div>
             <input 
               className="flex-grow bg-transparent border-none rounded-2xl px-4 py-4 font-black text-sm outline-none" 
               placeholder="PESQUISAR POR CLIENTE, OBRA OU NÚMERO DO ORÇAMENTO..." 
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredQuotes.map(q => (
              <div 
                key={q.id} 
                className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-[#0D4C4F]/30 transition-all cursor-pointer group relative overflow-hidden" 
                onClick={() => { setCurrentQuote(syncQuote(q)); setIsCreating(true); }}
              >
                <div className="flex justify-between items-start mb-8">
                   <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">#{q.number}</span>
                   <span className={`text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-widest ${q.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      {q.status}
                   </span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase truncate mb-2 tracking-tight">{q.clientName}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-8 tracking-widest">{q.date}</p>
                
                <div className="flex justify-between items-end border-t border-slate-50 pt-8">
                   <div>
                      <span className="text-[9px] font-black text-slate-300 uppercase block mb-2 tracking-widest">Valor Total</span>
                      <div className="text-3xl font-black text-[#0D4C4F] tracking-tighter">{formatarMoeda(q.total)}</div>
                   </div>
                   <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl group-hover:bg-[#0D4C4F] group-hover:text-white transition-all shadow-sm">→</div>
                </div>
                <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#0D4C4F]/5 rounded-full blur-3xl group-hover:bg-[#0D4C4F]/10 transition-all"></div>
              </div>
            ))}
            {filteredQuotes.length === 0 && (
              <div className="col-span-full py-40 text-center opacity-20 font-black uppercase tracking-[0.5em] text-sm">
                 Nenhum orçamento encontrado
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="animate-in max-w-7xl mx-auto space-y-10">
          <div className="flex justify-between items-center bg-white/80 backdrop-blur-xl p-8 rounded-[3.5rem] shadow-2xl sticky top-4 z-40 border border-white/20">
             <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-900 font-black text-[11px] uppercase flex items-center gap-3 transition-all">
                <span className="text-2xl">←</span> Voltar para a Lista
             </button>
             <div className="flex gap-6">
                <button onClick={() => currentQuote && generatePDF(currentQuote as Quote)} className="bg-slate-100 text-slate-600 px-8 py-5 rounded-[1.8rem] font-black text-xs uppercase hover:bg-slate-200 transition-all flex items-center gap-3">
                   📄 Gerar PDF
                </button>
                <button onClick={() => currentQuote && sendWhatsApp(currentQuote as Quote)} className="bg-emerald-100 text-emerald-600 px-8 py-5 rounded-[1.8rem] font-black text-xs uppercase hover:bg-emerald-200 transition-all flex items-center gap-3">
                   💬 WhatsApp
                </button>
                <button onClick={handleSave} className="bg-emerald-600 text-white px-14 py-5 rounded-[1.8rem] font-black text-xs uppercase shadow-2xl hover:bg-emerald-700 hover:scale-105 transition-all">
                   Salvar Alterações
                </button>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
             <div className="lg:col-span-8 space-y-10">
                {/* PDF Template (Hidden) */}
                <div style={{ position: 'absolute', left: '-9999px', top: '0', pointerEvents: 'none', zIndex: -100 }}>
                   <div id={`quote-pdf-${currentQuote?.id}`} className="bg-white p-12 text-slate-900 font-sans" style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box', position: 'relative' }}>
                      {/* Header Design */}
                      <div className="flex justify-between items-stretch mb-10 border-b-4 border-[#0D4C4F] pb-10">
                         <div className="flex flex-col justify-between">
                            {profile?.logo && <img src={profile.logo} alt="Logo" className="h-16 mb-4 object-contain self-start" referrerPolicy="no-referrer" crossOrigin="anonymous" />}
                            <div>
                               <h1 className="text-3xl font-black text-[#0D4C4F] uppercase tracking-tighter leading-none mb-2">{profile?.name || 'MARMORARIA'}</h1>
                               <div className="space-y-0.5">
                                  {profile?.showAddress && <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{profile?.address}</p>}
                                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">CNPJ: {profile?.cnpj} • {profile?.phone}</p>
                                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{profile?.email} • {profile?.pixKey ? `PIX: ${profile.pixKey}` : ''}</p>
                               </div>
                            </div>
                         </div>
                         <div className="text-right flex flex-col justify-between">
                            <div>
                               <div className="bg-[#0D4C4F] text-white px-6 py-3 rounded-xl inline-block mb-2">
                                  <h2 className="text-lg font-black uppercase tracking-tighter">ORÇAMENTO #{currentQuote?.number}</h2>
                               </div>
                               <p className="text-[10px] font-black text-[#0D4C4F] uppercase tracking-[0.2em]">{currentQuote?.date}</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-4">
                               <div className="text-right">
                                  <span className="text-[8px] font-black text-slate-400 uppercase block tracking-widest">Total Geral</span>
                                  <div className="text-xl font-black text-[#0D4C4F] tracking-tighter leading-none">{formatarMoeda(currentQuote?.total || 0)}</div>
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Client & Work Info Grid */}
                      <div className="grid grid-cols-2 gap-8 mb-10">
                         <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col flex-grow">
                            <div className="flex items-center gap-2 mb-4">
                               <div className="w-1.5 h-3 bg-[#0D4C4F] rounded-full"></div>
                               <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dados do Cliente</h3>
                            </div>
                            <div className="space-y-3">
                               <div>
                                  <p className="text-sm font-black uppercase text-slate-900 leading-none mb-1">{currentQuote?.clientName}</p>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{currentQuote?.whatsapp || 'Telefone não informado'}</p>
                               </div>
                               <div className="pt-3 border-t border-slate-200">
                                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Endereço de Cobrança</p>
                                  <p className="text-[9px] font-black text-slate-600 uppercase leading-snug">{currentQuote?.address || 'Não informado'}</p>
                               </div>
                            </div>
                         </div>
                         <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col flex-grow">
                            <div className="flex items-center gap-2 mb-4">
                               <div className="w-1.5 h-3 bg-[#0D4C4F] rounded-full"></div>
                               <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Local da Obra</h3>
                            </div>
                            <div className="space-y-3">
                               <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Endereço da Obra / Entrega</p>
                                  <p className="text-[10px] font-black text-slate-700 uppercase leading-snug">{currentQuote?.workAddress || currentQuote?.address || 'Não informado'}</p>
                               </div>
                               <div className="pt-3 border-t border-slate-200 flex justify-between gap-4">
                                  <div>
                                     <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Validade</p>
                                     <p className="text-[10px] font-black text-[#0D4C4F]">{currentQuote?.validityDays || 7} DIAS</p>
                                  </div>
                                  <div className="text-right">
                                     <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Prazo Entrega</p>
                                     <p className="text-[10px] font-black text-[#0D4C4F]">{currentQuote?.estimatedDeadline || 'A combinar'}</p>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Items Table */}
                      <div className="mb-10 overflow-hidden rounded-3xl border border-slate-200">
                         <table className="w-full border-collapse">
                            <thead>
                               <tr className="bg-[#0D4C4F] text-white">
                                  <th className="p-4 text-[9px] font-black uppercase text-left tracking-widest">Descrição detalhada do item</th>
                                  <th className="p-4 text-[9px] font-black uppercase text-center tracking-widest">Dimensões</th>
                                  <th className="p-4 text-[9px] font-black uppercase text-center tracking-widest">Qtd</th>
                                  <th className="p-4 text-[9px] font-black uppercase text-right tracking-widest">V. Unit</th>
                                  <th className="p-4 text-[9px] font-black uppercase text-right tracking-widest">Subtotal</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                               {currentQuote?.items?.map((it, i) => (
                                 <tr key={i} className="hover:bg-slate-50/50 transition-all">
                                    <td className="p-4">
                                       <p className="text-xs font-black uppercase text-slate-900 leading-none mb-1.5">{it.productName}</p>
                                       <div className="flex flex-wrap gap-2">
                                          {it.finishName && <span className="text-[7px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase italic">Acabamento: {it.finishName}</span>}
                                          {it.supplies && it.supplies.length > 0 && (
                                            <span className="text-[7px] font-bold text-slate-400 uppercase italic">
                                               Inclui: {it.supplies.map(s => s.name).join(', ')}
                                            </span>
                                          )}
                                       </div>
                                    </td>
                                    <td className="p-4 text-center text-[10px] font-black text-slate-500 uppercase">
                                       {it.length && it.width ? `${it.length}x${it.width}` : '-'} <small>cm</small> 
                                    </td>
                                    <td className="p-4 text-center text-[10px] font-black text-slate-900">{it.quantity}</td>
                                    <td className="p-4 text-right text-[10px] font-bold text-slate-500">{formatarMoeda(it.salesPrice)}</td>
                                    <td className="p-4 text-right text-xs font-black text-slate-900">{formatarMoeda(it.total)}</td>
                                 </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>

                      {/* Summary & Footer */}
                      <div className="grid grid-cols-12 gap-10">
                         <div className="col-span-7 space-y-8">
                            <div>
                               <h4 className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Informações de Pagamento</h4>
                               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                  <p className="text-[11px] font-black text-slate-900 uppercase leading-snug mb-2">{currentQuote?.paymentTerms || 'Consultar condições com o vendedor'}</p>
                                  <div className="flex items-center gap-4">
                                     {profile?.pixKey && (
                                        <>
                                           <img 
                                              src={`https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(profile.pixKey)}&chs=100x100&chld=L|1`} 
                                              alt="Pix"
                                              className="w-14 h-14 rounded-lg bg-white p-1"
                                              crossOrigin="anonymous"
                                           />
                                           <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight">Pagamento facilitado via PIX<br/><small className="text-[#0D4C4F] font-black lowercase">{profile.pixKey}</small></p>
                                        </>
                                     )}
                                  </div>
                               </div>
                            </div>
                            <div>
                               <h4 className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Observações Técnicas</h4>
                               <p className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed italic pr-6 text-wrap">
                                  {currentQuote?.technicalObservations || 'Os preços podem sofrer alterações conforme as medidas finais na obra. Prazo de entrega contado a partir da aprovação e medição técnica.'}
                                </p>
                            </div>
                         </div>

                         <div className="col-span-5 flex flex-col justify-end">
                            <div className="bg-slate-900 text-white p-8 rounded-[3rem] space-y-4 mb-10 shadow-xl">
                               <div className="flex justify-between text-[10px] font-black uppercase text-white/40">
                                  <span>Subtotal</span>
                                  <span>{formatarMoeda(currentQuote?.subtotal || 0)}</span>
                               </div>
                               <div className="flex justify-between text-[10px] font-black uppercase text-rose-400">
                                  <span>Desconto Especial</span>
                                  <span>-{formatarMoeda(currentQuote?.discountAmount || 0)}</span>
                               </div>
                               <div className="pt-4 border-t border-white/10 flex justify-between items-end mb-1">
                                  <div className="text-[10px] font-black uppercase text-white tracking-widest">Total Orçado</div>
                                  <div className="text-3xl font-black text-emerald-400 tracking-tighter leading-none">{formatarMoeda(currentQuote?.total || 0)}</div>
                               </div>
                               <p className="text-[7px] text-white/30 uppercase font-black italic text-right leading-tight tracking-wider">({valorPorExtenso(currentQuote?.total || 0)})</p>
                            </div>

                            <div className="text-center pt-8 border-t border-slate-100 flex flex-col items-center">
                               <div className="w-48 h-[1px] bg-slate-300 mb-2"></div>
                               <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-0.5">{currentQuote?.clientName}</p>
                               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Compromisso e Aceite do Cliente</p>
                            </div>
                         </div>
                      </div>

                      <div className="absolute bottom-12 left-12 right-12 flex justify-between items-center text-[7px] font-black text-slate-300 uppercase tracking-[0.4em]">
                         <span>MARMOFAST PRO - TECNOLOGIA EM MARMORARIA</span>
                         <span>DOC REF: {currentQuote?.id?.slice(-8) || 'N/A'}</span>
                      </div>
                   </div>
                </div>

                <div className="bg-white p-12 rounded-[4.5rem] shadow-sm border border-slate-100 space-y-10">
                   <div className="flex items-center gap-4">
                      <div className="w-2 h-8 bg-[#0D4C4F] rounded-full"></div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Dados do Orçamento</h3>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-4 mb-3 block tracking-widest">Nome do Cliente / Obra</label>
                         <input className="w-full bg-slate-50 border-none rounded-3xl px-8 py-6 font-black uppercase text-sm outline-none shadow-inner focus:ring-2 focus:ring-[#0D4C4F]" placeholder="EX: RESIDENCIAL ALTA VISTA" value={currentQuote?.clientName || ''} onChange={e => setCurrentQuote({...currentQuote!, clientName: e.target.value.toUpperCase()})} />
                      </div>
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-4 mb-3 block tracking-widest">WhatsApp / Telefone</label>
                         <input className="w-full bg-slate-50 border-none rounded-3xl px-8 py-6 font-black text-sm outline-none shadow-inner focus:ring-2 focus:ring-[#0D4C4F]" placeholder="(00) 00000-0000" value={currentQuote?.whatsapp || ''} onChange={e => setCurrentQuote({...currentQuote!, whatsapp: e.target.value})} />
                      </div>
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-4 mb-3 block tracking-widest">Status da Negociação</label>
                         <select className="w-full bg-slate-50 border-none rounded-3xl px-8 py-6 font-black uppercase text-sm outline-none shadow-inner focus:ring-2 focus:ring-[#0D4C4F]" value={currentQuote?.status} onChange={e => setCurrentQuote({...currentQuote!, status: e.target.value as Quote['status']})}>
                            <option value="Em Aberto">Em Aberto</option>
                            <option value="Aprovado">Aprovado</option>
                            <option value="Finalizado">Finalizado</option>
                            <option value="Cancelado">Cancelado</option>
                         </select>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-4 mb-3 block tracking-widest">Endereço de Cobrança</label>
                         <input className="w-full bg-slate-50 border-none rounded-3xl px-8 py-6 font-black uppercase text-sm outline-none shadow-inner focus:ring-2 focus:ring-[#0D4C4F]" placeholder="RUA, NÚMERO, BAIRRO, CIDADE" value={currentQuote?.address || ''} onChange={e => setCurrentQuote({...currentQuote!, address: e.target.value.toUpperCase()})} />
                      </div>
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-4 mb-3 block tracking-widest">Endereço da Obra</label>
                         <input className="w-full bg-slate-50 border-none rounded-3xl px-8 py-6 font-black uppercase text-sm outline-none shadow-inner focus:ring-2 focus:ring-[#0D4C4F]" placeholder="MESMO QUE COBRANÇA OU OUTRO" value={currentQuote?.workAddress || ''} onChange={e => setCurrentQuote({...currentQuote!, workAddress: e.target.value.toUpperCase()})} />
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="flex justify-between items-center px-6">
                         <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Itens do Projeto</h4>
                         <button onClick={() => {
                            const p = products[0];
                            if (p) {
                              const newItem: QuoteItem = {
                                id: Math.random().toString(), productId: p.id, productName: p.name, unit: p.unit, costPrice: p.cost, salesPrice: p.salesPrice, quantity: 1, total: p.salesPrice, executionTime: 2, isManualQty: false
                              };
                              setCurrentQuote(syncQuote({...currentQuote!, items: [...(currentQuote?.items || []), newItem]}));
                            }
                         }} className="text-[10px] font-black uppercase text-[#0D4C4F] bg-slate-50 px-6 py-3 rounded-full hover:bg-slate-100 transition-all shadow-sm">+ Adicionar Novo Item</button>
                      </div>
                      
                      <div className="space-y-4">
                         {currentQuote?.items?.map(it => (
                           <div key={it.id} className="flex flex-col md:flex-row justify-between items-center p-8 bg-slate-50 rounded-[3rem] border border-slate-100 gap-8 group hover:bg-white hover:shadow-xl transition-all">
                              <div className="flex-grow min-w-0">
                                 <span className="text-[9px] font-black text-slate-300 uppercase block mb-2 tracking-widest">Material / Serviço</span>
                                 <select 
                                    className="w-full bg-transparent font-black text-sm uppercase outline-none"
                                    value={it.productId}
                                    onChange={e => {
                                       const prod = products.find(p => p.id === e.target.value);
                                       if (prod) {
                                          const updatedItems = currentQuote.items?.map(item => item.id === it.id ? {
                                             ...item, productId: prod.id, productName: prod.name, unit: prod.unit, costPrice: prod.cost, salesPrice: prod.salesPrice
                                          } : item);
                                          setCurrentQuote(syncQuote({...currentQuote!, items: updatedItems}));
                                       }
                                    }}
                                 >
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                 </select>
                              </div>
                              <div className="grid grid-cols-3 gap-6">
                                 <div>
                                    <label className="text-[8px] font-black text-slate-400 uppercase block mb-2 tracking-widest text-center">Comp.</label>
                                    <input type="number" className="w-full bg-white rounded-2xl p-3 font-black text-sm text-center shadow-sm border-none outline-none" value={it.length} onChange={e => {
                                       const updated = currentQuote.items?.map(item => item.id === it.id ? {...item, length: parseFloat(e.target.value)||0} : item);
                                       setCurrentQuote(syncQuote({...currentQuote!, items: updated}));
                                    }} />
                                 </div>
                                 <div>
                                    <label className="text-[8px] font-black text-slate-400 uppercase block mb-2 tracking-widest text-center">Larg.</label>
                                    <input type="number" className="w-full bg-white rounded-2xl p-3 font-black text-sm text-center shadow-sm border-none outline-none" value={it.width} onChange={e => {
                                       const updated = currentQuote.items?.map(item => item.id === it.id ? {...item, width: parseFloat(e.target.value)||0} : item);
                                       setCurrentQuote(syncQuote({...currentQuote!, items: updated}));
                                    }} />
                                 </div>
                                 <div>
                                    <label className="text-[8px] font-black text-slate-400 uppercase block mb-2 tracking-widest text-center">Qtd</label>
                                    <input type="number" className="w-full bg-white rounded-2xl p-3 font-black text-sm text-center shadow-sm border-none outline-none" value={it.quantity} onChange={e => {
                                       const updated = currentQuote.items?.map(item => item.id === it.id ? {...item, quantity: parseFloat(e.target.value)||0} : item);
                                       setCurrentQuote(syncQuote({...currentQuote!, items: updated}));
                                    }} />
                                 </div>
                              </div>
                              <div className="text-right min-w-[140px]">
                                 <span className="text-[9px] font-black text-slate-300 uppercase block mb-2 tracking-widest">Subtotal</span>
                                 <div className="text-lg font-black text-[#0D4C4F]">{formatarMoeda(it.total)}</div>
                              </div>
                              <button onClick={() => {
                                 const updated = currentQuote.items?.filter(item => item.id !== it.id);
                                 setCurrentQuote(syncQuote({...currentQuote!, items: updated}));
                              }} className="text-rose-500 font-black text-2xl hover:scale-125 transition-all px-4">×</button>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
             </div>

             <div className="lg:col-span-4 space-y-10">
                <div className="bg-[#0D4C4F] p-12 rounded-[4.5rem] text-white shadow-2xl space-y-12 border-8 border-white sticky top-36">
                   <div>
                      <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.4em] block mb-4">Valor Total do Pedido</span>
                      <div className="text-7xl font-black tracking-tighter leading-none">{formatarMoeda(currentQuote?.total || 0)}</div>
                   </div>

                   <div className="pt-12 border-t border-white/10 space-y-8">
                      <div className="flex justify-between items-end">
                         <div>
                            <span className="text-[10px] font-black text-white/40 uppercase block mb-2 tracking-widest">Margem de Lucro</span>
                            <div className={`text-3xl font-black uppercase tracking-tighter ${currentQuote?.financials && currentQuote.financials.margin < 20 ? 'text-rose-400' : 'text-emerald-400'}`}>
                               {currentQuote?.financials?.margin.toFixed(1)}%
                            </div>
                         </div>
                         <div className="text-right">
                            <span className="text-[10px] font-black text-white/40 uppercase block mb-2 tracking-widest">Lucro Líquido</span>
                            <div className="text-3xl font-black text-emerald-400 tracking-tighter">{formatarMoeda(currentQuote?.financials?.profit || 0)}</div>
                         </div>
                      </div>
                      <div className="h-3 bg-white/10 rounded-full overflow-hidden border border-white/5 shadow-inner">
                         <div className={`h-full rounded-full transition-all duration-1000 shadow-lg ${currentQuote?.financials && currentQuote.financials.margin < 20 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, ((currentQuote?.financials?.margin || 0) / 40) * 100)}%` }}></div>
                      </div>
                   </div>

                   <div className="space-y-5">
                      <div className="flex justify-between text-[11px] font-black uppercase text-white/40 tracking-widest">
                         <span>Custo Direto:</span>
                         <span className="text-white">{formatarMoeda(currentQuote?.financials?.directCost || 0)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-black uppercase text-white/40 tracking-widest">
                         <span>Impostos (MEI):</span>
                         <span className="text-white">{formatarMoeda(currentQuote?.financials?.taxes || 0)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-black uppercase text-white/40 tracking-widest">
                         <span>Custo Fixo:</span>
                         <span className="text-white">{formatarMoeda(currentQuote?.financials?.fixedCostRateio || 0)}</span>
                      </div>
                   </div>
                </div>

                <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm space-y-8">
                   <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                      <span className="w-2 h-4 bg-amber-500 rounded-full"></span> Condições de Venda
                   </h4>
                   <div className="space-y-6">
                      <div>
                         <label className="text-[9px] font-black text-slate-300 uppercase block mb-2 tracking-widest">Prazo de Entrega Estimado</label>
                         <input className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-[11px] uppercase shadow-inner" value={currentQuote?.estimatedDeadline} onChange={e => setCurrentQuote({...currentQuote!, estimatedDeadline: e.target.value})} />
                      </div>
                      <div>
                         <label className="text-[9px] font-black text-slate-300 uppercase block mb-2 tracking-widest">Condições de Pagamento</label>
                         <input className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-[11px] uppercase shadow-inner" value={currentQuote?.paymentTerms} onChange={e => setCurrentQuote({...currentQuote!, paymentTerms: e.target.value})} />
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
