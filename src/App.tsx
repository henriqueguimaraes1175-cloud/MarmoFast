
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import { storageService } from './services/storageService';
import { Quote, Toast, Client } from './types';

// Lazy load components to avoid circular dependencies and speed up initial load
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const QuickCalculator = React.lazy(() => import('./components/QuickCalculator').then(m => ({ default: m.QuickCalculator })));
const QuoteManager = React.lazy(() => import('./components/QuoteManager').then(m => ({ default: m.QuoteManager })));
const ClientManager = React.lazy(() => import('./components/ClientManager'));
const NestingManager = React.lazy(() => import('./components/NestingManager').then(m => ({ default: m.NestingManager })));
const ProductManager = React.lazy(() => import('./components/ProductManager'));
const BusinessManager = React.lazy(() => import('./components/BusinessManager'));
const ProfileManager = React.lazy(() => import('./components/ProfileManager'));
const DocumentCenter = React.lazy(() => import('./components/DocumentCenter'));
const AIChatAssistant = React.lazy(() => import('./components/AIChatAssistant'));

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(true);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('marmofast_active_tab') || 'quotes');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [prefilledClient, setPrefilledClient] = useState<Client | null>(null);

  useEffect(() => {
    localStorage.setItem('marmofast_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handleQuickQuote = (e: Event) => {
      const customEvent = e as CustomEvent<Client>;
      setPrefilledClient(customEvent.detail);
      setActiveTab('calculator');
    };
    window.addEventListener('startQuickQuote', handleQuickQuote);
    return () => window.removeEventListener('startQuickQuote', handleQuickQuote);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const refreshQuotes = useCallback(async () => {
    const data = await storageService.getQuotes();
    setQuotes(data.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await refreshQuotes();
    };
    loadData();
    window.addEventListener('quotesUpdated', refreshQuotes);
    return () => window.removeEventListener('quotesUpdated', refreshQuotes);
  }, [refreshQuotes]);

  const handleAdminToggle = (status: boolean) => {
    setIsAdmin(status);
    if (!status && activeTab !== 'clients') setActiveTab('quotes');
    showToast(status ? "MODO ADMIN ATIVADO" : "MODO ADMIN DESATIVADO", 'info');
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      isAdmin={isAdmin} 
      onAdminToggle={handleAdminToggle}
      toasts={toasts}
      removeToast={removeToast}
    >
      <React.Suspense fallback={<div className="flex items-center justify-center h-full opacity-20 font-black uppercase tracking-widest">Carregando Módulo...</div>}>
        {activeTab === 'dashboard' && isAdmin && <Dashboard quotes={quotes} />}
        {activeTab === 'calculator' && isAdmin && (
          <QuickCalculator 
            onQuoteCreated={() => { refreshQuotes(); setActiveTab('quotes'); }} 
            showToast={showToast} 
            prefilledClient={prefilledClient}
            onClearPrefill={() => setPrefilledClient(null)}
          />
        )}
        {activeTab === 'quotes' && <QuoteManager showToast={showToast} />}
        {activeTab === 'clients' && <ClientManager showToast={showToast} />}
        {activeTab === 'nesting' && isAdmin && <NestingManager showToast={showToast} />}
        {activeTab === 'products' && isAdmin && <ProductManager showToast={showToast} />}
        {activeTab === 'business' && isAdmin && <BusinessManager showToast={showToast} />}
        {activeTab === 'profile' && isAdmin && <ProfileManager showToast={showToast} />}
        {activeTab === 'documents' && <DocumentCenter showToast={showToast} />}
        
        {!isAdmin && !['quotes', 'clients', 'documents'].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
             <span className="text-8xl mb-6">🔒</span>
             <p className="font-black uppercase tracking-widest text-sm">Acesso Restrito - Somente Administradores</p>
          </div>
        )}

        <AIChatAssistant activeTab={activeTab} />
      </React.Suspense>
    </Layout>
  );
};

export default App;
