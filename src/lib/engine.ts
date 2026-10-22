// ================================================================
// DULCE ARTE ERP — Business Engine
// Zero-Sum Sliders · Waste Engine · Price Calculator (Decimal.js)
// ALL monetary/weight math uses Decimal.js — NO native floats
// ================================================================

import Decimal from 'decimal.js';
import type { RecipeCosts, RecipePrices, AppSettings } from '../types';

// Configure Decimal for maximum precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ── Helper: safe Decimal conversion ───────────────────────────
const D = (v: number | string) => new Decimal(v);

// ═══════════════════════════════════════════════════════════════
// ZERO-SUM SLIDER ALGORITHM
// ═══════════════════════════════════════════════════════════════

export interface SliderItem {
  id: number;
  materialId: number;
  pct: number;          // 0–100
  isLocked: boolean;
  errorTolPct: number;
  costPerMg: number;    // from rawMaterials
}

/**
 * Redistributes percentage among unlocked sliders when one moves.
 * Formula: P′j = R × [Pj ÷ ∑Pk]  (k = unlocked items ≠ moved)
 */
export function redistributeSliders(
  items: SliderItem[],
  movedId: number,
  newPct: number
): SliderItem[] {
  const lockedSum = items
    .filter(i => i.isLocked)
    .reduce((acc, i) => acc.plus(D(i.pct)), D(0));

  const maxForMoved = D(100).minus(lockedSum);

  // Clamp newPct so it never exceeds 100 − P_locked
  const clampedPct = D(Math.min(newPct, maxForMoved.toNumber()));

  const unlocked = items.filter(i => !i.isLocked && i.id !== movedId);
  const R = maxForMoved.minus(clampedPct);

  const unlockedSum = unlocked.reduce((acc, i) => acc.plus(D(i.pct)), D(0));

  return items.map(item => {
    if (item.id === movedId) return { ...item, pct: clampedPct.toNumber() };
    if (item.isLocked) return item;

    let newPctVal: Decimal;
    if (unlockedSum.isZero()) {
      // Divide R equally among unlocked items
      newPctVal = R.div(D(unlocked.length));
    } else {
      newPctVal = R.mul(D(item.pct)).div(unlockedSum);
    }

    return { ...item, pct: newPctVal.toDecimalPlaces(4).toNumber() };
  });
}

/**
 * Recalculate absolute weights (in mg) from percentages and batch weight.
 */
export function calcWeightsFromPct(
  items: SliderItem[],
  batchWeightG: number
): { id: number; netWeightMg: number }[] {
  const batchMg = D(batchWeightG).mul(1000);
  return items.map(item => ({
    id: item.id,
    netWeightMg: batchMg.mul(D(item.pct)).div(100).toDecimalPlaces(0).toNumber()
  }));
}

/**
 * Scale all items to a new batch weight, preserving percentages.
 */
export function scaleBatch(
  items: SliderItem[],
  newBatchWeightG: number
): { id: number; netWeightMg: number }[] {
  return calcWeightsFromPct(items, newBatchWeightG);
}

// ═══════════════════════════════════════════════════════════════
// WASTE ENGINE (3 LAYERS)
// ═══════════════════════════════════════════════════════════════

export interface WasteParams {
  coldWastePct: number;     // Mfrío
  thermalWastePct: number;  // Mterm
}

/**
 * Gross weight deducted from stock (includes cold waste + item error tolerance).
 * Peso Bruto = Peso Neto × (1 + Mfrío) × (1 + Eitem)
 */
export function grossWeightMg(netMg: number, params: WasteParams, errorTolPct: number): number {
  return D(netMg)
    .mul(D(1).plus(D(params.coldWastePct).div(100)))
    .mul(D(1).plus(D(errorTolPct).div(100)))
    .toDecimalPlaces(0)
    .toNumber();
}

/**
 * Final baked weight (after thermal/oven loss).
 * Peso Final = Peso Crudo Total × (1 − Mterm)
 */
export function finalBakedWeightG(crudeWeightG: number, params: WasteParams): number {
  return D(crudeWeightG)
    .mul(D(1).minus(D(params.thermalWastePct).div(100)))
    .toDecimalPlaces(3)
    .toNumber();
}

/**
 * Cost per gram of final baked product.
 * Costo/g = Costo Total Lote ÷ Peso Final
 */
