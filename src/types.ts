
export type Category = string;
export type SubCategory = 
  | 'Grupo 1 - Granitos de Batalha' 
  | 'Grupo 2 - Mármores e Importados' 
  | 'Grupo 3 - Exóticos e Quartzitos'
  | 'Porcelanatos 1ª Linha'
  | 'Porcelanatos Técnicos'
  | 'Cortes e Furos'
  | 'Acabamentos'
  | 'Especiais'
  | 'Kits Cozinha'
  | 'Kits Banheiro'
  | 'Nacional' 
  | 'Importado' 
  | 'Especial' 
  | 'Exótico' 
  | 'Quartzo' 
  | 'Ultra-Compacto' 
  | 'Padrão'
  | 'Todos';

export type Unit = 'm²' | 'ml' | 'un';
export type QuoteStatus = 'Em Aberto' | 'Aprovado' | 'Finalizado' | 'Cancelado';
export type ProjectType = 'Cozinha' | 'Banheiro' | 'Escada' | 'Área Gourmet' | 'Nicho' | 'Outro';
export type QuoteTemplateType = 'quick' | 'detailed';

export interface ProductImages {
  chapa: string;
  close: string;
  aplicacoes?: string[];
}

export interface MaterialSpecs {
  thicknesses: string[];
  finishes: string[];
}

export interface Finish {
  id: string;
  name: string;
  costPerMl: number;
  salesPricePerMl: number;
  executionTimePerMl: number;
}

export interface Supply {
  id: string;
  name: string;
  cost: number;
  salesPrice: number;
  unit: 'un' | 'm' | 'kg';
}

export interface ProjectTemplateItem {
  productName: string;
  length?: number;
  width?: number;
  quantity?: number;
  isManualQty: boolean;
  finishId?: string;
  supplies?: { supplyId: string, quantity: number }[];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  category: ProjectType;
  subCategory: SubCategory;
  icon: string;
  description: string;
  difficulty: string;
  defaultItems: ProjectTemplateItem[];
}

export interface CloudConfig {
  enabled: boolean;
  provider: 'supabase' | 'firebase';
  url: string;
  apiKey: string;
}

export interface TaxSettings {
  regime: 'Simples Nacional' | 'Lucro Presumido' | 'MEI / Isento';
  simplesAnexo: 'I' | 'III' | 'IV';
  monthlyRevenue: number;
  fixedRate: number;
  issRate: number;
  effectiveRate: number;
}

export interface FixedCostsSettings {
  id: string;
  referenceMonth: string;
  energy: number;
  water: number;
  rent: number;
  salariesAdmin: number;
  internetTelefone: number;
  maintenance: number;
  fixedTaxes: number;
  other: number;
  total: number;
  productiveHours: number;
}

export interface CompanyProfile {
  id?: string;
  name: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  pixKey?: string;
  showAddress?: boolean;
  defaultValidity?: number;
  defaultDeadline?: string;
  productiveHoursPerMonth?: number;
  manHourCost?: number;
  targetProfitMargin?: number;
  taxPercent: number;
  fixedCostPercent: number;
  protectLaborDiscount?: boolean;
  cloudConfig?: CloudConfig;
  customCategories: string[];
  lockedModules?: string[];
  fixedCosts?: FixedCostsSettings;
  taxSettings?: TaxSettings;
  aiAssistantEnabled?: boolean;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  technicalName?: string;
  category: Category;
  subCategory?: SubCategory;
  unit: Unit;
  cost: number;
  wastePercent: number;
  transportCost?: number;
  executionTime?: number;
  manHourCost?: number;
  complexity?: 'baixa' | 'media' | 'alta';
  standardQuantity?: number;
  markupPercent: number;
  salesPrice: number;
  updatedAt?: number;
  colorTag?: string;
  specs?: MaterialSpecs;
  description?: string;
  image?: string;
  images?: ProductImages;
}

