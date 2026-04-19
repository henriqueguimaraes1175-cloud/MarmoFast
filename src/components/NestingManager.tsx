
import React, { useState, useEffect, useMemo } from 'react';
import { StockItem, NestingPart, Quote, CompanyProfile } from '../types';
import { storageService } from '../services/storageService';

interface PlacedPart extends NestingPart {
  x: number;
  y: number;
  shelfId: number;
}

interface NestingShelf {
  id: number;
  y: number;
  height: number;
  usedWidth: number;
}

export const NestingManager: React.FC<{ showToast: (m: string, t?: 'success' | 'error' | 'info') => void }> = ({ showToast }) => {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [parts, setParts] = useState<NestingPart[]>([]);
  const [placedParts, setPlacedParts] = useState<PlacedPart[]>([]);
  const [unplacedParts, setUnplacedParts] = useState<NestingPart[]>([]);
  const [shelves, setShelves] = useState<NestingShelf[]>([]);
  const [newPart, setNewPart] = useState({ name: '', width: 100, height: 60, quantity: 1 });
  const [kerf, setKerf] = useState(0.5);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [efficiency, setEfficiency] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const [s, q, p] = await Promise.all([
        storageService.getStock(),
        storageService.getQuotes(),
        storageService.getProfile()
      ]);
      setStock(s);
      setQuotes(q);
      setProfile(p);
    };
    loadData();
    window.addEventListener('quotesUpdated', loadData);
    return () => window.removeEventListener('quotesUpdated', loadData);
  }, []);

  const selectedSheet = useMemo(() => stock.find(s => s.id === selectedSheetId), [stock, selectedSheetId]);

  const addPart = () => {
    if (!newPart.name || newPart.width <= 0 || newPart.height <= 0) {
      showToast("Preencha os dados da peça corretamente.", "error");
      return;
    }
    const part: NestingPart = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPart.name.toUpperCase(),
      width: newPart.width,
      height: newPart.height,
      quantity: newPart.quantity,
      allowRotation: true,
      grain: 'none',
      color: `hsl(${Math.random() * 360}, 70%, 40%)`
    };
    setParts([...parts, part]);
    setNewPart({ name: '', width: 100, height: 60, quantity: 1 });
    showToast("Peça adicionada ao plano.");
  };

  const importFromQuote = (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;

    // Remove any filters that might block valid pieces
    const newParts: NestingPart[] = quote.items
      .filter(it => it.quantity > 0) // Only ignore items with 0 quantity
      .map(it => {
        // Robust value parsing
        const w = Number(it.length) || Number(it.width) || 1;
        const h = Number(it.width) || Number(it.length) || 1;
        
        return {
          id: Math.random().toString(36).substr(2, 9),
          name: it.productName.toUpperCase(),
          width: Math.max(w, h), // Standardize: width is the longer side initially
          height: Math.min(w, h), 
          quantity: it.quantity,
          allowRotation: true,
          grain: 'none',
          color: `hsl(${Math.random() * 360}, 70%, 40%)`
        };
      });

    setParts([...parts, ...newParts]);
    showToast(`${newParts.length} itens importados. Verifique se as medidas estão corretas.`);
  };

  const handleOptimize = () => {
    if (!selectedSheet) {
      showToast("Selecione uma chapa no estoque primeiro.", "error");
      return;
    }
    if (parts.length === 0) {
      showToast("Adicione pelo menos uma peça para cortar.", "error");
      return;
    }

    setIsOptimizing(true);
    
    // Best Fit Decreasing Height (BFDH) Algorithm
    setTimeout(() => {
      const sheetW = selectedSheet.width;
      const sheetH = selectedSheet.height;
      const currentKerf = kerf;
      
      const allPartsToPlace: NestingPart[] = [];
      parts.forEach(p => {
        for(let i=0; i<p.quantity; i++) {
          allPartsToPlace.push({...p, quantity: 1});
        }
      });

      // Sort by height descending
      allPartsToPlace.sort((a, b) => b.height - a.height);

      const generatedShelves: NestingShelf[] = [];
      const placed: PlacedPart[] = [];
      let totalAreaUsed = 0;
      let currentY = 0;

      for (const p of allPartsToPlace) {
        let bestShelfIndex = -1;
        let minRemainingWidth = Infinity;
        let bestRotation = false;

        // 1. Try to find the best existing shelf
        for (let i = 0; i < generatedShelves.length; i++) {
          const shelf = generatedShelves[i];
          
          const fitNormal = p.height <= shelf.height && p.width <= sheetW - shelf.usedWidth;
          const fitRotated = p.allowRotation && p.width <= shelf.height && p.height <= sheetW - shelf.usedWidth;

          if (fitNormal && fitRotated) {
            // Both fit, pick one that uses less height in shelf if it were a new shelf, 
            // but here height is fixed by the shelf. So pick one that leaves more width? 
            // Actually standard BFDH doesn't rotate in existing shelves much, but let's be smart.
            if (p.width < p.height) { // Normal orientation is thinner
               const remaining = sheetW - (shelf.usedWidth + p.width);
               if (remaining < minRemainingWidth) {
                 minRemainingWidth = remaining;
                 bestShelfIndex = i;
                 bestRotation = false;
               }
            } else { // Rotated is thinner
               const remaining = sheetW - (shelf.usedWidth + p.height);
               if (remaining < minRemainingWidth) {
                 minRemainingWidth = remaining;
                 bestShelfIndex = i;
                 bestRotation = true;
               }
            }
          } else if (fitNormal) {
            const remaining = sheetW - (shelf.usedWidth + p.width);
            if (remaining < minRemainingWidth) {
              minRemainingWidth = remaining;
              bestShelfIndex = i;
              bestRotation = false;
            }
          } else if (fitRotated) {
            const remaining = sheetW - (shelf.usedWidth + p.height);
            if (remaining < minRemainingWidth) {
              minRemainingWidth = remaining;
              bestShelfIndex = i;
              bestRotation = true;
            }
          }
        }

        if (bestShelfIndex !== -1) {
          const shelf = generatedShelves[bestShelfIndex];
          const w = bestRotation ? p.height : p.width;
          const h = bestRotation ? p.width : p.height;
          
          placed.push({
            ...p,
            x: Number(shelf.usedWidth.toFixed(2)),
            y: Number(shelf.y.toFixed(2)),
            width: w,
            height: h,
            shelfId: shelf.id
          });
          
          shelf.usedWidth += w + currentKerf;
          totalAreaUsed += w * h;
        } else {
          // 2. New shelf
          let w = p.width;
          let h = p.height;
          let canFit = false;

          const fitNormal = p.width <= sheetW && currentY + p.height <= sheetH;
          const fitRotated = p.allowRotation && p.height <= sheetW && currentY + p.width <= sheetH;

          if (fitNormal && fitRotated) {
            // Pick orientation that results in SHORTER shelf height to save Y space
            if (p.height <= p.width) {
              w = p.width; h = p.height;
            } else {
              w = p.height; h = p.width;
            }
            canFit = true;
          } else if (fitNormal) {
            w = p.width; h = p.height;
            canFit = true;
          } else if (fitRotated) {
            w = p.height; h = p.width;
            canFit = true;
          }

          if (canFit) {
            const newShelfId = generatedShelves.length + 1;
            generatedShelves.push({
              id: newShelfId,
              y: Number(currentY.toFixed(2)),
              height: Number(h.toFixed(2)),
              usedWidth: Number((w + currentKerf).toFixed(2))
            });
            
            placed.push({
              ...p,
              x: 0,
              y: Number(currentY.toFixed(2)),
              width: w,
              height: h,
              shelfId: newShelfId
            });
            
            totalAreaUsed += w * h;
            currentY += h + currentKerf;
          }
        }
      }

      setPlacedParts(placed);
      setShelves(generatedShelves);
      setEfficiency((totalAreaUsed / (sheetW * sheetH)) * 100);
      
      const leftovers = allPartsToPlace.filter(p => !placed.some(placedP => placedP.id === p.id));
      // Since allPartsToPlace has quantity:1, we should group them back for the unplaced list
      const groupedUnplaced: NestingPart[] = [];
      leftovers.forEach(l => {
        const existing = groupedUnplaced.find(g => g.name === l.name && g.width === l.width && g.height === l.height);
        if (existing) existing.quantity++;
        else groupedUnplaced.push({...l, quantity: 1});
      });
      setUnplacedParts(groupedUnplaced);
      
      setIsOptimizing(false);
      
      if (placed.length < allPartsToPlace.length) {
        showToast(`Atenção: ${allPartsToPlace.length - placed.length} peças não couberam.`, "info");
      } else {
        showToast("Plano otimizado!", "success");
      }
    }, 800);
  };

  const generatePDF = async () => {
    if (!selectedSheet || placedParts.length === 0) {
      showToast("Gere um plano de corte primeiro.", "error");
      return;
    }

    showToast("Gerando PDF do Plano de Corte...", "info");
    const element = document.getElementById('nesting-pdf-content');
    if (!element) return;

    const opt = {
      margin: 10,
      filename: `Plano_de_Corte_${selectedSheet.materialName.replace(/[^a-z0-9]/gi, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: false,
        letterRendering: true
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    try {
      // @ts-expect-error html2pdf is in global scope
      await html2pdf().set(opt).from(element).save();
      showToast("Plano de Corte exportado!", "success");
    } catch (error) {
      console.error(error);
      showToast("Erro ao gerar PDF.", "error");
    }
  };

  return (
    <div className="space-y-8 animate-in pb-20 max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">Plano de Corte</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-3">Engenharia de Aproveitamento de Chapas</p>
        </div>
        <div className="flex gap-4">
           {placedParts.length > 0 && (
             <button onClick={generatePDF} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all flex items-center gap-3">
               📄 Exportar PDF
             </button>
           )}
           <button onClick={() => { setParts([]); setPlacedParts([]); setEfficiency(0); }} className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase border border-slate-200 text-slate-400 hover:bg-slate-50 transition-all">Limpar Tudo</button>
           <button onClick={handleOptimize} className="bg-[#0D4C4F] text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-2xl hover:scale-105 transition-all flex items-center gap-3">
              {isOptimizing ? '⚙️ Otimizando...' : '📐 Gerar Plano'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8">
             <div className="flex items-center gap-3">
                <div className="w-2 h-6 bg-[#0D4C4F] rounded-full"></div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">1. Seleção de Chapa</h3>
             </div>
             <select 
               className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 font-black text-xs uppercase outline-none shadow-inner"
               value={selectedSheetId}
               onChange={e => setSelectedSheetId(e.target.value)}
             >
               <option value="">BUSCAR NO ESTOQUE...</option>
               {stock.map(s => <option key={s.id} value={s.id}>{s.materialName} ({s.width}x{s.height}cm)</option>)}
             </select>
             
             {selectedSheet && (
               <div className="bg-[#0D4C4F] p-8 rounded-[2.5rem] text-white space-y-6 relative overflow-hidden border-4 border-white shadow-xl">
                 <div className="relative z-10">
                   <div className="mb-6">
                     <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-2">Espessura do Disco (cm)</span>
                     <input 
                       type="number" 
                       step="0.1" 
                       className="w-full bg-white/10 border-none rounded-xl px-4 py-2 font-black text-xs outline-none text-white focus:ring-1 focus:ring-white/30"
                       value={kerf}
                       onChange={e => setKerf(parseFloat(e.target.value) || 0)}
                     />
                   </div>
                   <div>
                     <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-1">Área Bruta da Chapa</span>
                     <div className="text-4xl font-black tracking-tighter">{(selectedSheet.width * selectedSheet.height / 10000).toFixed(2)} m²</div>
                     <div className="flex gap-4 mt-4">
                        <div className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase">L: {selectedSheet.width}cm</div>
                        <div className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase">A: {selectedSheet.height}cm</div>
                     </div>
                   </div>
                 </div>
               </div>
             )}
          </div>

          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8">
             <div className="flex items-center gap-3">
                <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Importar de Orçamento</h3>
             </div>
             <select 
               className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 font-black text-xs uppercase outline-none shadow-inner"
               onChange={e => importFromQuote(e.target.value)}
               value=""
             >
              <option value="">SELECIONE UM ORÇAMENTO...</option>
              {quotes.filter(q => ['Aprovado', 'Em Aberto', 'Finalizado'].includes(q.status)).map(q => (
                <option key={q.id} value={q.id}>#{q.number} - {q.clientName} ({q.status})</option>
              ))}
             </select>
          </div>

          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8">
             <div className="flex items-center gap-3">
                <div className="w-2 h-6 bg-amber-500 rounded-full"></div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">2. Adicionar Peças Manuais</h3>
             </div>
             <div className="space-y-4">
                <input className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-xs uppercase outline-none" placeholder="EX: BANCADA COZINHA" value={newPart.name} onChange={e => setNewPart({...newPart, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                   <input type="number" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-xs outline-none" placeholder="Comp" value={newPart.width} onChange={e => setNewPart({...newPart, width: parseInt(e.target.value)||0})} />
                   <input type="number" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-xs outline-none" placeholder="Larg" value={newPart.height} onChange={e => setNewPart({...newPart, height: parseInt(e.target.value)||0})} />
                </div>
                <input type="number" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-xs outline-none" placeholder="Qtd" value={newPart.quantity} onChange={e => setNewPart({...newPart, quantity: parseInt(e.target.value)||1})} />
                <button onClick={addPart} className="w-full bg-[#0D4C4F] text-white py-5 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all">+ Adicionar</button>
             </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
           <div className="bg-white p-12 rounded-[4.5rem] border border-slate-100 shadow-sm min-h-[700px] flex flex-col">
              <div style={{ position: 'fixed', top: '200vh', left: '0', pointerEvents: 'none', zIndex: -100, opacity: 0 }}>
                 <div id="nesting-pdf-content" className="bg-white p-16 text-slate-900" style={{ width: '297mm', minHeight: '210mm', boxSizing: 'border-box' }}>
                    <div className="flex justify-between items-start border-b-4 border-[#0D4C4F] pb-8 mb-8">
                       <div>
                          <h1 className="text-3xl font-black text-[#0D4C4F] uppercase tracking-tighter">Plano de Corte Técnico</h1>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{profile?.name} • {new Date().toLocaleDateString('pt-BR')}</p>
                       </div>
                       <div className="text-right">
                          <h2 className="text-xl font-black uppercase text-slate-900">{selectedSheet?.materialName}</h2>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dimensões: {selectedSheet?.width}x{selectedSheet?.height} cm</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-12 gap-8">
                       <div className="col-span-8">
                          {/* Rulers and Main Board */}
                          <div className="relative pt-6 pl-6">
                             {/* Vertical Ruler */}
                             <div className="absolute left-0 top-6 bottom-0 w-6 flex flex-col border-r border-slate-300">
                                {[0, 0.25, 0.5, 0.75, 1].map(p => (
                                  <div key={p} className="absolute left-0 right-0 border-t border-slate-300" style={{ top: `${p * 100}%` }}>
                                    <span className="text-[6px] font-bold text-slate-400 absolute left-0 -top-1">{(p * (selectedSheet?.height || 0)).toFixed(0)}</span>
                                  </div>
                                ))}
                             </div>
                             {/* Horizontal Ruler */}
                             <div className="absolute left-6 top-0 right-0 h-6 flex border-b border-slate-300">
                                {[0, 0.25, 0.5, 0.75, 1].map(p => (
                                  <div key={p} className="absolute top-0 bottom-0 border-l border-slate-300" style={{ left: `${p * 100}%` }}>
                                    <span className="text-[6px] font-bold text-slate-400 absolute -left-2 top-0">{(p * (selectedSheet?.width || 0)).toFixed(0)}</span>
                                  </div>
                                ))}
                             </div>

                             <div 
                                className="bg-white border-2 border-slate-700 relative"
                                style={{ 
                                  width: '100%', 
                                  aspectRatio: `${selectedSheet?.width || 1} / ${selectedSheet?.height || 1}`
                                }}
                             >
                                {placedParts.map((p, i) => (
                                  <div 
                                    key={i}
                                    className="absolute border border-black/30 flex flex-col items-center justify-center overflow-visible"
                                    style={{
                                      left: `${(p.x / (selectedSheet?.width || 1)) * 100}%`,
                                      top: `${(p.y / (selectedSheet?.height || 1)) * 100}%`,
                                      width: `${(p.width / (selectedSheet?.width || 1)) * 100}%`,
                                      height: `${(p.height / (selectedSheet?.height || 1)) * 100}%`,
                                      backgroundColor: p.color
                                    }}
                                  >
                                     {/* Detailed Cotas (Dimensions) */}
                                     {/* Horizontal Cota (Width) */}
                                     <div className="absolute top-[-10px] left-0 right-0 h-[8px] flex items-center justify-between pointer-events-none">
                                        <div className="w-[1px] h-[6px] bg-black/40"></div>
                                        <div className="flex-grow h-[1px] bg-black/20 flex items-center justify-center">
                                           <span className="bg-white/80 px-1 text-[5px] font-black leading-none whitespace-nowrap">{p.width}cm</span>
                                        </div>
                                        <div className="w-[1px] h-[6px] bg-black/40"></div>
                                     </div>
                                     {/* Vertical Cota (Height) */}
                                     <div className="absolute left-[-10px] top-0 bottom-0 w-[8px] flex flex-col items-center justify-between pointer-events-none">
                                        <div className="h-[1px] w-[6px] bg-black/40"></div>
                                        <div className="flex-grow w-[1px] bg-black/20 flex items-center justify-center">
                                           <span className="bg-white/80 px-1 text-[5px] font-black leading-none uppercase rotate-90 whitespace-nowrap">{p.height}cm</span>
                                        </div>
                                        <div className="h-[1px] w-[6px] bg-black/40"></div>
                                     </div>

                                     <span className="text-[7px] font-black text-white uppercase leading-none truncate px-1 drop-shadow-sm">{p.name}</span>
                                     <span className="text-[5px] font-mono text-white/70 absolute bottom-1 right-1">X:{p.x} Y:{p.y}</span>
                                  </div>
                                ))}
                             </div>
                          </div>

                          <div className="mt-8 grid grid-cols-4 gap-4">
                             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Cortes Ripagem (Y)</span>
                                <div className="text-[10px] font-bold text-[#0D4C4F]">{shelves.map(s => s.y).join(' → ')} cm</div>
                             </div>
                             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Aproveitamento</span>
                                <span className="text-lg font-black text-[#0D4C4F]">{efficiency.toFixed(1)}%</span>
                             </div>
                             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Peças Placed</span>
                                <span className="text-lg font-black text-[#0D4C4F]">{placedParts.length}</span>
                             </div>
                             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Perda Refugo</span>
                                <span className="text-lg font-black text-rose-500">{(100 - efficiency).toFixed(1)}%</span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="col-span-4 space-y-6">
                          <div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Sequência de Corte (Serra Ponte)</h3>
                            <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2">
                               {shelves.map((shelf, idx) => (
                                 <div key={shelf.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                                    <div className="flex justify-between items-center mb-3">
                                       <span className="text-[10px] font-black text-[#0D4C4F] uppercase">TIRO DE RIPA {idx + 1}</span>
                                       <span className="text-[9px] font-bold text-slate-400">POS. Y: {shelf.y}cm</span>
                                    </div>
                                    <div className="space-y-2">
                                       {placedParts.filter(p => p.shelfId === shelf.id).sort((a,b) => a.x - b.x).map((p, pIdx) => (
                                         <div key={pIdx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                                            <span className="text-[8px] font-bold uppercase truncate max-w-[100px]">{p.name}</span>
                                            <div className="flex gap-2">
                                               <span className="text-[8px] bg-slate-100 px-2 py-1 rounded">X: {p.x}</span>
                                               <span className="text-[8px] bg-blue-50 text-blue-600 px-2 py-1 rounded">{p.width}cm</span>
                                            </div>
                                         </div>
                                       ))}
                                    </div>
                                 </div>
                               ))}
                            </div>
                          </div>
                       </div>
                    </div>
                 </div>
               </div>
              <div className="flex justify-between items-center mb-10">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Visualização Técnica do Corte</h3>
                 {efficiency > 0 && (
                   <div className="bg-emerald-50 px-6 py-2 rounded-full border border-emerald-100">
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Aproveitamento: {efficiency.toFixed(1)}%</span>
                   </div>
                 )}
              </div>

              <div className="flex-grow bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 relative overflow-hidden flex items-center justify-center p-8">
                 {selectedSheet ? (
                   <div className="flex-grow w-full h-full p-6 flex items-center justify-center">
                     <div className="relative group/canvas" style={{ width: '100%', height: '100%', paddingLeft: '30px', paddingTop: '30px' }}>
                       {/* Rulers */}
                       <div className="absolute left-0 top-[30px] bottom-0 w-[25px] flex flex-col border-r-2 border-slate-900/10">
                         {[0, 0.2, 0.4, 0.6, 0.8, 1].map(p => (
                           <div key={p} className="absolute left-0 right-0 border-t border-slate-900/20" style={{ top: `${p * 100}%` }}>
                             <span className="text-[6px] font-black text-slate-400 absolute left-0 bottom-0.5">{(p * selectedSheet.height).toFixed(0)}</span>
                           </div>
                         ))}
                       </div>
                       <div className="absolute left-[30px] right-0 top-0 h-[25px] flex border-b-2 border-slate-900/10">
                          {[0, 0.2, 0.4, 0.6, 0.8, 1].map(p => (
                           <div key={p} className="absolute top-0 bottom-0 border-l border-slate-900/20" style={{ left: `${p * 100}%` }}>
                             <span className="text-[6px] font-black text-slate-400 absolute left-0.5 top-0">{(p * selectedSheet.width).toFixed(0)}</span>
                           </div>
                         ))}
                       </div>

                       <div 
                         className="bg-white border-2 border-slate-900 shadow-2xl relative transition-all duration-500"
                         style={{ 
                           width: '100%', 
                           aspectRatio: `${selectedSheet.width} / ${selectedSheet.height}`,
                           maxHeight: '600px',
                           position: 'relative'
                         }}
                       >
                          {placedParts.map((p, i) => (
                            <div 
                              key={i}
                              className="absolute border border-black/30 flex flex-col items-center justify-center overflow-visible shadow-sm group/part"
                              style={{
                                left: `${(p.x / selectedSheet.width) * 100}%`,
                                top: `${(p.y / selectedSheet.height) * 100}%`,
                                width: `${(p.width / selectedSheet.width) * 100}%`,
                                height: `${(p.height / selectedSheet.height) * 100}%`,
                                backgroundColor: p.color,
                                transition: 'all 0.5s ease'
                              }}
                            >
                               {/* COTAS VISUAIS SUPER DETALHADAS */}
                               <div className="absolute top-0 left-0 right-0 -translate-y-full flex items-center justify-between opacity-0 group-hover/part:opacity-100 transition-opacity">
                                  <div className="w-px h-2 bg-black"></div>
                                  <div className="flex-grow h-px bg-black flex items-center justify-center">
                                     <span className="bg-white px-1 text-[8px] font-black text-black z-10">{p.width} cm</span>
                                  </div>
                                  <div className="w-px h-2 bg-black"></div>
                               </div>
                               <div className="absolute top-0 left-0 bottom-0 -translate-x-full flex flex-col items-center justify-between opacity-0 group-hover/part:opacity-100 transition-opacity">
                                  <div className="h-px w-2 bg-black"></div>
                                  <div className="flex-grow w-px bg-black flex items-center justify-center">
                                     <span className="bg-white px-1 text-[8px] font-black text-black z-10 -rotate-90 whitespace-nowrap">{p.height} cm</span>
                                  </div>
                                  <div className="h-px w-2 bg-black"></div>
                               </div>

                               <div className="text-[7px] font-black text-white uppercase text-center leading-none p-1 drop-shadow-md">
                                  {p.name}<br/>
                                  <span className="text-[5px]">{p.width} x {p.height}</span>
                                </div>
                                <div className="absolute top-0 left-0 bg-black/20 px-1 text-[4px] font-mono text-white opacity-0 group-hover/part:opacity-100">
                                  X:{p.x} Y:{p.y}
                                </div>
                            </div>
                          ))}

                          {/* Shelf Lines for Reference */}
                          {shelves.map((s, idx) => (
                            <div key={idx} className="absolute left-0 right-0 border-t border-dashed border-slate-400/30 pointer-events-none" style={{ top: `${(s.y / selectedSheet.height) * 100}%` }}>
                               <span className="absolute -left-12 -top-2 text-[5px] font-black text-slate-400 uppercase">Tiro {idx+1}</span>
                            </div>
                          ))}

                          {isOptimizing && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20">
                               <div className="w-12 h-12 border-4 border-[#0D4C4F] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                       </div>
                     </div>
                   </div>
                 ) : (
                   <div className="text-center space-y-6 opacity-10">
                      <span className="text-9xl block">📐</span>
                      <p className="font-black uppercase tracking-[0.5em] text-sm">Aguardando Chapa e Peças</p>
                   </div>
                 )}
              </div>

              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                {parts.map(p => {
                  const isPlaced = placedParts.some(pp => pp.id === p.id || (pp.name === p.name && (pp.width === p.width || pp.width === p.height)));
                  return (
                    <div key={p.id} className={`flex justify-between items-center p-6 rounded-[2.5rem] border transition-all ${isPlaced ? 'bg-slate-50 border-slate-100' : 'bg-rose-50 border-rose-100'}`}>
                       <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-[11px] font-black text-slate-900 uppercase">{p.name}</h4>
                            {!isPlaced && <span className="bg-rose-500 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase">NÃO ALOCADA</span>}
                          </div>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{p.width} x {p.height} cm • {p.quantity}x</span>
                       </div>
                       <button onClick={() => setParts(parts.filter(x => x.id !== p.id))} className="text-rose-400 font-black text-xl px-4 hover:scale-125 transition-transform">×</button>
                    </div>
                  );
                })}
              </div>

              {unplacedParts.length > 0 && (
                <div className="mt-8 p-10 bg-[#0D4C4F] rounded-[3.5rem] border-4 border-white shadow-2xl overflow-hidden relative">
                   <div className="relative z-10">
                     <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg animate-bounce">⚠️</div>
                        <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-widest">Atenção: Peças que não couberam</h3>
                          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-1">Estas peças não cabem na chapa selecionada</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {unplacedParts.map((p, i) => (
                          <div key={i} className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl flex flex-col">
                             <span className="text-[10px] font-black text-white uppercase mb-2 truncate">{p.name}</span>
                             <div className="flex justify-between items-end">
                                <span className="text-[12px] font-black text-rose-400 leading-none">{p.width}x{p.height}<small className="text-[8px] ml-1">cm</small></span>
                                <span className="text-[9px] font-black text-white/60">Qtd: {p.quantity}</span>
                             </div>
                          </div>
                        ))}
                     </div>
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
