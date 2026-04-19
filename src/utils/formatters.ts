
export function formatarMoeda(valor: number): string {
  if (isNaN(valor) || valor === null || valor === undefined) return 'R$ 0,00';
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatarNumeroDecimal(valor: number): string {
  if (isNaN(valor) || valor === null || valor === undefined) return '0,00';
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Calcula a área com regras de marmoraria:
 * 1. Arredonda medidas para múltiplos de 5cm (ex: 22cm -> 25cm)
 * 2. Trava em área mínima de 0,15m² por peça
 */
export function calcularAreaMarmoraria(comprimentoCm: number, larguraCm: number, quantidade: number = 1, useMinArea: boolean = true): number {
  const arredondar5 = (val: number) => Math.ceil(val / 5) * 5;
  
  const c = arredondar5(comprimentoCm || 0);
  const l = arredondar5(larguraCm || 0);
  
  const areaPeca = (c * l) / 10000;
  const areaMinima = useMinArea ? 0.15 : 0;
  
  const areaFaturada = Math.max(areaPeca, areaMinima);
  return areaFaturada * (quantidade || 1);
}

export function valorPorExtenso(valor: number): string {
  if (isNaN(valor) || valor === null || valor === undefined) return 'zero reais';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace('R$', '').trim() + ' reais';
}
