
import { Product, ProjectTemplate, Finish, Supply } from './types';

export const FINISHES: Finish[] = [
  { id: 'f-reto', name: 'Reto Polido', costPerMl: 15, salesPricePerMl: 45, executionTimePerMl: 0.5 },
  { id: 'f-45', name: 'Meia Esquadria (45º)', costPerMl: 45, salesPricePerMl: 120, executionTimePerMl: 1.5 },
  { id: 'f-meia-cana', name: 'Meia Cana', costPerMl: 30, salesPricePerMl: 85, executionTimePerMl: 1.0 },
  { id: 'f-bisote', name: 'Bisotê', costPerMl: 20, salesPricePerMl: 55, executionTimePerMl: 0.8 }
];

export const SUPPLIES: Supply[] = [
  { id: 's-cola', name: 'Cola Cuba (Kit)', cost: 12, salesPrice: 35, unit: 'un' },
  { id: 's-silicone', name: 'Silicone PU', cost: 18, salesPrice: 45, unit: 'un' },
  { id: 's-ferro', name: 'Reforço de Ferro', cost: 25, salesPrice: 65, unit: 'm' },
  { id: 's-grampo', name: 'Grampo de Fixação', cost: 5, salesPrice: 15, unit: 'un' }
];


export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'cozinha-l',
    name: 'Cozinha em L',
    category: 'Cozinha',
    subCategory: 'Padrão',
    icon: '📐',
    description: 'Bancada composta por duas partes com junção em 45º ou topo.',
    difficulty: 'Média',
    defaultItems: [
      { productName: 'Bancada Principal', length: 150, width: 60, quantity: 1, isManualQty: false },
      { productName: 'Retorno do L', length: 100, width: 60, quantity: 1, isManualQty: false },
      { productName: 'Rodapia (Frontão)', length: 250, width: 10, quantity: 1, isManualQty: false }
    ]
  },
  {
    id: 'cozinha-reta',
    name: 'Cozinha Reta',
    category: 'Cozinha',
    subCategory: 'Padrão',
    icon: '📏',
    description: 'Bancada linear simples.',
    difficulty: 'Baixa',
    defaultItems: [
      { productName: 'Bancada', length: 200, width: 60, quantity: 1, isManualQty: false },
      { productName: 'Rodapia (Frontão)', length: 200, width: 10, quantity: 1, isManualQty: false }
    ]
  },
  {
    id: 'cuba-esculpida',
    name: 'Bancada com Cuba Esculpida',
    category: 'Banheiro',
    subCategory: 'Especial',
    icon: '💎',
    description: 'Bancada com pia feita no próprio material (Válvula oculta).',
    difficulty: 'Alta',
    defaultItems: [
      { productName: 'Bancada Superior', length: 80, width: 50, quantity: 1, isManualQty: false },
      { productName: 'Saia (Avental)', length: 180, width: 15, quantity: 1, isManualQty: false },
      { productName: 'Mão de Obra de Esculpir', length: 0, width: 0, quantity: 1, isManualQty: true }
    ]
  },
  {
    id: 'escada-padrao',
    name: 'Escada (Piso + Espelho)',
    category: 'Escada',
    subCategory: 'Padrão',
    icon: '🪜',
    description: 'Cálculo por degrau completo.',
    difficulty: 'Média',
    defaultItems: [
      { productName: 'Piso (Degrau)', length: 100, width: 30, quantity: 15, isManualQty: false },
      { productName: 'Espelho', length: 100, width: 18, quantity: 15, isManualQty: false }
    ]
  },
  {
    id: 'soleira-pingadeira',
    name: 'Soleira / Pingadeira',
    category: 'Outro',
    subCategory: 'Padrão',
    icon: '🚪',
    description: 'Peças estreitas para acabamento de portas e janelas.',
    difficulty: 'Baixa',
    defaultItems: [
      { productName: 'Soleira', length: 100, width: 15, quantity: 1, isManualQty: false }
    ]
  }
];

export const DEFAULT_PRODUCTS: Product[] = [

  {
    id: '1',
    code: 'G-001',
    name: 'GRANITO PRETO SÃO GABRIEL',
    category: 'Chapas',
    subCategory: 'Nacional',
    unit: 'm²',
    cost: 280,
    wastePercent: 15,
    markupPercent: 30,
    salesPrice: 650,
    executionTime: 2
  },
  {
    id: '2',
    code: 'G-002',
    name: 'GRANITO BRANCO ITAÚNAS',
    category: 'Chapas',
    subCategory: 'Nacional',
    unit: 'm²',
    cost: 220,
    wastePercent: 15,
    markupPercent: 30,
    salesPrice: 520,
    executionTime: 2
  },
  {
    id: '3',
    code: 'S-001',
    name: 'MÃO DE OBRA INSTALAÇÃO',
    category: 'Serviços',
    unit: 'un',
    cost: 150,
    wastePercent: 0,
    markupPercent: 50,
    salesPrice: 450,
    executionTime: 4
  }
];
