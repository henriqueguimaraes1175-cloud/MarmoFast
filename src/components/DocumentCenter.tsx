
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Quote, QuoteDocument, CompanyProfile } from '../types';
import { storageService } from '../services/storageService';
import { formatarMoeda } from '../utils/formatters';

export const DocumentCenter: React.FC<{ showToast: (m: string, t?: 'success' | 'error' | 'info') => void }> = ({ showToast }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [search, setSearch] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const [q, p] = await Promise.all([
        storageService.getQuotes(),
        storageService.getProfile()
      ]);
      setQuotes(q.filter(quote => quote.status === 'Aprovado' || quote.status === 'Finalizado'));
      setProfile(p);
    };
    loadData();
  }, []);

  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => 
      q.clientName.toLowerCase().includes(search.toLowerCase()) || 
      q.number.includes(search)
    );
  }, [quotes, search]);

  const handleAddReceipt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedQuote) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      const newDoc: QuoteDocument = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: 'receipt',
        url: base64,
        date: new Date().toLocaleDateString('pt-BR'),
        amount: 0 // Could ask for amount
      };

      const updatedQuote = {
        ...selectedQuote,
        documents: [...(selectedQuote.documents || []), newDoc]
      };

      const allQuotes = await storageService.getQuotes();
      const updatedAll = allQuotes.map(q => q.id === updatedQuote.id ? updatedQuote : q);
      await storageService.saveQuotes(updatedAll, updatedQuote);
      
      setSelectedQuote(updatedQuote);
      setQuotes(updatedAll.filter(quote => quote.status === 'Aprovado' || quote.status === 'Finalizado'));
      showToast("Recibo anexado com sucesso!", "success");
    };
    reader.readAsDataURL(file);
  };

  const generateContract = async () => {
    if (!selectedQuote) return;
    
    setIsGeneratingContract(true);
    showToast("Gerando Contrato, aguarde...", "info");
    
    const element = document.getElementById(`contract-pdf-${selectedQuote.id}`);
    if (!element) {
      setIsGeneratingContract(false);
      showToast("Erro: Template de contrato não encontrado.", "error");
      return;
    }

    const opt = {
      margin: 10,
      filename: `Contrato_${selectedQuote.number}_${selectedQuote.clientName.replace(/[^a-z0-9]/gi, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true,
        scrollY: 0,
        windowWidth: 210 * 3.78,
        windowHeight: 297 * 3.78
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      // @ts-expect-error html2pdf is in global scope
      await html2pdf().set(opt).from(element).save();
      
      const contractId = `contract-${selectedQuote.id}`;
      const newDoc: QuoteDocument = {
        id: contractId,
        name: `Contrato_${selectedQuote.number}.pdf`,
        type: 'contract',
        url: '#', // We don't store the blob in storage usually unless using a cloud provider
        date: new Date().toLocaleDateString('pt-BR')
      };

      const updatedQuote = {
        ...selectedQuote,
        documents: [...(selectedQuote.documents || []).filter(d => d.id !== contractId), newDoc]
      };

      const allQuotes = await storageService.getQuotes();
      const updatedAll = allQuotes.map(q => q.id === updatedQuote.id ? updatedQuote : q);
      await storageService.saveQuotes(updatedAll, updatedQuote);
      
      setSelectedQuote(updatedQuote);
      setQuotes(updatedAll.filter(quote => quote.status === 'Aprovado' || quote.status === 'Finalizado'));
      showToast("Contrato gerado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao gerar contrato:", error);
      showToast("Erro ao gerar contrato PDF.", "error");
    } finally {
      setIsGeneratingContract(false);
    }
  };

  const totalPaid = useMemo(() => {
    if (!selectedQuote) return 0;
    return (selectedQuote.documents || [])
      .filter(d => d.type === 'receipt')
      .reduce((acc, d) => acc + (d.amount || 0), 0);
  }, [selectedQuote]);

  return (
    <div className="space-y-10 animate-in pb-20 max-w-7xl mx-auto px-4">
      <div className="flex flex-col gap-3">
        <h2 className="text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">Central de Documentos</h2>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-3">Gestão de Contratos, Recibos e Comprovantes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar: Quote Selection */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
            <input 
              className="w-full bg-slate-50 rounded-2xl px-6 py-4 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-[#0D4C4F]/20"
              placeholder="Buscar Cliente ou Orçamento..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-hide">
            {filteredQuotes.map(q => (
              <button 
                key={q.id}
                onClick={() => setSelectedQuote(q)}
                className={`w-full p-8 rounded-[2.5rem] border transition-all text-left flex flex-col gap-2 ${selectedQuote?.id === q.id ? 'bg-[#0D4C4F] text-white border-[#0D4C4F] shadow-xl scale-[1.02]' : 'bg-white text-slate-900 border-slate-100 hover:border-[#0D4C4F]/30'}`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[8px] font-black uppercase tracking-widest ${selectedQuote?.id === q.id ? 'text-white/50' : 'text-slate-300'}`}>#{q.number}</span>
                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${q.status === 'Aprovado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>{q.status}</span>
                </div>
                <span className="text-sm font-black uppercase truncate">{q.clientName}</span>
                <span className={`text-xs font-bold ${selectedQuote?.id === q.id ? 'text-white/70' : 'text-slate-400'}`}>{formatarMoeda(q.total)}</span>
              </button>
            ))}
            {filteredQuotes.length === 0 && (
              <div className="py-20 text-center opacity-20 font-black uppercase text-[10px] tracking-widest">Nenhum orçamento aprovado encontrado</div>
            )}
          </div>
        </div>

        {/* Main Area: Document Management */}
        <div className="lg:col-span-8">
          {selectedQuote ? (
            <div className="space-y-8 animate-in">
               <div style={{ position: 'fixed', top: '200vh', left: '0', pointerEvents: 'none', zIndex: -100, opacity: 0 }}>
                 <div id={`contract-pdf-${selectedQuote.id}`} className="bg-white p-16 text-slate-900" style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
                    <div className="flex justify-between items-start border-b-4 border-[#0D4C4F] pb-10 mb-10">
                       <div>
                          {profile?.logo && <img src={profile.logo} alt="Logo" className="h-20 mb-6 object-contain" referrerPolicy="no-referrer" />}
                          <h1 className="text-4xl font-black text-[#0D4C4F] uppercase tracking-tighter leading-tight">{profile?.name || 'MARMORARIA'}</h1>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{profile?.address}</p>
                       </div>
                       <div className="text-right">
                          <h2 className="text-2xl font-black uppercase tracking-tighter">Instrumento Particular de Contrato</h2>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">Ref: Orçamento #{selectedQuote.number}</p>
                       </div>
                    </div>

                    <div className="space-y-8 text-xs leading-relaxed text-justify">
                       <p>
                          Pelo presente instrumento particular, de um lado <strong>{profile?.name || 'MARMORARIA'}</strong>, inscrito sob o e-mail {profile?.email}, 
                          adiante denominada contratada, e de outro lado <strong>{selectedQuote.clientName}</strong>, 
                          inscrito no endereço {selectedQuote.address || 'Não Informado'}, adiante denominado contratante, 
                          têm entre si justo e contratado o que segue:
                       </p>

                       <h3 className="text-base font-black uppercase border-l-4 border-[#0D4C4F] pl-4">Cláusula 1ª - Do Objeto</h3>
                       <p>
                          O presente contrato tem por objeto a fabricação e instalação dos seguintes materiais constantes no orçamento #{selectedQuote.number}:
                       </p>
                       <table className="w-full border-collapse">
                          <thead>
                             <tr className="bg-slate-50">
                                <th className="p-3 text-left border border-slate-200">Item</th>
                                <th className="p-3 text-center border border-slate-200">Dimensões</th>
                                <th className="p-3 text-center border border-slate-200">Qtd</th>
                             </tr>
                          </thead>
                          <tbody>
                             {selectedQuote.items.map((it, i) => (
                               <tr key={i}>
                                  <td className="p-3 border border-slate-200 font-bold">{it.productName}</td>
                                  <td className="p-3 border border-slate-200 text-center">{it.length && it.width ? `${it.length}x${it.width}cm` : '-'}</td>
                                  <td className="p-3 border border-slate-200 text-center">{it.quantity}</td>
                               </tr>
                             ))}
                          </tbody>
                       </table>

                       <h3 className="text-base font-black uppercase border-l-4 border-[#0D4C4F] pl-4">Cláusula 2ª - Do Valor e Pagamento</h3>
                       <p>
                          Pela execução do objeto deste contrato, o contratante pagará à contratada a importância total de <strong>{formatarMoeda(selectedQuote.total)}</strong>. 
                          As condições de pagamento acordadas são: <strong>{selectedQuote.paymentTerms || 'A combinar'}</strong>.
                       </p>

                       <h3 className="text-base font-black uppercase border-l-4 border-[#0D4C4F] pl-4">Cláusula 3ª - Do Prazo</h3>
                       <p>
                          O prazo estimado para entrega e instalação dos materiais é de <strong>{selectedQuote.estimatedDeadline || '15 dias úteis'}</strong>, 
                          contados a partir da aprovação técnica e medição final.
                       </p>

                       <div className="pt-20 grid grid-cols-2 gap-20">
                          <div className="text-center pt-8 border-t border-slate-300">
                             <p className="font-black uppercase">{profile?.name}</p>
                             <p className="text-[10px] text-slate-400">Contratada</p>
                          </div>
                          <div className="text-center pt-8 border-t border-slate-300">
                             <p className="font-black uppercase">{selectedQuote.clientName}</p>
                             <p className="text-[10px] text-slate-400">Contratante</p>
                          </div>
                       </div>

                       <div className="mt-20 text-center opacity-30 italic">
                          <p>Documento gerado digitalmente em {new Date().toLocaleDateString('pt-BR')}</p>
                       </div>
                    </div>
                 </div>
               </div>

              {/* Financial Status Card */}
              <div className="bg-slate-900 p-12 rounded-[4.5rem] text-white shadow-2xl relative overflow-hidden border-8 border-white">
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div>
                    <span className="text-[10px] font-black text-white/40 uppercase block mb-2 tracking-widest">Valor Total</span>
                    <div className="text-3xl font-black">{formatarMoeda(selectedQuote.total)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-emerald-400 uppercase block mb-2 tracking-widest">Total Pago</span>
                    <div className="text-3xl font-black text-emerald-400">{formatarMoeda(totalPaid)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-rose-400 uppercase block mb-2 tracking-widest">Saldo Pendente</span>
                    <div className="text-3xl font-black text-rose-400">{formatarMoeda(selectedQuote.total - totalPaid)}</div>
                  </div>
                </div>
                <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  onClick={generateContract}
                  disabled={isGeneratingContract}
                  className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center gap-4 hover:border-[#0D4C4F] transition-all group"
                >
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-[#0D4C4F] group-hover:text-white transition-all">🖋️</div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-900">Gerar Contrato Pro</h4>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Gera PDF com cláusulas e itens</p>
                  </div>
                </button>

                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center gap-4 hover:border-emerald-500 transition-all group"
                >
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-emerald-500 group-hover:text-white transition-all">📸</div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-900">Anexar Recibo/Foto</h4>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Comprovantes de PIX ou Fotos</p>
                  </div>
                </button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleAddReceipt} accept="image/*,.pdf" />
              </div>

              {/* Documents List */}
              <div className="bg-white p-12 rounded-[4.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-4">
                  <span className="w-2 h-6 bg-[#0D4C4F] rounded-full"></span> Documentos do Projeto
                </h3>
                
                <div className="space-y-4">
                  {(selectedQuote.documents || []).length > 0 ? (
                    (selectedQuote.documents || []).map(doc => (
                      <div key={doc.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm">
                            {doc.type === 'contract' ? '📄' : doc.type === 'receipt' ? '💰' : '🖼️'}
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-slate-900 uppercase block">{doc.name}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase">{doc.date} • {doc.type}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="p-3 bg-white rounded-xl text-slate-400 hover:text-[#0D4C4F] hover:shadow-md transition-all">👁️</button>
                          <button className="p-3 bg-white rounded-xl text-slate-400 hover:text-rose-500 hover:shadow-md transition-all">🗑️</button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center opacity-20 flex flex-col items-center gap-4">
                      <span className="text-6xl">📂</span>
                      <p className="font-black uppercase tracking-widest text-[10px]">Nenhum documento anexado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20 space-y-6 py-40">
              <span className="text-9xl">🖋️</span>
              <div>
                <h3 className="text-xl font-black uppercase tracking-widest">Selecione um Orçamento</h3>
                <p className="text-xs font-bold uppercase mt-2">Para gerenciar contratos e recibos</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentCenter;
