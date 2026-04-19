
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Category, CompanyProfile } from '../types';
import { storageService } from '../services/storageService';
import { DEFAULT_PRODUCTS } from '../constants';
import { formatarMoeda } from '../utils/formatters';
import AppLogo from './AppLogo';

const ProductManager: React.FC<{ showToast?: (m: string, t?: 'success' | 'error' | 'info') => void }> = ({ showToast }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('Chapas');
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      const stored = await storageService.getProducts();
      const prof = await storageService.getProfile();
      setProducts(stored.length > 0 ? stored : DEFAULT_PRODUCTS);
      setProfile(prof);
    };
    loadData();
  }, []);

  const categories = useMemo(() => profile?.customCategories || ['Chapas', 'Serviços', 'Acessórios'], [profile]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = p.category === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [products, activeCategory, search]);

  const calculateSalesPrice = (p: Partial<Product>) => {
    if (!profile) return 0;
    let baseDirectCost = p.cost || 0;
    if (p.category === 'Serviços') {
       baseDirectCost = (p.executionTime || 0) * (profile.manHourCost || 45);
    } else if (p.unit === 'm²') {
       baseDirectCost = (p.cost || 0) * (1 + (p.wastePercent || 0) / 100);
    }
    const profitMargin = (p.markupPercent || profile.targetProfitMargin || 25) / 100;
    const tax = (profile.taxPercent || 0) / 100;
    const fixedCost = (profile.fixedCostPercent || 15) / 100;
    const divisor = 1 - profitMargin - tax - fixedCost;
    const safeDivisor = divisor > 0.15 ? divisor : 0.15;
    return Number((baseDirectCost / safeDivisor).toFixed(2));
  };

  const handleSave = async () => {
    if (!editingProduct?.name || !editingProduct?.code) return showToast?.("Preencha os campos obrigatórios.", "error");
    const salesPrice = calculateSalesPrice(editingProduct);
    const productToSave = { ...editingProduct, id: editingProduct.id || `PROD-${Date.now()}`, salesPrice, updatedAt: Date.now() } as Product;
    const updated = editingProduct.id ? products.map(p => p.id === editingProduct.id ? productToSave : p) : [productToSave, ...products];
    setProducts(updated);
    await storageService.saveProducts(updated);
    showToast?.("Produto salvo com sucesso!");
    setEditingProduct(null);
  };

  return (
    <div className="space-y-8 animate-in pb-20 max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">Catálogo de Materiais</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-3">Gestão de Custos e Precificação Estratégica</p>
        </div>
        <button onClick={() => setEditingProduct({ category: activeCategory, markupPercent: profile?.targetProfitMargin || 25, wastePercent: 15, cost: 0, unit: 'm²', executionTime: 1 })} className="bg-[#0D4C4F] text-white px-12 py-5 rounded-[2rem] font-black text-xs uppercase shadow-2xl hover:scale-105 transition-all">+ Novo Item</button>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="lg:w-72 space-y-3">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`w-full text-left px-8 py-5 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-[#0D4C4F] text-white shadow-xl' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-grow space-y-8">
          <div className="bg-white p-6 rounded-[3rem] shadow-sm border border-slate-100">
            <input className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-xs outline-none" placeholder="PESQUISAR POR NOME OU CÓDIGO..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredProducts.map(p => (
              <div key={p.id} className="bg-white p-8 rounded-[4rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-[#0D4C4F]/20 transition-all group">
                <div className="flex gap-6 mb-8">
                   <div className="w-20 h-20 bg-slate-50 rounded-3xl overflow-hidden border border-slate-100 flex-shrink-0 group-hover:scale-110 transition-all flex items-center justify-center">
                      {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <AppLogo size="sm" className="opacity-20" />}
                   </div>
                   <div className="flex-grow min-w-0">
                      <div className="text-[8px] font-black text-slate-300 uppercase truncate mb-2 tracking-widest">{p.code}</div>
                      <h4 className="text-base font-black text-slate-900 uppercase truncate leading-tight">{p.name}</h4>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">{p.category} • {p.unit}</span>
                   </div>
                </div>
                <div className="flex justify-between items-end border-t border-slate-50 pt-8">
                   <div>
                      <span className="text-[8px] font-black text-slate-300 uppercase block mb-1 tracking-widest">Preço de Venda</span>
                      <div className="text-2xl font-black text-[#0D4C4F]">{formatarMoeda(p.salesPrice)}</div>
                   </div>
                   <button onClick={() => setEditingProduct(p)} className="bg-slate-50 text-[#0D4C4F] px-6 py-3 rounded-xl font-black text-[9px] uppercase hover:bg-[#0D4C4F] hover:text-white transition-all">Editar</button>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-32 text-center opacity-20 font-black uppercase tracking-widest text-xs">Nenhum produto cadastrado nesta categoria</div>
            )}
          </div>
        </div>
      </div>

      {editingProduct && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[300] flex items-center justify-center p-4 animate-in">
          <div className="bg-white rounded-[4.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-8 border-white">
            <div className="p-12 border-b flex justify-between items-center">
               <div>
                  <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Ficha Técnica do Produto</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configuração de Custos e Margens</p>
               </div>
               <button onClick={() => setEditingProduct(null)} className="text-slate-300 hover:text-slate-950 text-5xl font-black transition-all">×</button>
            </div>
            <div className="p-12 overflow-y-auto space-y-10 scrollbar-hide">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-6">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest">Nome Comercial</label>
                      <input className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-sm uppercase" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value.toUpperCase()})} />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                       <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest">Código Interno</label>
                         <input className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-sm uppercase" value={editingProduct.code || ''} onChange={e => setEditingProduct({...editingProduct, code: e.target.value.toUpperCase()})} />
                       </div>
                       <div>
                         <label className="text-[9px] font-black text-slate-400 uppercase ml-4 mb-2 block tracking-widest">Categoria</label>
                         <select className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-sm uppercase" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                       </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-[3rem] flex flex-col items-center justify-center text-center space-y-4 border border-slate-100 group">
                     <div className="w-32 h-32 bg-white rounded-[2rem] shadow-sm flex items-center justify-center text-5xl overflow-hidden border-4 border-white">
                        {editingProduct.image ? <img src={editingProduct.image} className="w-full h-full object-cover" /> : <AppLogo size="lg" />}
                     </div>
                     <button onClick={() => fileInputRef.current?.click()} className="text-[9px] font-black uppercase text-[#0D4C4F] tracking-widest hover:underline">Alterar Foto</button>
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const r = new FileReader();
                          r.onload = ev => setEditingProduct({...editingProduct!, image: ev.target?.result as string});
                          r.readAsDataURL(f);
                        }
                     }} />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                     <label className="text-[9px] font-black text-slate-400 uppercase block mb-3 tracking-widest">Custo Base ({editingProduct.unit})</label>
                     <div className="flex items-center gap-2">
                        <span className="text-slate-300 font-black text-xs">R$</span>
                        <input type="number" className="w-full bg-transparent border-none p-0 font-black text-xl outline-none" value={editingProduct.cost || 0} onChange={e => setEditingProduct({...editingProduct, cost: parseFloat(e.target.value) || 0})} />
                     </div>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                     <label className="text-[9px] font-black text-slate-400 uppercase block mb-3 tracking-widest">Quebra Técnica (%)</label>
                     <div className="flex items-center gap-2">
                        <input type="number" className="w-full bg-transparent border-none p-0 font-black text-xl outline-none" value={editingProduct.wastePercent || 0} onChange={e => setEditingProduct({...editingProduct, wastePercent: parseFloat(e.target.value) || 0})} />
                        <span className="text-slate-300 font-black text-xl">%</span>
                     </div>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                     <label className="text-[9px] font-black text-slate-400 uppercase block mb-3 tracking-widest">Margem Lucro (%)</label>
                     <div className="flex items-center gap-2">
                        <input type="number" className="w-full bg-transparent border-none p-0 font-black text-xl outline-none" value={editingProduct.markupPercent || 0} onChange={e => setEditingProduct({...editingProduct, markupPercent: parseFloat(e.target.value) || 0})} />
                        <span className="text-slate-300 font-black text-xl">%</span>
                     </div>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                     <label className="text-[9px] font-black text-slate-400 uppercase block mb-3 tracking-widest">Unidade</label>
                     <select className="w-full bg-transparent border-none p-0 font-black text-base uppercase outline-none" value={editingProduct.unit} onChange={e => setEditingProduct({...editingProduct, unit: e.target.value as 'm²' | 'ml' | 'un'})}>
                        <option value="m²">m² (Chapa)</option>
                        <option value="ml">ml (Acabamento)</option>
                        <option value="un">un (Peça)</option>
                     </select>
                  </div>
               </div>

               <div className="bg-[#0D4C4F] p-12 rounded-[3.5rem] text-white flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl relative overflow-hidden">
                  <div className="relative z-10">
                     <span className="text-[10px] font-black text-emerald-400 uppercase block mb-2 tracking-[0.4em]">Preço de Venda Sugerido</span>
                     <div className="text-7xl font-black tracking-tighter">{formatarMoeda(calculateSalesPrice(editingProduct))}</div>
                     <p className="text-[9px] font-bold text-white/40 uppercase mt-4">Cálculo baseado em custo direto + impostos (MEI) + margem operacional.</p>
                  </div>
                  <button onClick={handleSave} className="relative z-10 bg-emerald-500 text-white px-16 py-6 rounded-[2rem] font-black text-sm uppercase shadow-xl hover:scale-105 transition-all">Salvar no Catálogo</button>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;
