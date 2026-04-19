
import { QuoteItem, CompanyProfile, FinancialBreakdown, TaxSettings } from '../types';
import { calcularAreaMarmoraria } from '../utils/formatters';

export const pricingService = {
  calculateSimplesNacional: (revenue: number): number => {
    if (revenue <= 180000) return 0.06;
    if (revenue <= 360000) return 0.112;
    if (revenue <= 720000) return 0.135;
    if (revenue <= 1800000) return 0.16;
    if (revenue <= 3600000) return 0.21;
    return 0.33;
  },

  calculateAliquotaEfetiva: (settings?: TaxSettings): number => {
    if (!settings) return 0.06;
    
    // FIX: Suporte para MEI / Isento
    if (settings.regime === 'MEI / Isento') {
      return 0;
    }

    if (settings.regime === 'Lucro Presumido') {
      // FIX: Fallback para 0 para evitar NaN
      const fixed = Number(settings.fixedRate || 0);
      const iss = Number(settings.issRate || 0);
      return (fixed + iss) / 100;
    }
    
    // Simples Nacional
    return pricingService.calculateSimplesNacional((settings.monthlyRevenue || 0) * 12);
  },

  /**
   * MOTOR DE CÁLCULO ATÔMICO 2.0
   * Recalcula com base em Materiais + Insumos + Mão de Obra Técnica.
   */
  calculateFinancials: (
    items: QuoteItem[], 
    profile: CompanyProfile, 
    discountAmount: number = 0
  ): FinancialBreakdown => {
    // FIX: Garantir que taxRate nunca seja NaN
    const taxRate = pricingService.calculateAliquotaEfetiva(profile.taxSettings) || 0;
    const fixedCostRate = (profile.fixedCostPercent || 15) / 100;
    const manHourCost = profile.manHourCost || 45;

    let totalDirectCosts = 0;
    let totalGrossRevenue = 0;

    items.forEach(it => {
      // 1. Determina a Área/Quantidade técnica para faturamento
      const areaFaturada = (it.unit === 'm²' && it.length && it.width)
        ? (it.isManualQty ? it.quantity : calcularAreaMarmoraria(it.length, it.width, it.quantity))
        : it.quantity;

      // 2. Custo Direto de Material (Usando a perda real do material)
      const wasteFactor = 1 + (it.wastePercent || 0) / 100;
      const materialCost = areaFaturada * it.costPrice * wasteFactor;

      // 2.1 Custo de Acabamento (ml)
      // O perímetro deve ser passado corretamente pelo componente
      const perimeter = it.perimeter || 0;
      const finishCost = (it.finishCost || 0) * perimeter;
      const finishPrice = (it.finishPrice || 0) * perimeter;

      // 2.2 Custo de Insumos Extras
      const suppliesCost = (it.supplies || []).reduce((acc, s) => acc + (s.cost * s.quantity), 0);
      const suppliesPrice = (it.supplies || []).reduce((acc, s) => acc + (s.price * s.quantity), 0);

      // 3. Custo de Mão de Obra Técnica (Tempo de Execução x Custo Hora)
      const laborCost = (it.executionTime || 0) * manHourCost;

      totalDirectCosts += materialCost + laborCost + finishCost + suppliesCost;

      // 4. Receita Bruta (Soma Real dos Preços de Venda)
      totalGrossRevenue += (areaFaturada * (it.salesPrice || 0)) + finishPrice + suppliesPrice;
    });

    // 5. Gestão de Descontos (Trava contra valor negativo)
    const safeDiscount = Math.min(discountAmount, totalGrossRevenue);
    const finalPrice = totalGrossRevenue - safeDiscount;

    // 6. Análise de Resultados Finais
    const taxesVal = finalPrice * taxRate;
    const fixedCostVal = finalPrice * fixedCostRate;
    const netProfit = finalPrice - totalDirectCosts - taxesVal - fixedCostVal;
    
    // FIX: Garantir que netMargin nunca seja NaN
    const netMargin = finalPrice > 0 ? (netProfit / finalPrice) * 100 : 0;

    return {
      directCost: totalDirectCosts,
      fixedCostRateio: fixedCostVal,
      totalCost: totalDirectCosts + fixedCostVal,
      taxes: taxesVal,
      markup: totalDirectCosts > 0 ? finalPrice / totalDirectCosts : 0,
      price: finalPrice,
      profit: netProfit,
      margin: isNaN(netMargin) ? 0 : netMargin
    };
  }
};
