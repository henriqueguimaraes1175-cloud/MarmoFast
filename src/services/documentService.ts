
import { Quote, CompanyProfile } from '../types';

export const documentService = {
  generateQuotePDF: async (quote: Quote, profile: CompanyProfile) => {
    // Implementação simplificada do gerador de PDF
    console.log("Gerando PDF para:", quote.number, "com perfil:", profile.name);
    return true;
  }
};
