
import { Quote, Product, CompanyProfile, Client, StockItem } from '../types';
import { supabase, isSupabaseEnabled } from '../lib/supabaseClient';

const STORES = {
  QUOTES: 'marmofast_quotes',
  PRODUCTS: 'marmofast_products',
  PROFILE: 'marmofast_profile',
  CLIENTS: 'marmofast_clients',
  STOCK: 'marmofast_stock',
  EXPENSES: 'marmofast_expenses'
};

export const storageService = {
  getQuotes: async (): Promise<Quote[]> => {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('updated_at', { ascending: false });
      if (!error && data) return data as Quote[];
    }
    const data = localStorage.getItem(STORES.QUOTES);
    return data ? JSON.parse(data) : [];
  },

  saveQuotes: async (quotes: Quote[], lastQuote?: Quote) => {
    localStorage.setItem(STORES.QUOTES, JSON.stringify(quotes));

    if (isSupabaseEnabled() && lastQuote) {
      await supabase
        .from('quotes')
        .upsert({ ...lastQuote, updated_at: Date.now() });
    }
    
    // Automation: Update client history if quote is approved
    if (lastQuote && (lastQuote.status === 'Aprovado' || lastQuote.status === 'Finalizado')) {
      const clients = await storageService.getClients();
      const clientIndex = clients.findIndex(c => c.name.toUpperCase() === lastQuote.clientName.toUpperCase());
      
      if (clientIndex !== -1) {
        const client = clients[clientIndex];
        const quoteMaterials = lastQuote.items
          .filter(it => it.productName && !it.productName.toLowerCase().includes('mão de obra'))
          .map(it => it.productName);
        
        const updatedHistory = Array.from(new Set([...(client.materialsHistory || []), ...quoteMaterials]));
        
        const alreadySummed = (client.quoteIds || []).includes(lastQuote.id);
        
        clients[clientIndex] = {
          ...client,
          materialsHistory: updatedHistory,
          totalSpent: alreadySummed ? client.totalSpent : (client.totalSpent || 0) + lastQuote.total,
          quoteIds: alreadySummed ? client.quoteIds : [...(client.quoteIds || []), lastQuote.id],
          updatedAt: Date.now()
        };
        
        await storageService.saveClients(clients);
      }
    }

    window.dispatchEvent(new CustomEvent('quotesUpdated', { detail: { lastQuote } }));
  },

  getProducts: async (): Promise<Product[]> => {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('products')
        .select('*');
      if (!error && data) return data as Product[];
    }
    const data = localStorage.getItem(STORES.PRODUCTS);
    return data ? JSON.parse(data) : [];
  },

  saveProducts: async (products: Product[]) => {
    localStorage.setItem(STORES.PRODUCTS, JSON.stringify(products));
    if (isSupabaseEnabled()) {
      // For simplicity, we upsert every change if it's a many-to-one sync
      // but usually we'd upsert single products.
      // Here we assume saveProducts is called for the whole list
      await supabase.from('products').upsert(products.map(p => ({ ...p, updated_at: Date.now() })));
    }
    window.dispatchEvent(new Event('productsUpdated'));
  },

  getProfile: async (): Promise<CompanyProfile> => {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
        .single();
      if (!error && data) return data as CompanyProfile;
    }
    const data = localStorage.getItem(STORES.PROFILE);
    if (data) return JSON.parse(data);
    
    const defaultProfile: CompanyProfile = {
      name: 'MINHA MARMORARIA',
      taxPercent: 0,
      fixedCostPercent: 15,
      targetProfitMargin: 25,
      customCategories: ['Chapas', 'Serviços', 'Acessórios'],
      taxSettings: {
        regime: 'MEI / Isento',
        simplesAnexo: 'III',
        monthlyRevenue: 0,
        fixedRate: 0,
        issRate: 0,
        effectiveRate: 0
      }
    };
    return defaultProfile;
  },

  saveProfile: async (profile: CompanyProfile) => {
    localStorage.setItem(STORES.PROFILE, JSON.stringify(profile));
    if (isSupabaseEnabled()) {
       await supabase.from('profiles').upsert({ ...profile, updated_at: new Date().toISOString() });
    }
    window.dispatchEvent(new Event('profileUpdated'));
  },

  getNextQuoteNumber: async (): Promise<string> => {
    const quotes = await storageService.getQuotes();
    const lastNum = quotes.length > 0 
      ? Math.max(...quotes.map(q => parseInt(q.number) || 0))
      : 0;
    return (lastNum + 1).toString().padStart(4, '0');
  },

  getClients: async (): Promise<Client[]> => {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('clients')
        .select('*');
      if (!error && data) return data as Client[];
    }
    const data = localStorage.getItem(STORES.CLIENTS);
    return data ? JSON.parse(data) : [];
  },

  saveClients: async (clients: Client[]) => {
    localStorage.setItem(STORES.CLIENTS, JSON.stringify(clients));
    if (isSupabaseEnabled()) {
      await supabase.from('clients').upsert(clients.map(c => ({ ...c, updated_at: Date.now() })));
    }
  },

  getStock: async (): Promise<StockItem[]> => {
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase
        .from('stock')
        .select('*');
      if (!error && data) return data as StockItem[];
    }
    const data = localStorage.getItem(STORES.STOCK);
    return data ? JSON.parse(data) : [];
  },

  saveStock: async (stock: StockItem[]) => {
    localStorage.setItem(STORES.STOCK, JSON.stringify(stock));
    if (isSupabaseEnabled()) {
      await supabase.from('stock').upsert(stock.map(s => ({ ...s, updated_at: Date.now() })));
    }
  },

  exportFullDatabase: async () => {
    const data = {
      quotes: await storageService.getQuotes(),
      products: await storageService.getProducts(),
      profile: await storageService.getProfile(),
      clients: await storageService.getClients(),
      stock: await storageService.getStock()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marmofast_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  },

  importBackup: async (data: Partial<{ quotes: Quote[], products: Product[], profile: CompanyProfile, clients: Client[], stock: StockItem[] }>, merge: boolean = false) => {
    if (merge) {
      const currentQuotes = await storageService.getQuotes();
      const currentProducts = await storageService.getProducts();
      const currentClients = await storageService.getClients();
      
      if (data.quotes) await storageService.saveQuotes([...currentQuotes, ...data.quotes]);
      if (data.products) await storageService.saveProducts([...currentProducts, ...data.products]);
      if (data.clients) await storageService.saveClients([...currentClients, ...data.clients]);
    } else {
      if (data.quotes) await storageService.saveQuotes(data.quotes);
      if (data.products) await storageService.saveProducts(data.products);
      if (data.profile) await storageService.saveProfile(data.profile);
      if (data.clients) await storageService.saveClients(data.clients);
      if (data.stock) await storageService.saveStock(data.stock);
    }
  }
};
