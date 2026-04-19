
import React, { useState, useEffect, useRef } from 'react';
import { CompanyProfile } from '../types';
import { storageService } from '../services/storageService';
import AppLogo from './AppLogo';

const ProfileManager: React.FC<{ showToast?: (m: string, t?: 'success' | 'error' | 'info') => void }> = ({ showToast }) => {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    storageService.getProfile().then(setProfile);
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    await storageService.saveProfile(profile);
    setIsSaved(true);
    if (showToast) showToast("Configurações de Perfil Atualizadas!", "success");
    setTimeout(() => setIsSaved(false), 2000);
  };

  if (!profile) return null;

  return (
    <div className="space-y-12 animate-in pb-20 max-w-6xl mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-100 pb-10">
        <div>
          <h2 className="text-6xl font-black text-slate-900 tracking-tighter uppercase leading-none">Perfil da Marmoraria</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-3">Identidade Visual e Parâmetros Base</p>
        </div>
        <button onClick={handleSave} className={`px-12 py-5 rounded-[2rem] font-black text-xs uppercase transition-all shadow-2xl ${isSaved ? 'bg-emerald-500 text-white' : 'bg-[#0D4C4F] text-white hover:scale-105'}`}>
          {isSaved ? '✅ Perfil Salvo' : '💾 Salvar Alterações'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm space-y-10">
             <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-4">
                <span className="w-2 h-6 bg-[#0D4C4F] rounded-full"></span> Dados Institucionais
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-4 block mb-2 tracking-widest">Nome da Empresa</label>
                   <input className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-sm uppercase" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value.toUpperCase()})} />
                </div>
                
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-4 block mb-2 tracking-widest">WhatsApp Comercial</label>
                   <input className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-sm" value={profile.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} placeholder="(00) 00000-0000" />
                </div>

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-4 block mb-2 tracking-widest">E-mail de Contato</label>
                   <input className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-sm" value={profile.email || ''} onChange={e => setProfile({...profile, email: e.target.value.toLowerCase()})} placeholder="contato@empresa.com" />
                </div>

                <div className="md:col-span-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-4 block mb-2 tracking-widest">Endereço Físico (Opcional)</label>
                   <div className="flex flex-col md:flex-row gap-4">
                      <input className="flex-1 bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-sm uppercase" value={profile.address || ''} onChange={e => setProfile({...profile, address: e.target.value.toUpperCase()})} placeholder="RUA EXX, 000 - BAIRRO - CIDADE/UF" />
                      <button 
                         onClick={() => setProfile({...profile, showAddress: !profile.showAddress})}
                         className={`px-8 py-5 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-3 border-2 ${profile.showAddress ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
                      >
                         <div className={`w-3 h-3 rounded-full ${profile.showAddress ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
                         {profile.showAddress ? 'Exibir no PDF' : 'Oculto no PDF'}
                      </button>
                   </div>
                   <p className="text-[8px] font-bold text-slate-400 uppercase mt-3 ml-4">Habilite apenas se desejar que os clientes saibam sua localização física nos orçamentos.</p>
                </div>

                <div className="md:col-span-2">
                   <label className="text-[10px] font-black text-emerald-600 uppercase ml-4 block mb-2 tracking-widest">Chave PIX (Para Orçamentos)</label>
                   <input className="w-full bg-emerald-50 border-none rounded-2xl px-8 py-5 font-black text-sm text-[#0D4C4F]" value={profile.pixKey || ''} onChange={e => setProfile({...profile, pixKey: e.target.value})} placeholder="CNPJ, E-mail ou Chave Aleatória" />
                </div>
             </div>
          </div>

          <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm space-y-10">
             <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-4">
                <span className="w-2 h-6 bg-amber-500 rounded-full"></span> Padrões de Orçamento
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-4 block mb-2 tracking-widest">Validade Padrão (Dias)</label>
                   <input type="number" className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-sm" value={profile.defaultValidity || 10} onChange={e => setProfile({...profile, defaultValidity: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-4 block mb-2 tracking-widest">Prazo de Entrega Padrão</label>
                   <input className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 font-black text-sm uppercase" value={profile.defaultDeadline || ''} onChange={e => setProfile({...profile, defaultDeadline: e.target.value})} placeholder="EX: 15 DIAS ÚTEIS" />
                </div>
             </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-[#0D4C4F] p-12 rounded-[4.5rem] text-white shadow-2xl text-center border-8 border-white">
             <div className="w-40 h-40 bg-white/10 rounded-[3rem] mx-auto mb-8 flex items-center justify-center border-4 border-white/5 overflow-hidden shadow-inner">
                {profile.logo ? <img src={profile.logo} className="w-full h-full object-contain" /> : <AppLogo size="xl" />}
             </div>
             <h4 className="text-xs font-black uppercase tracking-widest mb-2">Logotipo da Empresa</h4>
             <p className="text-[8px] font-bold text-white/40 uppercase mb-8 leading-relaxed">Aparecerá no cabeçalho dos seus orçamentos em PDF.</p>
             <button onClick={() => fileInputRef.current?.click()} className="bg-white text-[#0D4C4F] px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all">Alterar Imagem</button>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => {
                const f = e.target.files?.[0];
                if (f) {
                  const r = new FileReader();
                  r.onload = ev => setProfile({...profile!, logo: ev.target?.result as string});
                  r.readAsDataURL(f);
                }
             }} />
          </div>

          <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm space-y-6">
             <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">Categorias Customizadas</h4>
             <div className="flex flex-wrap gap-2 justify-center">
                {profile.customCategories?.map((cat, i) => (
                  <span key={i} className="bg-slate-50 px-4 py-2 rounded-full text-[9px] font-black uppercase text-slate-400 border border-slate-100">{cat}</span>
                ))}
             </div>
             <p className="text-[8px] font-bold text-slate-300 uppercase text-center">Edite as categorias na aba Gestão da Empresa.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileManager;
