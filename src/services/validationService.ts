
import { Quote } from '../types';

export const validationService = {
  validateQuote: (quote: Partial<Quote>) => {
    if (!quote.clientName) return { valid: false, error: "Nome do cliente é obrigatório" };
    if (!quote.items || quote.items.length === 0) return { valid: false, error: "Adicione pelo menos um item" };
    return { valid: true };
  }
};