export interface QuoteItem {
  id: string;
  productId: string;
  productName: string;
  unit: Unit;
  costPrice: number;
  salesPrice: number;
  length?: number;
  width?: number;
  perimeter?: number;
  wastePercent?: number;
  thickness?: string;
  edgeFinish?: string;
  finishId?: string;
  finishName?: string;
  finishPrice?: number;
  finishCost?: number;
  supplies?: { supplyId: string, name: string, quantity: number, price: number, cost: number }[];
  quantity: number;
  total: number;
  executionTime: number; 
  category?: Category;
  isManualQty: boolean;
  extraValue?: number;
  isService?: boolean;
  description?: string;
}

export interface FinancialBreakdown {
  directCost: number;
  fixedCostRateio: number;
  totalCost: number;
  taxes: number;
  markup: number;
  price: number;
  profit: number;
  margin: number;
}

export interface QuoteDocument {
  id: string;
  name: string;
  type: 'contract' | 'receipt' | 'photo' | 'other';
  url: string;
  date: string;
  amount?: number;
}

export interface Quote {
  id: string;
  number: string;
  date: string;
  clientName: string;
  whatsapp: string;
  address: string;
  status: QuoteStatus;
  items: QuoteItem[];
  discountPercent: number;
  total: number;
  financials?: FinancialBreakdown;
  updatedAt?: number;
  workAddress?: string;
  projectType?: string;
  templateType?: QuoteTemplateType;
  subtotal: number;
  discountAmount: number;
  manualAdjustment: number;
  totalCost: number;
  fixedCostAmount: number;
  taxAmount: number;
  netProfit: number;
  profitMargin: number;
  validityDays: number;
  validityDate?: string;
  estimatedDeadline: string;
  deliveryDays?: number;
  deliveryIsWorkDays?: boolean;
  paymentTerms: string;
  paymentType?: 'pix' | '6x' | '10x' | 'custom';
  installmentsCount?: number;
  installmentValue?: number;
  includedServices?: string;
  excludedServices?: string;
  technicalObservations?: string;
  showPhotosInPdf?: boolean;
  showMeasuresInPdf?: boolean;
  showItemPricesInPdf?: boolean;
  showDescriptionsInPdf?: boolean;
  showSignatureBlock?: boolean;
  markupOverride?: number;
  documents?: QuoteDocument[];
}

export interface ClientPhoto {
  id: string;
  url: string;
  label: string;
  date: string;
  type: string;
}

export interface Client { 
  id: string; 
  name: string; 
  whatsapp: string; 
  totalSpent: number; 
  quoteIds: string[]; 
  createdAt: number; 
  materialsHistory: string[];
  address: string;
  type?: 'Final' | 'Parceiro';
  status?: 'Em Medição' | 'Em Produção' | 'Finalizado' | 'Aguardando';
  updatedAt: number;
  photos: ClientPhoto[];
}

export interface StockItem { 
  id: string; 
  materialName: string; 
  width: number; 
  height: number; 
  type?: string; 
  status: 'Disponível' | 'Reservado' | 'Vendido'; 
  updatedAt: number; 
  materialId?: string;
  reservaQuoteId?: string;
  reservaClientId?: string;
}

export interface NestingPart { 
  id: string; 
  name: string; 
  width: number; 
  height: number; 
  quantity: number; 
  allowRotation: boolean; 
  grain: 'horizontal' | 'vertical' | 'none'; 
  color: string; 
  needsManualCut?: boolean; 
}

export interface PlacedPart extends NestingPart { 
  x: number; 
  y: number; 
  isRotated: boolean; 
}

export interface Remnant { id: string; x: number; y: number; width: number; height: number; }
export interface CutLine { id: string; type: 'horizontal' | 'vertical'; coord: number; start: number; end: number; opType: string; label: string; }

export interface EnhancedNestingResult { 
  strategyName: string;
  placedParts: PlacedPart[]; 
  cutLines: CutLine[]; 
  remnants: Remnant[]; 
  efficiency: number; 
  totalLinearCut: number; 
  partsLinearCut: number; 
  remnantsLinearCut: number; 
  usedArea: number;
  wasteArea: number;
  kerfArea: number; 
  manualCutsCount: number;
}

export interface Toast { id: string; message: string; type: 'success' | 'error' | 'info'; }
export interface Expense { id: string; description: string; amount: number; date: string; category: string; updatedAt?: number; }
export interface Employee { id: string; name: string; role: string; salary: number; updatedAt?: number; }
