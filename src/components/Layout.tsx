
import React from 'react';
import { Toast } from '../types';
import AppLogo from './AppLogo';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  onAdminToggle: (status: boolean) => void;
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, isAdmin, onAdminToggle, toasts, removeToast }) => {
  interface MenuItem {
    id: string;
    label: string;
    icon: string;
    adminOnly: boolean;
    isAction?: boolean;
  }

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Painel', icon: '📊', adminOnly: true },
    { id: 'calculator', label: 'Turbo', icon: '⚡', adminOnly: true },
    { id: 'quotes', label: 'Vendas', icon: '💰', adminOnly: false },
    { id: 'clients', label: 'Clientes', icon: '👥', adminOnly: false },
    { id: 'documents', label: 'Documentos', icon: '🖋️', adminOnly: false },
    { id: 'nesting', label: 'Corte', icon: '📐', adminOnly: true },
    { id: 'products', label: 'Catálogo', icon: '📖', adminOnly: true },
    { id: 'business', label: 'Empresa', icon: '🏢', adminOnly: true },
    { id: 'profile', label: 'Perfil', icon: '⚙️', adminOnly: true },
    { id: 'ai-toggle', label: 'IA Assistente', icon: '🤖', adminOnly: false, isAction: true },
  ];

  const handleMenuClick = (item: MenuItem) => {
    if (item.isAction) {
      if (item.id === 'ai-toggle') {
        window.dispatchEvent(new CustomEvent('toggleAIChat'));
      }
    } else {
      setActiveTab(item.id);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar */}
      <aside className="w-full md:w-20 lg:w-64 bg-[#0D4C4F] text-white flex flex-col sticky top-0 md:h-screen z-50">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <AppLogo size="md" />
          <div className="hidden lg:block">
            <h1 className="font-black text-sm uppercase tracking-tighter">MarmoFast</h1>
            <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">Pro Edition</p>
          </div>
        </div>

        <nav className="flex-grow p-4 space-y-2 overflow-y-auto scrollbar-hide">
          {menuItems.map(item => {
            if (item.adminOnly && !isAdmin) return null;
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group ${
                  activeTab === item.id ? 'bg-white text-[#0D4C4F] shadow-xl' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="hidden lg:block font-black text-[10px] uppercase tracking-widest">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={() => onAdminToggle(!isAdmin)}
            className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${isAdmin ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}
          >
            <span className="text-xl">{isAdmin ? '🔓' : '🔒'}</span>
            <span className="hidden lg:block font-black text-[8px] uppercase tracking-widest">Modo Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-8 lg:p-12 overflow-x-hidden">
        {children}
      </main>

      {/* Toasts */}
      <div className="fixed bottom-8 right-8 z-[100] space-y-3">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`p-5 rounded-3xl shadow-2xl border flex items-center gap-4 animate-in min-w-[300px] ${
              t.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 
              t.type === 'error' ? 'bg-rose-600 border-rose-500 text-white' : 
              'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <span className="text-xl">{t.type === 'success' ? '✅' : t.type === 'error' ? '🚨' : 'ℹ️'}</span>
            <p className="font-black text-[10px] uppercase flex-grow">{t.message}</p>
            <button onClick={() => removeToast(t.id)} className="opacity-50 hover:opacity-100 text-xl">×</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Layout;