export function costPerGramFinal(totalCost: number, finalWeightG: number): number {
  if (finalWeightG === 0) return 0;
  return D(totalCost).div(D(finalWeightG)).toDecimalPlaces(6).toNumber();
}

/**
 * Semaphore check: compares actual vs recipe weight.
 */
export function semaphoreCheck(
  actualMg: number,
  recipeMg: number,
  errorTolPct: number
): 'green' | 'yellow' | 'red' {
  if (recipeMg === 0) return 'green';
  const deviation = D(Math.abs(actualMg - recipeMg)).div(D(recipeMg)).mul(100).toNumber();
  if (deviation <= errorTolPct) return 'green';
  if (deviation <= errorTolPct + 3) return 'yellow';
  return 'red';
}

// ═══════════════════════════════════════════════════════════════
// COST ENGINE (4 LAYERS)
// ═══════════════════════════════════════════════════════════════

export function calcRecipeCosts(
  items: (SliderItem & { netWeightMg: number })[],
  packagingCost: number,
  laborCostMin: number,
  ovenCostMin: number,
  laborRatePerMin: number,
  ovenRatePerMin: number,
  wasteParams: WasteParams
): RecipeCosts {
  // Layer 1: Ingredients (with waste)
  const ingredientsCost = items.reduce((acc, item) => {
    const gross = grossWeightMg(item.netWeightMg, wasteParams, item.errorTolPct);
    return acc.plus(D(gross).mul(D(item.costPerMg)));
  }, D(0));

  // Layer 2: Packaging
  const packCost = D(packagingCost);

  // Layer 3: Labor + oven energy
  const laborOven = D(laborCostMin).mul(D(laborRatePerMin))
    .plus(D(ovenCostMin).mul(D(ovenRatePerMin)));

  // Cbase
  const baseTotal = ingredientsCost.plus(packCost).plus(laborOven);

  // Final weight
  const batchCrudeG = items.reduce((acc, i) => acc + i.netWeightMg, 0) / 1000;
  const finalWeightG = finalBakedWeightG(batchCrudeG, wasteParams);

  return {
    ingredients: ingredientsCost.toDecimalPlaces(4).toNumber(),
    packaging: packCost.toDecimalPlaces(4).toNumber(),
    laborAndOven: laborOven.toDecimalPlaces(4).toNumber(),
    baseTotal: baseTotal.toDecimalPlaces(4).toNumber(),
    finalWeightG,
    costPerG: costPerGramFinal(baseTotal.toNumber(), finalWeightG)
  };
}

// ═══════════════════════════════════════════════════════════════
// PRICE ENGINE (4 PRICES)
// ═══════════════════════════════════════════════════════════════

export function calcPrices(
  cbase: number,
  settings: Pick<AppSettings, 'taxPct' | 'cogsPct' | 'wholesalePct'>,
  complexityPct = 30,   // Premium surcharge (25–40%)
  yieldUnits = 1
): RecipePrices {
  const Cbase = D(cbase);
  const tax   = D(1).plus(D(settings.taxPct).div(100));
  // minimum margin = 15%
  const floorMargin = D(1).minus(D(0.15));
  // target margin from settings
  const targetMargin = D(1).minus(D(settings.cogsPct).div(100));

  // Precio Piso: [Cbase ÷ (1 − 15%)] × (1 + IVA)
  const piso = Cbase.div(floorMargin).mul(tax);

  // Precio Óptimo: [Cbase ÷ (1 − MargenMeta)] × (1 + IVA)
  const optimo = Cbase.div(targetMargin).mul(tax);

  // Precio Premium: Óptimo × (1 + complejidad%)
  const premium = optimo.mul(D(1).plus(D(complexityPct).div(100)));

  // Precio al Mayor: Óptimo × (1 − %Mayor)
  // Guarded: never below Precio Piso
  const mayorRaw = optimo.mul(D(1).minus(D(settings.wholesalePct).div(100)));
  const mayor = Decimal.max(mayorRaw, piso);

  const safeYield = Math.max(1, yieldUnits || 1);
  const pisoNum = applyRounding(piso).toNumber();
  const optimoNum = applyRounding(optimo).toNumber();
  const premiumNum = applyRounding(premium).toNumber();
  const mayorNum = applyRounding(mayor).toNumber();

  return {
    piso:        pisoNum,
    optimo:      optimoNum,
    premium:     premiumNum,
    mayor:       mayorNum,
    wholesalePct: settings.wholesalePct,
    unitPiso:    applyRounding(D(pisoNum).div(safeYield)).toNumber(),
    unitOptimo:  applyRounding(D(optimoNum).div(safeYield)).toNumber(),
    unitPremium: applyRounding(D(premiumNum).div(safeYield)).toNumber(),
    unitMayor:   applyRounding(D(mayorNum).div(safeYield)).toNumber()
  };
}

