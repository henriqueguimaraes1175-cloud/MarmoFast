
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { storageService } from '../services/storageService';

import AppLogo from './AppLogo';

const AIChatAssistant: React.FC<{ activeTab?: string }> = ({ activeTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkEnabled = async () => {
      const prof = await storageService.getProfile();
      setIsEnabled(prof.aiAssistantEnabled !== false);
    };
    checkEnabled();

    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggleAIChat', handleToggle);
    window.addEventListener('profileUpdated', checkEnabled);
    return () => {
      window.removeEventListener('toggleAIChat', handleToggle);
      window.removeEventListener('profileUpdated', checkEnabled);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const contextPrompt = `O usuário está atualmente na aba: ${activeTab}. `;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...messages, { role: 'user', content: contextPrompt + userMsg }].map(m => ({ parts: [{ text: m.content }], role: m.role })),
        config: {
          systemInstruction: "Você é o MarmoAI, o assistente inteligente do sistema MarmoFast Pro. Sua missão é ajudar marmoristas a precificar orçamentos, sugerir materiais e dar dicas de gestão industrial. Seja direto, profissional e use termos técnicos de marmoraria (ml, m², acabamento, markup divisor, quebra técnica). Se o usuário perguntar sobre a aba atual, use o contexto fornecido.",
        }
      });
      setMessages(prev => [...prev, { role: 'model', content: response.text || 'Desculpe, não consegui processar sua solicitação.' }]);
    } catch (error) {
      console.error('AI Chat Error:', error);
      setMessages(prev => [...prev, { role: 'model', content: 'Erro ao conectar com o assistente. Verifique sua conexão.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isEnabled) return null;

  return (
    <div className="fixed bottom-8 left-8 z-[200]">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)} 
          className="w-16 h-16 bg-[#0D4C4F] text-white rounded-full shadow-2xl flex items-center justify-center text-3xl hover:scale-110 transition-all border-4 border-white group relative"
        >
          🤖
          <span className="absolute -top-2 -right-2 bg-emerald-500 w-5 h-5 rounded-full border-2 border-white animate-pulse"></span>
        </button>
      ) : (
        <div className="bg-white w-[400px] h-[650px] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in relative">
          <div className="bg-[#0D4C4F] p-8 text-white flex justify-between items-center">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">🤖</div>
                <div>
                   <h4 className="font-black text-[10px] uppercase tracking-[0.2em]">MarmoAI Pro</h4>
                   <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">Inteligência Industrial</span>
                </div>
             </div>
             <div className="flex gap-2">
                <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl hover:bg-white/10 transition-all">×</button>
             </div>
          </div>

          <div ref={scrollRef} className="flex-grow p-8 overflow-y-auto space-y-6 scrollbar-hide bg-slate-50/30">
             {messages.length === 0 && (
               <div className="space-y-8 py-10">
                  <div className="text-center space-y-4">
                     <AppLogo size="lg" className="mx-auto" />
                     <p className="font-black uppercase tracking-widest text-[10px] text-slate-400">Como posso ajudar hoje?</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                     {[
                       "Como calcular margem de lucro?",
                       "Dicas para reduzir desperdício de chapa",
                       "Como cobrar por acabamento 45°?",
                       "O que é markup divisor?"
                     ].map(q => (
                       <button 
                         key={q} 
                         onClick={() => { setInput(q); }}
                         className="text-left p-4 bg-white rounded-2xl border border-slate-100 text-[10px] font-bold text-slate-600 uppercase hover:border-[#0D4C4F] hover:text-[#0D4C4F] transition-all"
                       >
                         {q}
                       </button>
                     ))}
                  </div>
               </div>
             )}
             
             {messages.map((m, i) => (
               <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] p-5 rounded-[2rem] text-[11px] font-medium shadow-sm leading-relaxed ${m.role === 'user' ? 'bg-[#0D4C4F] text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                     <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
               </div>
             ))}
             {isLoading && (
               <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Analisando dados...</span>
               </div>
             )}
          </div>

          <div className="p-6 bg-white border-t border-slate-50 flex gap-3">
             <input 
               className="flex-grow bg-slate-50 border-none rounded-2xl px-6 py-4 text-[11px] font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#0D4C4F]/10 transition-all" 
               placeholder="Digite sua dúvida..." 
               value={input} 
               onChange={e => setInput(e.target.value)} 
               onKeyPress={e => e.key === 'Enter' && handleSend()} 
             />
             <button onClick={handleSend} className="bg-[#0D4C4F] text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all">
                <span className="text-xl">🚀</span>
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChatAssistant;
