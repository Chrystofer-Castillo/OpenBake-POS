// ================================================================
// DULCE ARTE ERP — Type Definitions (Single Source of Truth)
// ================================================================

// ── App Settings ──────────────────────────────────────────────
export interface AppSettings {
  id: 1;
  businessName: string;
  logoPath: string | null;
  rif: string | null;
  phone: string | null;
  address: string | null;
  country: string;
  state: string;
  city: string;
  zoneType: string;
  waTemplate: string;
  taxPct: number;
  cogsPct: number;
  opexPct: number;
  ownerSalaryPct: number;
  reinvestPct: number;
  netProfitPct: number;
  wholesalePct: number;
  bcvRate: number;
  theme: string;         // Theme ID (e.g. 'vainilla', 'fresa', 'chocolate-negro')
  updatedAt: string;
}

// ── Raw Materials / Inventory ──────────────────────────────────
export type MaterialType = 'INSUMO' | 'EMPAQUE';
export type UnitType = 'mg' | 'g' | 'kg' | 'ml' | 'l' | 'und';

export interface RawMaterial {
  id: number;
  name: string;
  type: MaterialType;
  unit: UnitType;
  stockMg: number;        // always stored in mg internally
  minStock: number;       // alert threshold in mg
  costPerUnit: number;
  buyUnit: string;
  buyQtyMg: number;
  createdAt: string;
  updatedAt: string;
  // computed
  stockStatus?: 'ok' | 'low' | 'critical';
  costPerMg?: number;
}

// ── Recipes ────────────────────────────────────────────────────
export type PriceMode = 'DYNAMIC' | 'FIXED';
export type RoundingMode = 'NONE' | 'PSYCHOLOGICAL' | 'ROUND';

export interface Recipe {
  id: number;
  name: string;
  description: string | null;
  batchWeightG: number;
  coldWastePct: number;
  thermalWastePct: number;
  laborCostMin: number;
  ovenCostMin: number;
  priceMode: PriceMode;
  fixedPrice: number | null;
  competitorPrice: number | null;
  roundingMode: RoundingMode;
  isArchived: number;
  createdAt: string;
  updatedAt: string;
  // computed / joined
  items?: RecipeItem[];
  costs?: RecipeCosts;
  prices?: RecipePrices;
}

export interface RecipeItem {
  id: number;
  recipeId: number;
  materialId: number;
  pctValue: number;
  netWeightMg: number;
  isLocked: number;
  errorTolPct: number;
  sortOrder: number;
  // joined
  materialName?: string;
  grossWeightMg?: number;
  costAmount?: number;
}

export interface RecipeCosts {
  ingredients: number;    // cost of raw materials with waste
  packaging: number;
  laborAndOven: number;
  baseTotal: number;      // Cbase
  finalWeightG: number;   // after thermal waste
  costPerG: number;
}

export interface RecipePrices {
  piso: number;           // floor price
  optimo: number;         // optimal price (highlighted in gold)
  premium: number;        // premium price
  mayor: number;          // wholesale price
  wholesalePct: number;   // configured discount %
}

// ── Customers ─────────────────────────────────────────────────
export interface Customer {
  id: number;
  cedulaRif: string;
  fullName: string;
  phoneWa: string | null;
  address: string | null;
  notes: string | null;
  defaultPriceMode: PriceMode;
  totalDebt: number;
  paymentDueDate: string | null;   // ISO date string for payment deadline
  createdAt: string;
  updatedAt: string;
  // computed
  solvencyStatus?: 'ok' | 'debt' | 'overdue';
}

export interface CustomerIntention {
  id: number;
  customerId: number;
  recipeId: number | null;
  recipeNameSnap: string;
  quotedPrice: number;
  priceMode: PriceMode;
  reasonNotBought: string | null;
  createdAt: string;
}

// ── Invoices ───────────────────────────────────────────────────
export type ExitType = 'VENTA' | 'CREDITO' | 'REGALO' | 'COMIDO' | 'PERDIDO';

export interface Invoice {
  id: number;
  serialCode: string;
  customerId: number | null;
  customerSnap: string;
  exitType: ExitType;
  total: number;
  paid: number;
  dueDate: string | null;
  notes: string | null;
  sha256: string;
  createdAt: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  recipeId: number | null;
  recipeNameSnap: string;
  qty: number;
  unitPriceCharged: number;
  unitBaseCostSnapshot: number;
}

// ── Billboard / Financial Panel ────────────────────────────────
export interface BillboardData {
  period: { start: string; end: string };
  grossIncome: number;
  realCash: number;
  accountsReceivable: number;
  cogsPct: number;
  cogsTarget: number;
  opexPct: number;
  opexTarget: number;
  leaksCost: number;        // gifts + eaten + lost
  ownerSalary: number;
  netProfit: number;
  deviations: Deviation[];
}

export interface Deviation {
  label: string;
  actual: number;
  target: number;
  status: 'ok' | 'warn' | 'danger';
}

// ── AI Query Builder ──────────────────────────────────────────
export type AiQueryMode = 'market' | 'recipe' | 'social';

// ── Theme System ──────────────────────────────────────────────
export interface ThemeOption {
  id: string;
  name: string;
  emoji: string;
  isDark: boolean;
  colors: {
    bg: string;
    sidebar: string;
    accent: string;
    text: string;
  };
}