function applyRounding(d: Decimal): Decimal {
  return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

// ── Inverse Simulator (Target Costing) ────────────────────────
/**
 * Given a desired sell price, compute max Cbase.
 * CbaseMáximo = [Precio Meta ÷ (1 + IVA)] × (1 − MargenMeta)
 */
export function calcMaxCbase(
  targetPrice: number,
  taxPct: number,
  cogsPct: number
): number {
  return D(targetPrice)
    .div(D(1).plus(D(taxPct).div(100)))
    .mul(D(1).minus(D(cogsPct).div(100)))
    .toDecimalPlaces(4)
    .toNumber();
}

// ═══════════════════════════════════════════════════════════════
// AI QUERY BUILDER
// ═══════════════════════════════════════════════════════════════

export type AiMode = 'market' | 'recipe' | 'social';

export interface AiQueryParams {
  businessName: string;
  recipeName: string;
  description: string;
  finalWeightG: number;
  items: Array<{ name: string; weightG: number; pct: number; cost: number }>;
  packagingDetail: string;
  packagingCost: number;
  costs: RecipeCosts;
  prices: RecipePrices;
  taxPct: number;
  state: string;
  city: string;
  zoneType: string;
  mode: AiMode;
}

export function buildAiQuery(p: AiQueryParams): string {
  const itemsList = p.items
    .map(i => `  • ${i.name}: ${i.weightG.toFixed(1)} g / ${i.pct.toFixed(1)}% → $${i.cost.toFixed(4)}`)
    .join('\n');

  const base = `Tengo la repostería "${p.businessName}" y quiero que analices como consultor gastronómico y comercial la viabilidad de este producto:

• Producto: ${p.recipeName} — ${p.description}
  Rendimiento: ${p.finalWeightG.toFixed(0)} g finales horneados

• Ingredientes utilizados (mermas incluidas):
${itemsList}

• Empaque: ${p.packagingDetail} ($${p.packagingCost.toFixed(2)})

• Cálculos exactos de mi sistema:
  Costo MP + Empaque:     $${p.costs.ingredients.toFixed(2)}
  Mano de obra y energía: $${p.costs.laborAndOven.toFixed(2)}
  Costo Base Total:       $${p.costs.baseTotal.toFixed(2)}
  Impuestos:              ${p.taxPct}%

• Precios calculados:
  Precio Piso:    $${p.prices.piso.toFixed(2)}
  Precio Óptimo:  $${p.prices.optimo.toFixed(2)}  ← precio recomendado
  Precio Premium: $${p.prices.premium.toFixed(2)}
  Precio al Mayor: $${p.prices.mayor.toFixed(2)} (${p.prices.wholesalePct}% descuento)

• Mercado: ${p.state}, ${p.city} (${p.zoneType})`;

  switch (p.mode) {
    case 'market':
      return base + `

Dime específicamente:
(1) En qué posición del mercado en ${p.state}, ${p.city} funcionaría este producto (económico, gama media o gourmet) y si el precio de $${p.prices.optimo.toFixed(2)} es competitivo.
(2) Qué ajuste técnico recomiendas en la proporción de ingredientes para optimizar textura, humedad o conservación.
(3) Argumentos de venta para defender este precio ante el cliente.`;

    case 'recipe':
      return base + `

Dime específicamente:
(1) Evaluación del balance de grasas, azúcares y humedad de esta fórmula.
(2) Cómo abaratar un 10% el costo sin perder calidad percibida (sustituciones de ingredientes).
(3) Ajustes de cocción o técnica para mejorar rendimiento horneado.`;

    case 'social':
      return base + `

Redacta para mí:
(1) Un texto persuasivo para estado de WhatsApp (máx 200 caracteres) resaltando los ingredientes nobles.
(2) Un caption para Instagram (con emojis y hashtags) que destaque el producto como artesanal y premium.
(3) Un argumento de venta para responder si el cliente dice "está muy caro".`;
  }
}
