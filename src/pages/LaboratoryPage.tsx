import { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import {
  Lock, Unlock, Sparkles, Copy, Check, Save,
  Plus, Trash2, CheckCircle2, Sliders, Wheat, Utensils
} from 'lucide-react';
import {
  calcRecipeCosts,
  calcPrices,
  buildAiQuery,
  redistributeSliders,
  type SliderItem
} from '../lib/engine';
import type { RecipeItem, KitchenUnit, FormulationMode } from '../types';

// Kitchen Units Dictionary with conversions to grams
export const CULINARY_UNITS: Record<KitchenUnit, {
  label: string;
  name: string;
  short: string;
  toGrams: number;
  step: number;
  quickDeltas: number[];
  type: 'weight' | 'volume' | 'count';
  description: string;
}> = {
  g: {
    label: 'g (Gramos)',
    name: 'Gramos',
    short: 'g',
    toGrams: 1,
    step: 1,
    quickDeltas: [-50, -10, 10, 50],
    type: 'weight',
    description: 'Peso estándar en gramos'
  },
  kg: {
    label: 'kg (Kilos)',
    name: 'Kilos',
    short: 'kg',
    toGrams: 1000,
    step: 0.1,
    quickDeltas: [-0.5, -0.1, 0.1, 0.5],
    type: 'weight',
    description: '1 kg = 1,000 g'
  },
  ml: {
    label: 'ml (Mililitros)',
    name: 'Mililitros',
    short: 'ml',
    toGrams: 1,
    step: 10,
    quickDeltas: [-50, -10, 10, 50],
    type: 'volume',
    description: '1 ml ≈ 1 g de agua/leche'
  },
  l: {
    label: 'L (Litros)',
    name: 'Litros',
    short: 'L',
    toGrams: 1000,
    step: 0.1,
    quickDeltas: [-0.5, -0.1, 0.1, 0.5],
    type: 'volume',
    description: '1 L = 1,000 ml ≈ 1,000 g'
  },
  cda: {
    label: 'cda (Cucharada sopera ~15g)',
    name: 'Cucharada',
    short: 'cda',
    toGrams: 15,
    step: 0.5,
    quickDeltas: [-2, -1, 1, 2],
    type: 'volume',
    description: '1 cda ≈ 15 g / 15 ml'
  },
  cdta: {
    label: 'cdta (Cucharadita ~5g)',
    name: 'Cucharadita',
    short: 'cdta',
    toGrams: 5,
    step: 0.5,
    quickDeltas: [-2, -1, 1, 2],
    type: 'volume',
    description: '1 cdta ≈ 5 g / 5 ml'
  },
  taza: {
    label: 'taza (Taza repostera ~240g)',
    name: 'Taza',
    short: 'taza',
    toGrams: 240,
    step: 0.25,
    quickDeltas: [-1, -0.5, 0.5, 1],
    type: 'volume',
    description: '1 taza estándar ≈ 240 g / 240 ml'
  },
  und: {
    label: 'und (Unidad / Huevo ~50g)',
    name: 'Unidad',
    short: 'und',
    toGrams: 50,
    step: 1,
    quickDeltas: [-2, -1, 1, 2],
    type: 'count',
    description: '1 huevo / unidad mediana ≈ 50 g'
  },
  pizca: {
    label: 'pizca (Pizca ~1g)',
    name: 'Pizca',
    short: 'pizca',
    toGrams: 1,
    step: 1,
    quickDeltas: [-1, 1],
    type: 'weight',
    description: '1 pizca ≈ 1 g'
  }
};

// Palette of pastel colors for ingredient sliders
const PASTEL_COLORS = [
  '#E8B996', // Harina / Peach
  '#B8A9E5', // Azúcar / Lilac
  '#4A2C1D', // Cacao / Chocolate
  '#F2A9B8', // Mantequilla / Soft Pink
  '#88D4C8', // Otros / Mint
  '#F4C27F', // Amarillo suave
  '#A0C4E2', // Azul pastel
  '#D7B29D'  // Canela
];

export default function LaboratoryPage() {
  const settings = useAppStore(s => s.settings);
  const materials = useAppStore(s => s.materials);
  const recipes = useAppStore(s => s.recipes);
  const addRecipe = useAppStore(s => s.addRecipe);
  const updateRecipe = useAppStore(s => s.updateRecipe);
  const deleteRecipe = useAppStore(s => s.deleteRecipe);
  const addMaterial = useAppStore(s => s.addMaterial);
  const pushAlert = useAppStore(s => s.pushAlert);

  // New Recipe Modal State
  const [isNewRecipeModalOpen, setIsNewRecipeModalOpen] = useState(false);
  const [newRecipeName, setNewRecipeName] = useState('');
  const [newBatchWeight, setNewBatchWeight] = useState<number>(1000);
  const [newThermalWaste, setNewThermalWaste] = useState<number>(10);

  // Active selected recipe
  const [selectedRecipeId, setSelectedRecipeId] = useState<number>(recipes[0]?.id || 1);
  const activeRecipe = recipes.find(r => r.id === selectedRecipeId) || recipes[0];

  // Formulation Mode: DIRECT_WEIGHT (Medidas libres de cocina) | DYNAMIC_PCT (Balance dinámico %) | BAKERS_PCT (% Panadero)
  const [formulationMode, setFormulationMode] = useState<FormulationMode>(
    (activeRecipe?.formulationMode as FormulationMode) || 'DIRECT_WEIGHT'
  );

  // Yield & Portioning (Rendimiento del Lote)
  const [yieldUnits, setYieldUnits] = useState<number>(activeRecipe?.yieldUnits || 1);
  const [unitName, setUnitName] = useState<string>(activeRecipe?.unitName || 'porciones');

  // Dynamic pricing auto-sync toggle (bottom bar)
  const [autoSyncPrice, setAutoSyncPrice] = useState(true);

  // Recipe specs
  const [recipeName, setRecipeName] = useState(activeRecipe?.name || 'Torta de Chocolate Húmeda');
  const [batchWeightG, setBatchWeightG] = useState<number>(activeRecipe?.batchWeightG || 1000);
  const [coldWastePct, setColdWastePct] = useState<number>(activeRecipe?.coldWastePct || 3.0);
  const [thermalWastePct, setThermalWastePct] = useState<number>(activeRecipe?.thermalWastePct || 12.0);
  const [errorMarginPct, setErrorMarginPct] = useState<number>(2.0);
  const [packagingCost, setPackagingCost] = useState<number>(1.20);
  const [laborAndServices, setLaborAndServices] = useState<number>(1.30);
  const [wholesaleCustomPct, setWholesaleCustomPct] = useState<number>(settings.wholesalePct || 18);

  // AI Modal
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiMode, setAiMode] = useState<'market' | 'recipe' | 'social'>('market');
  const [copied, setCopied] = useState(false);

  // Custom Ingredient Modal State
  const [isCustomMatModalOpen, setIsCustomMatModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState<KitchenUnit>('g');
  const [customQty, setCustomQty] = useState<number>(100);
  const [customCostPerKg, setCustomCostPerKg] = useState<number>(5.00);

  // Interface for local item state with kitchen units and grams
  interface FormulaItemState extends SliderItem {
    grams: number;
    unit: KitchenUnit;
    qty: number;
  }

  // Formula Items state
  const [formulaItems, setFormulaItems] = useState<FormulaItemState[]>(() => {
    const initBatch = activeRecipe?.batchWeightG || 1000;
    if (activeRecipe?.items?.length) {
      return activeRecipe.items.map(it => {
        const mat = materials.find(m => m.id === it.materialId);
        const itemGrams = it.netWeightMg ? it.netWeightMg / 1000 : (initBatch * it.pctValue) / 100;
        const itemUnit: KitchenUnit = it.unit || 'g';
        const factor = CULINARY_UNITS[itemUnit]?.toGrams || 1;
        const itemQty = it.displayQty != null ? it.displayQty : (itemUnit === 'g' ? itemGrams : Number((itemGrams / factor).toFixed(2)));
        return {
          id: it.id,
          materialId: it.materialId,
          pct: it.pctValue,
          grams: itemGrams,
          unit: itemUnit,
          qty: itemQty,
          isLocked: it.isLocked === 1,
          errorTolPct: it.errorTolPct,
          costPerMg: mat?.costPerMg || 0.000003
        };
      });
    }
    return [
      { id: 1, materialId: 0, pct: 50, grams: 500, unit: 'g', qty: 500, isLocked: false, errorTolPct: 2, costPerMg: 0.0000015 },
      { id: 2, materialId: 0, pct: 30, grams: 300, unit: 'g', qty: 300, isLocked: false, errorTolPct: 2, costPerMg: 0.0000014 },
      { id: 3, materialId: 0, pct: 20, grams: 200, unit: 'g', qty: 200, isLocked: false, errorTolPct: 2, costPerMg: 0.0000050 }
    ];
  });

  // Ingredient Names map
  const [customNamesMap, setCustomNamesMap] = useState<Record<number, string>>({
    1: 'Harina de Trigo / Base',
    2: 'Azúcar / Endulzante',
    3: 'Líquido / Sabor'
  });

  // Switch recipe helper
  const handleSelectRecipe = (id: number) => {
    setSelectedRecipeId(id);
    const r = recipes.find(x => x.id === id);
    if (!r) return;
    setRecipeName(r.name);
    setBatchWeightG(r.batchWeightG);
    setColdWastePct(r.coldWastePct);
    setThermalWastePct(r.thermalWastePct);
    setFormulationMode((r.formulationMode as FormulationMode) || 'DIRECT_WEIGHT');
    setYieldUnits(r.yieldUnits || 1);
    setUnitName(r.unitName || 'porciones');
    if (r.items?.length) {
      const names: Record<number, string> = {};
      const nextItems: FormulaItemState[] = r.items.map((it, idx) => {
        const mat = materials.find(m => m.id === it.materialId);
        const itemName = it.materialName || mat?.name || `Ingrediente ${idx + 1}`;
        names[it.id] = itemName;
        const itemGrams = it.netWeightMg ? it.netWeightMg / 1000 : (r.batchWeightG * it.pctValue) / 100;
        const itemUnit: KitchenUnit = it.unit || 'g';
        const factor = CULINARY_UNITS[itemUnit]?.toGrams || 1;
        const itemQty = it.displayQty != null ? it.displayQty : (itemUnit === 'g' ? itemGrams : Number((itemGrams / factor).toFixed(2)));
        return {
          id: it.id,
          materialId: it.materialId,
          pct: it.pctValue,
          grams: itemGrams,
          unit: itemUnit,
          qty: itemQty,
          isLocked: it.isLocked === 1,
          errorTolPct: it.errorTolPct,
          costPerMg: mat?.costPerMg || 0.000003
        };
      });
      setCustomNamesMap(names);
      setFormulaItems(nextItems);
    }
  };

  // 1. Direct culinary quantity input: modifies only this ingredient and dynamically sums total batch weight
  const handleQuantityChange = (itemId: number, newQty: number) => {
    const safeQty = Math.max(0, newQty);
    setFormulaItems(prev => {
      const next = prev.map(item => {
        if (item.id === itemId) {
          const factor = CULINARY_UNITS[item.unit]?.toGrams || 1;
          const newGrams = Number((safeQty * factor).toFixed(1));
          return { ...item, qty: safeQty, grams: newGrams };
        }
        return item;
      });
      const totalG = next.reduce((sum, item) => sum + item.grams, 0);
      setBatchWeightG(totalG > 0 ? Number(totalG.toFixed(1)) : 1);
      return next.map(item => ({
        ...item,
        pct: totalG > 0 ? Number(((item.grams / totalG) * 100).toFixed(2)) : 0
      }));
    });
  };

  // 2. Unit change: keeps the physical weight and converts the displayed quantity into the new unit
  const handleUnitChange = (itemId: number, newUnit: KitchenUnit) => {
    setFormulaItems(prev => {
      const next = prev.map(item => {
        if (item.id === itemId) {
          const newFactor = CULINARY_UNITS[newUnit]?.toGrams || 1;
          const newQty = Number((item.grams / newFactor).toFixed(2));
          return { ...item, unit: newUnit, qty: newQty };
        }
        return item;
      });
      return next;
    });
  };

  // 3. Quick adjustment (+1, +10, +50, etc.) in the item's current unit without reducing other ingredients
  const handleAdjustQty = (itemId: number, delta: number) => {
    setFormulaItems(prev => {
      const target = prev.find(i => i.id === itemId);
      if (!target) return prev;
      const safeQty = Math.max(0, Number((target.qty + delta).toFixed(2)));
      const factor = CULINARY_UNITS[target.unit]?.toGrams || 1;
      const newGrams = Number((safeQty * factor).toFixed(1));
      const next = prev.map(item => item.id === itemId ? { ...item, qty: safeQty, grams: newGrams } : item);
      const totalG = next.reduce((sum, item) => sum + item.grams, 0);
      setBatchWeightG(totalG > 0 ? Number(totalG.toFixed(1)) : 1);
      return next.map(item => ({
        ...item,
        pct: totalG > 0 ? Number(((item.grams / totalG) * 100).toFixed(2)) : 0
      }));
    });
  };

  // 4. Dynamic Sliders Mode (% Balance): rebalances unlocked items proportionally to maintain 100%
  const handleDynamicSliderChange = (itemId: number, newPct: number) => {
    setFormulaItems(prev => {
      const rebalanced = redistributeSliders(prev, itemId, newPct);
      return rebalanced.map(item => {
        const orig = prev.find(p => p.id === item.id);
        const itemUnit: KitchenUnit = orig?.unit || 'g';
        const factor = CULINARY_UNITS[itemUnit]?.toGrams || 1;
        const g = Number(((item.pct * batchWeightG) / 100).toFixed(1));
        return {
          ...item,
          unit: itemUnit,
          grams: g,
          qty: Number((g / factor).toFixed(2))
        };
      });
    });
  };

  // 5. Dynamic batch weight input in Dynamic Mode: scales item weights proportionally to new batch size
  const handleDynamicBatchWeightChange = (newTotalG: number) => {
    const safeTotal = Math.max(1, newTotalG);
    setBatchWeightG(safeTotal);
    setFormulaItems(prev => prev.map(item => {
      const g = Number(((item.pct * safeTotal) / 100).toFixed(1));
      const factor = CULINARY_UNITS[item.unit]?.toGrams || 1;
      return {
        ...item,
        grams: g,
        qty: Number((g / factor).toFixed(2))
      };
    }));
  };

  // 6. Baker's % change: calculates grams relative to the base flour (item index 0 = 100%)
  const handleBakersPctChange = (itemId: number, newBakersPct: number) => {
    const baseG = formulaItems[0]?.grams || 1;
    const safeBakersPct = Math.max(0, newBakersPct);
    const newGrams = Number((baseG * (safeBakersPct / 100)).toFixed(1));
    setFormulaItems(prev => {
      const next = prev.map(item => {
        if (item.id === itemId) {
          const factor = CULINARY_UNITS[item.unit]?.toGrams || 1;
          return {
            ...item,
            grams: newGrams,
            qty: Number((newGrams / factor).toFixed(2))
          };
        }
        return item;
      });
      const totalG = next.reduce((sum, item) => sum + item.grams, 0);
      setBatchWeightG(totalG > 0 ? Number(totalG.toFixed(1)) : 1);
      return next.map(item => ({
        ...item,
        pct: totalG > 0 ? Number(((item.grams / totalG) * 100).toFixed(2)) : 0
      }));
    });
  };

  // 7. Base Flour weight change in Baker's % mode: scales all ingredients according to their baker percentages
  const handleBaseFlourGramsChange = (newBaseG: number) => {
    const safeBase = Math.max(1, newBaseG);
    setFormulaItems(prev => {
      const oldBase = prev[0]?.grams || 1;
      const next = prev.map((item, idx) => {
        if (idx === 0) {
          const factor = CULINARY_UNITS[item.unit]?.toGrams || 1;
          return { ...item, grams: safeBase, qty: Number((safeBase / factor).toFixed(2)) };
        }
        const bPct = (item.grams / oldBase) * 100;
        const newG = Number((safeBase * (bPct / 100)).toFixed(1));
        const factor = CULINARY_UNITS[item.unit]?.toGrams || 1;
        return { ...item, grams: newG, qty: Number((newG / factor).toFixed(2)) };
      });
      const totalG = next.reduce((sum, item) => sum + item.grams, 0);
      setBatchWeightG(totalG > 0 ? Number(totalG.toFixed(1)) : 1);
      return next.map(item => ({
        ...item,
        pct: totalG > 0 ? Number(((item.grams / totalG) * 100).toFixed(2)) : 0
      }));
    });
  };

  // Target Total Weight Scaler (Production Calculator): scales all ingredients proportionally
  const handleScaleToTargetWeight = (targetTotalG: number) => {
    if (targetTotalG <= 0 || batchWeightG <= 0) return;
    const ratio = targetTotalG / batchWeightG;
    setBatchWeightG(targetTotalG);
    setFormulaItems(prev => prev.map(item => {
      const newG = Number((item.grams * ratio).toFixed(1));
      const factor = CULINARY_UNITS[item.unit]?.toGrams || 1;
      return {
        ...item,
        grams: newG,
        qty: Number((newG / factor).toFixed(2))
      };
    }));
    pushAlert({ type: 'info', message: `Receta escalada a ${targetTotalG}g totales de masa` });
  };

  // Batch Scaling factor (x1.5, x2, x3, x5, x10)
  const handleScaleBatch = (factor: number) => {
    if (factor <= 0) return;
    const newTotal = Number((batchWeightG * factor).toFixed(0));
    setBatchWeightG(newTotal);
    setFormulaItems(prev => prev.map(item => {
      const newG = Number((item.grams * factor).toFixed(1));
      const factorU = CULINARY_UNITS[item.unit]?.toGrams || 1;
      return {
        ...item,
        grams: newG,
        qty: Number((newG / factorU).toFixed(2))
      };
    }));
    pushAlert({ type: 'info', message: `Receta escalada x${factor} (${newTotal}g totales de mezcla)` });
  };

  const toggleLock = (id: number) => {
    setFormulaItems(prev => prev.map(item =>
      item.id === id ? { ...item, isLocked: !item.isLocked } : item
    ));
  };

  const handleRemoveItem = (id: number) => {
    if (formulaItems.length <= 1) {
      pushAlert({ type: 'warn', message: 'La receta debe contener al menos 1 ingrediente.' });
      return;
    }
    setFormulaItems(prev => {
      const filtered = prev.filter(i => i.id !== id);
      const totalG = filtered.reduce((sum, item) => sum + item.grams, 0);
      setBatchWeightG(totalG > 0 ? Number(totalG.toFixed(1)) : 1);
      return filtered.map(item => ({
        ...item,
        pct: totalG > 0 ? Number(((item.grams / totalG) * 100).toFixed(2)) : 0
      }));
    });
  };

  // Add custom ingredient on the fly with culinary unit
  const handleAddCustomIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newId = Date.now();
    const unitFactor = CULINARY_UNITS[customUnit]?.toGrams || 1;
    const newGrams = Number((customQty * unitFactor).toFixed(1));
    const newTotal = batchWeightG + newGrams;
    const costPerMg = (customCostPerKg / 1000) / 1000; // $/mg

    // Save to materials inventory
    addMaterial({
      name: customName.trim(),
      type: 'INSUMO',
      unit: customUnit === 'ml' || customUnit === 'l' ? 'l' : (customUnit === 'und' ? 'und' : 'kg'),
      stockMg: newGrams * 1000 * 5,
      minStock: newGrams * 1000,
      costPerUnit: customCostPerKg,
      buyUnit: customUnit === 'ml' || customUnit === 'l' ? 'Litro' : (customUnit === 'und' ? 'Unidad' : 'Kilogramo'),
      buyQtyMg: 1000000
    });

    const newMat = useAppStore.getState().materials.find(m => m.name === customName.trim());
    setCustomNamesMap(prev => ({ ...prev, [newId]: customName.trim() }));

    const newItem: FormulaItemState = {
      id: newId,
      materialId: newMat?.id || 0,
      pct: (newGrams / newTotal) * 100,
      grams: newGrams,
      unit: customUnit,
      qty: customQty,
      isLocked: false,
      errorTolPct: 2.0,
      costPerMg
    };

    setBatchWeightG(newTotal);
    setFormulaItems(prev => {
      const list = [...prev, newItem];
      return list.map(item => ({
        ...item,
        pct: Number(((item.grams / newTotal) * 100).toFixed(2))
      }));
    });

    setIsCustomMatModalOpen(false);
    setCustomName('');
    setCustomQty(100);
    pushAlert({ type: 'success', message: `Ingrediente "${customName}" añadido a la fórmula (${customQty} ${customUnit})` });
  };

  // Calculations
  const calculatedItems = useMemo(() => {
    const baseG = formulaItems[0]?.grams || 1;
    return formulaItems.map((item, idx) => {
      const netMg = Math.round(item.grams * 1000);
      const mat = materials.find(m => m.id === item.materialId);
      const name = customNamesMap[item.id] || mat?.name || `Ingrediente ${idx + 1}`;
      const costPerMg = mat?.costPerMg || item.costPerMg;
      const costAmount = netMg * costPerMg;
      const bakersPct = idx === 0 ? 100 : Number(((item.grams / baseG) * 100).toFixed(1));
      return {
        ...item,
        netWeightMg: netMg,
        netWeightG: item.grams,
        name,
        color: PASTEL_COLORS[idx % PASTEL_COLORS.length],
        costPerMg,
        costAmount,
        bakersPct
      };
    });
  }, [formulaItems, materials, customNamesMap]);

  // Cost calculations
  const costs = useMemo(() => {
    const laborRatePerMin = 0.035;
    const ovenRatePerMin = 0.025;
    const c = calcRecipeCosts(
      calculatedItems,
      packagingCost,
      20,
      15,
      laborRatePerMin,
      ovenRatePerMin,
      { coldWastePct, thermalWastePct }
    );
    // Add manual packaging and labor overrides from panel
    const baseTotal = c.ingredients + packagingCost + laborAndServices;
    const safeYield = Math.max(1, yieldUnits || 1);
    return {
      ...c,
      packaging: packagingCost,
      laborAndOven: laborAndServices,
      baseTotal,
      costPerUnit: baseTotal / safeYield
    };
  }, [calculatedItems, packagingCost, laborAndServices, coldWastePct, thermalWastePct, yieldUnits]);

  // Price calculations
  const prices = useMemo(() => {
    return calcPrices(costs.baseTotal, {
      taxPct: settings.taxPct,
      cogsPct: settings.cogsPct,
      wholesalePct: wholesaleCustomPct
    }, 30, yieldUnits);
  }, [costs.baseTotal, settings.taxPct, settings.cogsPct, wholesaleCustomPct, yieldUnits]);

  // AI Prompt
  const generatedAiPrompt = useMemo(() => {
    return buildAiQuery({
      businessName: settings.businessName,
      recipeName,
      description: 'Elaboración con ingredientes nobles y cálculos exactos de mermas.',
      finalWeightG: costs.finalWeightG,
      items: calculatedItems.map(i => ({
        name: i.name,
        weightG: i.netWeightG,
        pct: i.pct,
        cost: i.netWeightMg * i.costPerMg
      })),
      packagingDetail: 'Caja / Empaque alimentario sellado',
      packagingCost,
      costs,
      prices,
      taxPct: settings.taxPct,
      state: settings.state,
      city: settings.city,
      zoneType: settings.zoneType,
      mode: aiMode
    });
  }, [settings, recipeName, costs, calculatedItems, packagingCost, prices, aiMode]);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generatedAiPrompt);
    setCopied(true);
    pushAlert({ type: 'success', message: '¡Prompt copiado! Listo para pegar en ChatGPT, Claude o DeepSeek.' });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveRecipe = () => {
    const itemsPayload: RecipeItem[] = calculatedItems.map((ci, idx) => ({
      id: ci.id,
      recipeId: selectedRecipeId,
      materialId: ci.materialId,
      pctValue: Number(ci.pct.toFixed(2)),
      netWeightMg: Math.round(ci.grams * 1000),
      isLocked: ci.isLocked ? 1 : 0,
      errorTolPct: ci.errorTolPct,
      sortOrder: idx,
      materialName: ci.name,
      unit: ci.unit,
      displayQty: ci.qty
    }));

    updateRecipe(selectedRecipeId, {
      name: recipeName,
      batchWeightG: Math.round(batchWeightG),
      coldWastePct,
      thermalWastePct,
      yieldUnits,
      unitName,
      formulationMode,
      items: itemsPayload,
      costs,
      prices
    });
    pushAlert({ type: 'success', message: `Receta "${recipeName}" guardada con éxito (Rendimiento: ${yieldUnits} ${unitName})` });
  };

  const handleCreateNewRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipeName.trim()) return;

    const baseName = newRecipeName.trim();
    const newId = addRecipe({
      name: baseName,
      description: 'Fórmula artesanal personalizada',
      batchWeightG: newBatchWeight,
      coldWastePct: 2.5,
      thermalWastePct: newThermalWaste,
      laborCostMin: 15,
      ovenCostMin: 10,
      priceMode: 'DYNAMIC',
      fixedPrice: null,
      competitorPrice: 10.0,
      roundingMode: 'PSYCHOLOGICAL',
      isArchived: 0,
      yieldUnits: 1,
      unitName: 'porciones',
      formulationMode: 'DIRECT_WEIGHT',
      items: [
        { id: Date.now() + 1, recipeId: 0, materialId: 0, pctValue: 50, netWeightMg: newBatchWeight * 500, isLocked: 0, errorTolPct: 2, sortOrder: 0, materialName: 'Base Principal / Harina' },
        { id: Date.now() + 2, recipeId: 0, materialId: 0, pctValue: 30, netWeightMg: newBatchWeight * 300, isLocked: 0, errorTolPct: 2, sortOrder: 1, materialName: 'Líquido / Leche / Agua' },
        { id: Date.now() + 3, recipeId: 0, materialId: 0, pctValue: 20, netWeightMg: newBatchWeight * 200, isLocked: 0, errorTolPct: 2, sortOrder: 2, materialName: 'Endulzante / Sabor' }
      ]
    });

    setIsNewRecipeModalOpen(false);
    setNewRecipeName('');
    handleSelectRecipe(newId);
  };

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      
      {/* VISIBLE RECIPES CATALOG BAR (Solicitud explícita: lista visible de recetas) */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid var(--clr-border-strong)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--clr-text-primary)' }}>
              📋 Catálogo Visible de Recetas ({recipes.length})
            </span>
            <span style={{ fontSize: 12, color: 'var(--clr-text-secondary)' }}>
              Selecciona cualquier fórmula para editarla o crea una nueva
            </span>
          </div>

          <button
            onClick={() => setIsNewRecipeModalOpen(true)}
            className="btn btn-caramel"
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700 }}
          >
            <Plus size={16} />
            <span>+ Crear Nueva Receta</span>
          </button>
        </div>

        {/* Visible Recipe Cards Strip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 6
        }}>
          {recipes.map(r => {
            const isSelected = r.id === selectedRecipeId;
            return (
              <div
                key={r.id}
                onClick={() => handleSelectRecipe(r.id)}
                style={{
                  background: isSelected ? 'var(--clr-gold-500)' : 'var(--clr-bg-card)',
                  color: isSelected ? '#FFFFFF' : 'var(--clr-text-primary)',
                  border: isSelected ? '2px solid var(--clr-gold-600)' : '1px solid var(--clr-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  minWidth: 210,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: isSelected ? '0 4px 14px rgba(223, 152, 50, 0.35)' : 'var(--shadow-sm)',
                  transition: 'all 150ms ease',
                  flexShrink: 0
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <strong style={{ fontSize: 13, lineHeight: 1.2 }}>{r.name}</strong>
                  <span style={{ fontSize: 11, color: isSelected ? 'rgba(255,255,255,0.9)' : 'var(--clr-text-secondary)' }}>
                    Lote: {r.batchWeightG}g · Óptimo: ${r.prices?.optimo ? r.prices.optimo.toFixed(2) : '—'}
                  </span>
                </div>

                {recipes.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`¿Eliminar la receta "${r.name}"?`)) {
                        deleteRecipe(r.id);
                        const remaining = recipes.filter(x => x.id !== r.id);
                        if (remaining[0]) handleSelectRecipe(remaining[0].id);
                      }
                    }}
                    className="btn-ghost"
                    style={{
                      padding: 4,
                      color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--clr-danger)',
                      marginLeft: 8
                    }}
                    title="Eliminar receta"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Header */}
      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="flex items-center gap-3">
          <h1 className="page-title">
            Laboratorio de Formulación - {recipeName}
          </h1>
          <span className="badge badge-gold" style={{ fontSize: 11 }}>
            Lote: {batchWeightG}g
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCustomMatModalOpen(true)}
            className="btn btn-secondary"
            style={{ fontWeight: 700, borderColor: 'var(--clr-gold-500)' }}
          >
            <Plus size={15} color="var(--clr-gold-500)" />
            <span>+ Ingrediente Personalizado</span>
          </button>
          <button onClick={handleSaveRecipe} className="btn btn-primary">
            <Save size={15} />
            <span>Guardar Receta</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Formulation Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: 'var(--space-6)' }}>
        
        {/* Left Column: Sliders & Tolerances */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          {/* Card: Fórmula y Medidas / Porcentajes */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            
            {/* Card Header with Formulation Mode Pills */}
            <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--clr-text-primary)' }}>
                  Fórmula y Medidas
                </h2>
                <span style={{ fontSize: 12, color: 'var(--clr-text-secondary)' }}>
                  Masa Cruda Total: <strong className="font-mono" style={{ color: 'var(--clr-gold-500)', fontSize: 13 }}>{batchWeightG.toFixed(0)}g</strong>
                </span>
              </div>

              {/* Formulation Mode Toggle Tabs */}
              <div style={{
                display: 'inline-flex',
                background: 'var(--clr-bg-subtle)',
                padding: 4,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--clr-border)',
                gap: 4
              }}>
                <button
                  type="button"
                  onClick={() => setFormulationMode('DIRECT_WEIGHT')}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: formulationMode === 'DIRECT_WEIGHT' ? 'var(--clr-gold-500)' : 'transparent',
                    color: formulationMode === 'DIRECT_WEIGHT' ? '#FFFFFF' : 'var(--clr-text-secondary)',
                    boxShadow: formulationMode === 'DIRECT_WEIGHT' ? '0 2px 8px rgba(217,119,6,0.3)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  title="Formular receta usando medidas de cocina libres (cucharadas, tazas, ml, L, gramos, kilos, unidades). Cada ingrediente es independiente."
                >
                  <Utensils size={13} />
                  <span>Medidas de Cocina (Libre)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormulationMode('DYNAMIC_PCT')}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: (formulationMode === 'DYNAMIC_PCT' || formulationMode === 'PERCENTAGE') ? 'var(--clr-gold-500)' : 'transparent',
                    color: (formulationMode === 'DYNAMIC_PCT' || formulationMode === 'PERCENTAGE') ? '#FFFFFF' : 'var(--clr-text-secondary)',
                    boxShadow: (formulationMode === 'DYNAMIC_PCT' || formulationMode === 'PERCENTAGE') ? '0 2px 8px rgba(217,119,6,0.3)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  title="Balance dinámico de porcentajes con sliders y candados de fijación (ideal para heladería y emulsiones)."
                >
                  <Sliders size={13} />
                  <span>Balance Dinámico (%)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormulationMode('BAKERS_PCT')}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: formulationMode === 'BAKERS_PCT' ? 'var(--clr-gold-500)' : 'transparent',
                    color: formulationMode === 'BAKERS_PCT' ? '#FFFFFF' : 'var(--clr-text-secondary)',
                    boxShadow: formulationMode === 'BAKERS_PCT' ? '0 2px 8px rgba(217,119,6,0.3)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  title="Porcentaje panadero tradicional donde la harina es el 100% y los demás ingredientes son relativos."
                >
                  <Wheat size={13} />
                  <span>% Panadero</span>
                </button>
              </div>
            </div>

            {/* Informative culinary banner depending on active mode */}
            {formulationMode === 'DIRECT_WEIGHT' && (
              <div style={{
                background: 'var(--clr-bg-subtle)',
                border: '1px solid var(--clr-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                fontSize: 12,
                color: 'var(--clr-text-secondary)',
                lineHeight: 1.4
              }}>
                🥄 <strong>Medidas de Cocina & Pesaje Libre:</strong> Usa la medida que quieras para cada ingrediente (<strong>cucharadas, cucharaditas, tazas, mililitros, litros, gramos, kilos o unidades/huevos</strong>). Al subir o cambiar cualquier ingrediente se suma directamente a la masa y <strong>jamás baja ningún otro ingrediente</strong>.
              </div>
            )}

            {(formulationMode === 'DYNAMIC_PCT' || formulationMode === 'PERCENTAGE') && (
              <div style={{
                background: 'rgba(217, 119, 6, 0.08)',
                border: '1px solid rgba(217, 119, 6, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
                fontSize: 12,
                color: 'var(--clr-text-primary)'
              }}>
                <span>
                  🎚️ <strong>Balance Dinámico (%):</strong> Mueve los sliders para balancear la mezcla. El sistema redistribuye automáticamente los ingredientes desbloqueados manteniendo el 100%. Usa el candado 🔒 para fijar insumos críticos.
                </span>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>Lote Base Mezcla:</span>
                  <input
                    type="number"
                    min="10"
                    step="50"
                    value={Math.round(batchWeightG)}
                    onChange={e => handleDynamicBatchWeightChange(Number(e.target.value))}
                    style={{
                      width: 75,
                      padding: '3px 6px',
                      borderRadius: 4,
                      border: '1px solid var(--clr-border-strong)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      fontWeight: 800,
                      textAlign: 'center',
                      background: 'var(--clr-bg-surface)',
                      color: 'var(--clr-gold-500)'
                    }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>g</span>
                </div>
              </div>
            )}

            {formulationMode === 'BAKERS_PCT' && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                fontSize: 12,
                color: 'var(--clr-text-primary)',
                lineHeight: 1.4
              }}>
                🥖 <strong>Porcentaje Panadero Tradicional:</strong> El primer ingrediente (<strong>{calculatedItems[0]?.name || 'Harina Base'}</strong>) es la base al <strong>100%</strong>. Los demás ingredientes se expresan y ajustan en porcentaje relativo a la harina. Si modificas los gramos de harina, toda la masa escala automáticamente.
              </div>
            )}

            {/* List of Ingredients */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {calculatedItems.map((item, idx) => {
                const isBaseFlour = idx === 0 && formulationMode === 'BAKERS_PCT';
                const unitInfo = CULINARY_UNITS[item.unit] || CULINARY_UNITS.g;
                const quickDeltas = unitInfo.quickDeltas;

                return (
                  <div key={item.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '10px 14px',
                    background: isBaseFlour ? 'rgba(217, 119, 6, 0.06)' : 'var(--clr-bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    border: isBaseFlour ? '1px solid var(--clr-gold-500)' : '1px solid var(--clr-border)',
                    flexWrap: 'wrap'
                  }}>
                    
                    {/* Left: Name and Color Indicator */}
                    <div className="flex items-center gap-2" style={{ minWidth: 160, flex: '1 1 auto' }}>
                      <span style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: item.color,
                        display: 'inline-block',
                        flexShrink: 0
                      }}></span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div className="flex items-center gap-1.5">
                          <strong style={{ fontSize: 14, color: 'var(--clr-text-primary)' }}>
                            {item.name}
                          </strong>
                          {isBaseFlour && (
                            <span className="badge badge-gold" style={{ fontSize: 10, padding: '1px 6px' }}>
                              Base 100%
                            </span>
                          )}
                        </div>
                        {/* Subtitle with weight in grams if in kitchen units and unit is not grams */}
                        {formulationMode === 'DIRECT_WEIGHT' && item.unit !== 'g' && (
                          <span style={{ fontSize: 11, color: 'var(--clr-text-muted)', fontFamily: 'var(--font-mono)' }}>
                            ≈ {item.grams.toFixed(1)}g totales
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CENTER CONTROLS: Depends on Formulation Mode */}

                    {/* 1. DIRECT KITCHEN UNITS MODE */}
                    {formulationMode === 'DIRECT_WEIGHT' && (
                      <div className="flex items-center gap-1.5" style={{ flexWrap: 'wrap' }}>
                        {/* Quick decrement */}
                        <button
                          type="button"
                          onClick={() => handleAdjustQty(item.id, quickDeltas[0])}
                          className="btn-ghost"
                          style={{
                            padding: '2px 6px',
                            fontSize: 10,
                            fontWeight: 700,
                            borderRadius: 4,
                            border: '1px solid var(--clr-border)',
                            color: 'var(--clr-text-muted)'
                          }}
                          title={`Restar ${Math.abs(quickDeltas[0])} ${unitInfo.short}`}
                        >
                          {quickDeltas[0]}
                        </button>
                        {quickDeltas.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleAdjustQty(item.id, quickDeltas[1])}
                            className="btn-ghost"
                            style={{
                              padding: '2px 6px',
                              fontSize: 10,
                              fontWeight: 700,
                              borderRadius: 4,
                              border: '1px solid var(--clr-border)',
                              color: 'var(--clr-text-muted)'
                            }}
                            title={`Restar ${Math.abs(quickDeltas[1])} ${unitInfo.short}`}
                          >
                            {quickDeltas[1]}
                          </button>
                        )}

                        {/* Quantity input */}
                        <input
                          type="number"
                          min="0"
                          step={unitInfo.step}
                          value={item.qty}
                          onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                          style={{
                            width: 72,
                            padding: '4px 6px',
                            borderRadius: 6,
                            border: '1px solid var(--clr-border-strong)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 14,
                            fontWeight: 800,
                            textAlign: 'right',
                            background: 'var(--clr-bg-surface)',
                            color: 'var(--clr-text-primary)'
                          }}
                        />

                        {/* Unit selector */}
                        <select
                          value={item.unit}
                          onChange={(e) => handleUnitChange(item.id, e.target.value as KitchenUnit)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: '1px solid var(--clr-border-strong)',
                            fontSize: 12,
                            fontWeight: 700,
                            background: 'var(--clr-bg-surface)',
                            color: 'var(--clr-gold-500)',
                            cursor: 'pointer'
                          }}
                        >
                          {Object.entries(CULINARY_UNITS).map(([key, u]) => (
                            <option key={key} value={key}>{u.short} ({u.name})</option>
                          ))}
                        </select>

                        {/* Quick increment */}
                        {quickDeltas.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleAdjustQty(item.id, quickDeltas[2])}
                            className="btn-ghost"
                            style={{
                              padding: '2px 6px',
                              fontSize: 10,
                              fontWeight: 700,
                              borderRadius: 4,
                              border: '1px solid var(--clr-border)',
                              color: 'var(--clr-text-primary)'
                            }}
                            title={`Sumar +${quickDeltas[2]} ${unitInfo.short}`}
                          >
                            +{quickDeltas[2]}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAdjustQty(item.id, quickDeltas[quickDeltas.length - 1])}
                          className="btn-ghost"
                          style={{
                            padding: '2px 8px',
                            fontSize: 10,
                            fontWeight: 800,
                            borderRadius: 4,
                            border: '1px solid var(--clr-gold-500)',
                            color: 'var(--clr-gold-500)',
                            background: 'rgba(217,119,6,0.1)'
                          }}
                          title={`Sumar +${quickDeltas[quickDeltas.length - 1]} ${unitInfo.short}`}
                        >
                          +{quickDeltas[quickDeltas.length - 1]}
                        </button>
                      </div>
                    )}

                    {/* 2. DYNAMIC SLIDER (%) MODE */}
                    {(formulationMode === 'DYNAMIC_PCT' || formulationMode === 'PERCENTAGE') && (
                      <div className="flex items-center gap-3" style={{ flex: '1 1 240px' }}>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="0.1"
                          value={item.pct}
                          disabled={item.isLocked}
                          onChange={(e) => handleDynamicSliderChange(item.id, Number(e.target.value))}
                          style={{
                            flex: 1,
                            accentColor: item.color,
                            cursor: item.isLocked ? 'not-allowed' : 'pointer',
                            opacity: item.isLocked ? 0.6 : 1
                          }}
                        />
                        <div className="flex items-center gap-1 font-mono">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={Number(item.pct.toFixed(1))}
                            disabled={item.isLocked}
                            onChange={(e) => handleDynamicSliderChange(item.id, Number(e.target.value))}
                            style={{
                              width: 58,
                              padding: '2px 4px',
                              borderRadius: 4,
                              border: '1px solid var(--clr-border-strong)',
                              textAlign: 'right',
                              fontSize: 13,
                              fontWeight: 800,
                              background: 'var(--clr-bg-surface)',
                              color: 'var(--clr-text-primary)'
                            }}
                          />
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>%</span>
                          <span style={{ fontSize: 11, color: 'var(--clr-text-muted)', marginLeft: 4 }}>
                            ({Math.round(item.grams)}g)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 3. BAKER'S % MODE */}
                    {formulationMode === 'BAKERS_PCT' && (
                      <div className="flex items-center gap-2">
                        {isBaseFlour ? (
                          <div className="flex items-center gap-1">
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--clr-text-secondary)' }}>Harina:</span>
                            <input
                              type="number"
                              min="1"
                              step="50"
                              value={Math.round(item.grams)}
                              onChange={(e) => handleBaseFlourGramsChange(Number(e.target.value))}
                              style={{
                                width: 80,
                                padding: '4px 6px',
                                borderRadius: 6,
                                border: '1px solid var(--clr-gold-500)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: 14,
                                fontWeight: 800,
                                textAlign: 'right',
                                background: 'var(--clr-bg-surface)',
                                color: 'var(--clr-gold-500)'
                              }}
                            />
                            <span style={{ fontSize: 12, fontWeight: 700 }}>g (100%)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 font-mono">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={item.bakersPct}
                                onChange={(e) => handleBakersPctChange(item.id, Number(e.target.value))}
                                style={{
                                  width: 60,
                                  padding: '4px 6px',
                                  borderRadius: 6,
                                  border: '1px solid var(--clr-border-strong)',
                                  fontSize: 13,
                                  fontWeight: 800,
                                  textAlign: 'right',
                                  background: 'var(--clr-bg-surface)',
                                  color: 'var(--clr-text-primary)'
                                }}
                              />
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>% P.</span>
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
                              ({Math.round(item.grams)}g)
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Right: Cost, Lock and Actions */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold" style={{
                        fontSize: 12,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: 'var(--clr-bg-card)',
                        border: '1px solid var(--clr-border)',
                        color: 'var(--clr-text-secondary)'
                      }}>
                        ${item.costAmount.toFixed(2)}
                      </span>

                      <button
                        onClick={() => toggleLock(item.id)}
                        className="btn-ghost"
                        title={item.isLocked ? 'Ingrediente protegido' : 'Desprotegido'}
                        style={{ padding: 4, color: item.isLocked ? 'var(--clr-gold-500)' : 'var(--clr-text-muted)' }}
                      >
                        {item.isLocked ? <Lock size={15} /> : <Unlock size={15} />}
                      </button>

                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="btn-ghost"
                        title="Eliminar ingrediente"
                        style={{ padding: 4, color: 'var(--clr-danger)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Quick Add Selector from Existing Ingredients */}
            <div className="flex items-center gap-2" style={{ marginTop: 4, paddingTop: 10, borderTop: '1px dashed var(--clr-border)' }}>
              <select
                className="input"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    const mat = materials.find(m => m.id === Number(e.target.value));
                    if (mat) {
                      const newId = Date.now();
                      setCustomNamesMap(prev => ({ ...prev, [newId]: mat.name }));
                      const defaultG = 50;
                      const newTotal = batchWeightG + defaultG;
                      setBatchWeightG(newTotal);
                      setFormulaItems(prev => {
                        const added: FormulaItemState = {
                          id: newId,
                          materialId: mat.id,
                          pct: (defaultG / newTotal) * 100,
                          grams: defaultG,
                          unit: 'g',
                          qty: defaultG,
                          isLocked: false,
                          errorTolPct: 2,
                          costPerMg: mat.costPerMg || 0.000003
                        };
                        const list = [...prev, added];
                        return list.map(it => ({
                          ...it,
                          pct: Number(((it.grams / newTotal) * 100).toFixed(2))
                        }));
                      });
                      pushAlert({ type: 'success', message: `"${mat.name}" añadido a la fórmula` });
                    }
                    e.target.value = '';
                  }
                }}
                style={{ fontSize: 13 }}
              >
                <option value="" disabled>+ Seleccionar ingrediente del almacén...</option>
                {materials
                  .filter(m => m.type === 'INSUMO')
                  .map(m => (
                    <option key={m.id} value={m.id}>{m.name} (${m.costPerUnit} / {m.unit})</option>
                  ))
                }
              </select>
            </div>

          </div>

          {/* Card: Mermas y Tolerancias */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--clr-text-primary)' }}>
              Mermas y Tolerancias
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
              
              {/* Merma en frío */}
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text-secondary)' }}>
                  Merma en frío:
                </span>
                <div style={{
                  background: 'rgba(59, 130, 246, 0.12)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  padding: '4px 10px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <input
                    type="number"
                    step="0.5"
                    className="font-mono"
                    style={{
                      width: 44,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontWeight: 700,
                      fontSize: 14,
                      color: 'var(--clr-info)',
                      textAlign: 'center'
                    }}
                    value={coldWastePct}
                    onChange={e => setColdWastePct(Number(e.target.value))}
                  />
                  <span style={{ fontWeight: 700, color: 'var(--clr-info)', fontSize: 13 }}>%</span>
                </div>
              </div>

              {/* Merma térmica */}
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text-secondary)' }}>
                  Merma térmica:
                </span>
                <div style={{
                  background: 'rgba(236, 72, 153, 0.12)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(236, 72, 153, 0.25)',
                  padding: '4px 10px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <input
                    type="number"
                    step="0.5"
                    className="font-mono"
                    style={{
                      width: 44,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontWeight: 700,
                      fontSize: 14,
                      color: 'var(--clr-rose-400)',
                      textAlign: 'center'
                    }}
                    value={thermalWastePct}
                    onChange={e => setThermalWastePct(Number(e.target.value))}
                  />
                  <span style={{ fontWeight: 700, color: 'var(--clr-rose-400)', fontSize: 13 }}>%</span>
                </div>
              </div>

              {/* Margen de error */}
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text-secondary)' }}>
                  Margen de error:
                </span>
                <div style={{
                  background: 'var(--clr-bg-surface)',
                  border: '1px solid var(--clr-border-strong)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 10px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <input
                    type="number"
                    step="0.5"
                    className="font-mono"
                    style={{
                      width: 36,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontWeight: 700,
                      fontSize: 14,
                      color: 'var(--clr-text-primary)',
                      textAlign: 'center'
                    }}
                    value={errorMarginPct}
                    onChange={e => setErrorMarginPct(Number(e.target.value))}
                  />
                  <span style={{ fontWeight: 700, color: 'var(--clr-text-secondary)', fontSize: 13 }}>%</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Costeo y Precio Sugerido */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--clr-text-primary)' }}>
              🧮 Calculador de Costos, Precios y Producción
            </h2>

            {/* Cost Breakdown Block (Matching Image) */}
            <div style={{
              background: 'var(--clr-bg-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              border: '1px solid var(--clr-border)',
              display: 'grid',
              gridTemplateColumns: '1fr 1.3fr',
              alignItems: 'center',
              gap: 16
            }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text-secondary)', display: 'block' }}>
                  Costo Base:
                </span>
                <span className="font-mono" style={{ fontSize: 34, fontWeight: 800, color: 'var(--clr-text-primary)', letterSpacing: '-0.03em' }}>
                  ${costs.baseTotal.toFixed(2)}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--clr-text-secondary)' }}>Insumos:</span>
                  <span className="font-mono font-bold" style={{ color: 'var(--clr-text-primary)' }}>${costs.ingredients.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--clr-text-secondary)' }}>Empaque:</span>
                  <div className="flex items-center gap-1 font-mono font-bold" style={{ color: 'var(--clr-text-primary)' }}>
                    <span>$</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={packagingCost}
                      onChange={e => setPackagingCost(Number(e.target.value))}
                      style={{ width: 55, border: 'none', background: 'transparent', textAlign: 'right', fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--clr-text-primary)' }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--clr-text-secondary)' }}>Mano de Obra/Servicios:</span>
                  <div className="flex items-center gap-1 font-mono font-bold" style={{ color: 'var(--clr-text-primary)' }}>
                    <span>$</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={laborAndServices}
                      onChange={e => setLaborAndServices(Number(e.target.value))}
                      style={{ width: 55, border: 'none', background: 'transparent', textAlign: 'right', fontWeight: 700, fontFamily: 'inherit', outline: 'none', color: 'var(--clr-text-primary)' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Rendimiento del Lote y Escalador de Producción (Solicitud Panadería/Pastelería/Heladería) */}
            <div style={{
              background: 'var(--clr-bg-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              border: '1px solid var(--clr-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
                    Rendimiento del Lote:
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--clr-text-secondary)' }}>
                    Porciones o piezas que rinde esta mezcla
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={yieldUnits}
                    onChange={e => setYieldUnits(Math.max(1, Number(e.target.value)))}
                    style={{
                      width: 52,
                      padding: '4px 6px',
                      borderRadius: 6,
                      border: '1px solid var(--clr-border-strong)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 14,
                      fontWeight: 800,
                      textAlign: 'center',
                      background: 'var(--clr-bg-surface)',
                      color: 'var(--clr-text-primary)'
                    }}
                  />
                  <select
                    value={unitName}
                    onChange={e => setUnitName(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--clr-border-strong)',
                      fontSize: 12,
                      fontWeight: 600,
                      background: 'var(--clr-bg-surface)',
                      color: 'var(--clr-text-primary)'
                    }}
                  >
                    <option value="porciones">porciones</option>
                    <option value="unidades">unidades</option>
                    <option value="piezas">piezas / panes</option>
                    <option value="moldes">moldes</option>
                    <option value="litros">litros</option>
                    <option value="tinas">tinas / bachas</option>
                  </select>
                </div>
              </div>

              {/* Yield Metrics: Peso unitario neto y Costo Unitario Base */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                paddingTop: 8,
                borderTop: '1px dashed var(--clr-border)'
              }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--clr-text-secondary)', display: 'block' }}>
                    Peso x {unitName.slice(0, -1) || 'unidad'}:
                  </span>
                  <span className="font-mono font-bold" style={{ fontSize: 14, color: 'var(--clr-text-primary)' }}>
                    {(costs.finalWeightG / Math.max(1, yieldUnits)).toFixed(0)}g
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--clr-text-secondary)', display: 'block' }}>
                    Costo Base Unitario:
                  </span>
                  <span className="font-mono font-bold" style={{ fontSize: 14, color: 'var(--clr-gold-500)' }}>
                    ${(costs.baseTotal / Math.max(1, yieldUnits)).toFixed(2)} / u
                  </span>
                </div>
              </div>

              {/* Batch Scaler Toolbar (Calculador para Subir Producción) */}
              <div style={{
                paddingTop: 10,
                borderTop: '1px solid var(--clr-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
                      Subir Producción (Multiplicar Todo):
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--clr-text-muted)' }}>
                      Sube todos los ingredientes proporcionalmente
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1.5, 2, 3, 5, 10].map(factor => (
                      <button
                        key={factor}
                        type="button"
                        onClick={() => handleScaleBatch(factor)}
                        className="btn-ghost"
                        style={{
                          padding: '3px 8px',
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: 4,
                          border: '1px solid var(--clr-border)',
                          background: 'var(--clr-bg-surface)',
                          color: 'var(--clr-text-primary)',
                          cursor: 'pointer'
                        }}
                        title={`Multiplicar todos los ingredientes x${factor}`}
                      >
                        x{factor}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Weight Scaler: sube todos los ingredientes proporcionalmente */}
                <div className="flex items-center justify-between" style={{ gap: 8, marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: 'var(--clr-text-secondary)' }}>
                    O subir masa total objetivo a:
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="50"
                      min="10"
                      placeholder={batchWeightG.toFixed(0)}
                      defaultValue={batchWeightG.toFixed(0)}
                      key={batchWeightG}
                      id="target-batch-weight-input"
                      style={{
                        width: 76,
                        padding: '4px 6px',
                        borderRadius: 4,
                        border: '1px solid var(--clr-border-strong)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        fontWeight: 700,
                        textAlign: 'right',
                        background: 'var(--clr-bg-surface)',
                        color: 'var(--clr-text-primary)'
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleScaleToTargetWeight(Number((e.target as HTMLInputElement).value));
                        }
                      }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--clr-text-secondary)' }}>g</span>
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('target-batch-weight-input') as HTMLInputElement;
                        if (input && Number(input.value) > 0) {
                          handleScaleToTargetWeight(Number(input.value));
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '3px 10px', fontSize: 11, fontWeight: 700, borderColor: 'var(--clr-gold-500)', color: 'var(--clr-gold-500)' }}
                    >
                      Subir
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Wholesale percentage slider bar (Solicitado por el usuario) */}
            <div style={{
              background: 'var(--clr-bg-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}>
              <div className="flex items-center justify-between" style={{ fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: 'var(--clr-text-secondary)' }}>
                  Margen Descuento al Mayor:
                </span>
                <span className="font-mono font-bold" style={{ color: 'var(--clr-gold-500)' }}>
                  {wholesaleCustomPct}%
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="35"
                value={wholesaleCustomPct}
                onChange={e => setWholesaleCustomPct(Number(e.target.value))}
                style={{ accentColor: 'var(--clr-gold-500)', cursor: 'pointer' }}
              />
            </div>

            {/* 3 Main Price Cards (Matching Image) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              
              {/* Precio Mínimo (Piso) */}
              <div style={{
                background: 'var(--clr-bg-card)',
                border: '1px solid var(--clr-border-strong)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 12px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 4
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-secondary)', lineHeight: 1.2 }}>
                  Precio Mínimo<br />(Piso):
                </span>
                <span className="font-mono font-bold" style={{ fontSize: 24, color: 'var(--clr-text-primary)' }}>
                  ${prices.piso.toFixed(2)}
                </span>
                {yieldUnits > 1 && (
                  <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>
                    (${prices.unitPiso?.toFixed(2)} / {unitName.slice(0, -1) || 'u'})
                  </span>
                )}
              </div>

              {/* Precio Sugerido (Óptimo) — SOLID CARAMEL CARD */}
              <div style={{
                background: 'var(--clr-gold-500)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 12px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 4,
                boxShadow: '0 6px 20px rgba(223, 152, 50, 0.35)',
                color: '#FFFFFF'
              }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255, 255, 255, 0.95)', lineHeight: 1.2 }}>
                  Precio Sugerido<br />(Óptimo):
                </span>
                <span className="font-mono font-bold" style={{ fontSize: 26, color: '#FFFFFF' }}>
                  ${prices.optimo.toFixed(2)}
                </span>
                {yieldUnits > 1 && (
                  <span className="font-mono" style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255, 255, 255, 0.95)' }}>
                    (${prices.unitOptimo?.toFixed(2)} / {unitName.slice(0, -1) || 'u'})
                  </span>
                )}
              </div>

              {/* Precio Premium */}
              <div style={{
                background: 'var(--clr-bg-card)',
                border: '1px solid var(--clr-border-strong)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 12px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 4
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-secondary)', lineHeight: 1.2 }}>
                  Precio<br />Premium:
                </span>
                <span className="font-mono font-bold" style={{ fontSize: 24, color: 'var(--clr-text-primary)' }}>
                  ${prices.premium.toFixed(2)}
                </span>
                {yieldUnits > 1 && (
                  <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>
                    (${prices.unitPremium?.toFixed(2)} / {unitName.slice(0, -1) || 'u'})
                  </span>
                )}
              </div>

            </div>

            {/* Wholesale Price Badge */}
            <div className="flex items-center justify-between" style={{
              background: 'var(--clr-bg-elevated)',
              border: '1px dashed var(--clr-gold-400)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 14px'
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>
                Precio Mayorista Calculado:
              </span>
              <span className="font-mono font-bold" style={{ fontSize: 16, color: 'var(--clr-gold-500)' }}>
                ${prices.mayor.toFixed(2)}
                {yieldUnits > 1 && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--clr-text-secondary)', marginLeft: 6 }}>
                    (${prices.unitMayor?.toFixed(2)} / {unitName.slice(0, -1) || 'u'})
                  </span>
                )}
              </span>
            </div>

            {/* Prominent Button: [Copiar Consulta para IA] 🪄+AI */}
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '0.01em',
                background: 'var(--clr-text-primary)',
                color: 'var(--clr-bg-base)',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              <span>[Copiar Consulta para IA]</span>
              <Sparkles size={16} color="var(--clr-gold-400)" />
              <span style={{ fontSize: 12, color: 'var(--clr-gold-400)', fontWeight: 800 }}>+AI</span>
            </button>

          </div>

        </div>

      </div>

      {/* Bottom Status Bar (Matching Image) */}
      <div className="flex items-center justify-between" style={{
        padding: '12px 20px',
        background: 'var(--clr-bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--clr-border)',
        boxShadow: 'var(--shadow-sm)',
        marginTop: 4
      }}>
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} color="var(--clr-success)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
            Estado de Guardado:
          </span>
          <span style={{ fontSize: 13, color: 'var(--clr-text-secondary)' }}>
            Guardado en borrador (hace unos segundos)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text-secondary)' }}>
            Actualizar precio dinámicamente según inventario
          </span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={autoSyncPrice}
              onChange={e => setAutoSyncPrice(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      {/* CUSTOM INGREDIENT MODAL (Solicitud del usuario) */}
      {isCustomMatModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsCustomMatModalOpen(false); }}>
          <div className="modal-content animate-fadeIn" style={{ maxWidth: 480, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--clr-text-primary)' }}>
              Agregar Ingrediente Personalizado
            </h2>
            <p style={{ fontSize: 13, color: 'var(--clr-text-secondary)', margin: 0 }}>
              Ingresa el nombre, la cantidad en la unidad culinaria que prefieras (cucharadas, tazas, gramos, etc.) y su costo estimado.
            </p>

            <form onSubmit={handleAddCustomIngredient} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>
                  Nombre del Ingrediente
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Ej: Extracto de Café, Nueces Picadas, Pasta de Pistacho..."
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    className="input font-mono font-bold"
                    value={customQty}
                    onChange={e => setCustomQty(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>
                    Unidad de Medida
                  </label>
                  <select
                    className="input"
                    value={customUnit}
                    onChange={e => setCustomUnit(e.target.value as KitchenUnit)}
                    style={{ fontSize: 13, fontWeight: 600 }}
                  >
                    {Object.entries(CULINARY_UNITS).map(([key, u]) => (
                      <option key={key} value={key}>{u.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>
                    Costo ($ / kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    className="input font-mono font-bold"
                    value={customCostPerKg}
                    onChange={e => setCustomCostPerKg(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3" style={{ marginTop: 12 }}>
                <button type="button" onClick={() => setIsCustomMatModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-caramel">
                  Agregar a la Fórmula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI PROMPT MODAL */}
      {isAiModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsAiModalOpen(false); }}>
          <div className="modal-content animate-fadeIn" style={{
            maxWidth: 720,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--clr-border)', paddingBottom: 10 }}>
              <div className="flex items-center gap-2">
                <Sparkles size={20} color="var(--clr-gold-500)" />
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--clr-text-primary)' }}>
                  Consulta de Asesoría Gastronómica para IA
                </h3>
              </div>
              <button onClick={() => setIsAiModalOpen(false)} className="btn-ghost" style={{ cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--clr-text-secondary)', margin: 0 }}>
              Copia este texto y pégalo directamente en <strong>ChatGPT, Claude o DeepSeek</strong> para recibir recomendaciones sobre balance de textura, costos y precios en <strong>{settings.city}, {settings.state}</strong>.
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setAiMode('market')}
                className={`btn ${aiMode === 'market' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                1. Posición de Mercado
              </button>
              <button
                onClick={() => setAiMode('recipe')}
                className={`btn ${aiMode === 'recipe' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                2. Balance Técnico & Costos
              </button>
              <button
                onClick={() => setAiMode('social')}
                className={`btn ${aiMode === 'social' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                3. WhatsApp & Redes
              </button>
            </div>

            <textarea
              readOnly
              value={generatedAiPrompt}
              style={{
                width: '100%',
                height: 250,
                background: 'var(--clr-bg-subtle)',
                border: '1px solid var(--clr-border-strong)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--clr-text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                lineHeight: 1.5,
                padding: 12,
                resize: 'none'
              }}
            />

            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setIsAiModalOpen(false)} className="btn btn-secondary">
                Cerrar
              </button>
              <button onClick={handleCopyPrompt} className="btn btn-caramel">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? '¡Copiado con Éxito!' : 'Copiar Texto para IA'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW RECIPE MODAL */}
      {isNewRecipeModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsNewRecipeModalOpen(false); }}>
          <div className="modal-content animate-fadeIn" style={{ maxWidth: 460, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--clr-border)', paddingBottom: 10 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--clr-text-primary)' }}>
                Crear Nueva Receta / Fórmula
              </h2>
              <button onClick={() => setIsNewRecipeModalOpen(false)} className="btn-ghost" style={{ cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--clr-text-secondary)', margin: 0 }}>
              Ingresa el nombre y los parámetros base. Podrás formular ingredientes personalizados o del almacén inmediatamente.
            </p>

            <form onSubmit={handleCreateNewRecipe} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>
                  Nombre de la Receta / Producto
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: Cheesecake de Fresa, Torta Red Velvet, Helado Arequipe..."
                  className="input"
                  value={newRecipeName}
                  onChange={e => setNewRecipeName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>
                    Peso del Lote Crudo (g)
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    required
                    className="input font-mono font-bold"
                    value={newBatchWeight}
                    onChange={e => setNewBatchWeight(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>
                    Merma Cocción (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    required
                    className="input font-mono font-bold"
                    value={newThermalWaste}
                    onChange={e => setNewThermalWaste(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3" style={{ marginTop: 12 }}>
                <button type="button" onClick={() => setIsNewRecipeModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-caramel">
                  Crear y Formular Ahora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
