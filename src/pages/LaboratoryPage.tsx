import { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import {
  Lock, Unlock, Sparkles, Copy, Check, Save,
  Plus, Trash2, CheckCircle2
} from 'lucide-react';
import {
  redistributeSliders,
  calcRecipeCosts,
  calcPrices,
  buildAiQuery,
  type SliderItem
} from '../lib/engine';
import type { RecipeItem } from '../types';

// Palette of pastel colors for ingredient sliders as seen in reference
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

  // Unit view toggle: % (percentages) vs Gramos/mg
  const [viewUnitMode, setViewUnitMode] = useState<'PCT' | 'GRAMS'>('PCT');

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

  // Custom Ingredient Modal
  const [isCustomMatModalOpen, setIsCustomMatModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customGrams, setCustomGrams] = useState<number>(100);
  const [customCostPerKg, setCustomCostPerKg] = useState<number>(5.00);

  // Formula Items state
  const [formulaItems, setFormulaItems] = useState<SliderItem[]>(() => {
    if (activeRecipe?.items?.length) {
      return activeRecipe.items.map(it => {
        const mat = materials.find(m => m.id === it.materialId);
        return {
          id: it.id,
          materialId: it.materialId,
          pct: it.pctValue,
          isLocked: it.isLocked === 1,
          errorTolPct: it.errorTolPct,
          costPerMg: mat?.costPerMg || 0.000003
        };
      });
    }
    return [
      { id: 1, materialId: 0, pct: 35, isLocked: false, errorTolPct: 2, costPerMg: 0.0000015 },
      { id: 2, materialId: 0, pct: 20, isLocked: false, errorTolPct: 2, costPerMg: 0.0000014 },
      { id: 3, materialId: 0, pct: 15, isLocked: false, errorTolPct: 2, costPerMg: 0.0000115 },
      { id: 4, materialId: 0, pct: 15, isLocked: true,  errorTolPct: 2, costPerMg: 0.0000050 },
      { id: 5, materialId: 0, pct: 15, isLocked: false, errorTolPct: 2, costPerMg: 0.0000040 }
    ];
  });

  // Ingredient Names map
  const [customNamesMap, setCustomNamesMap] = useState<Record<number, string>>({
    1: 'Harina de Trigo',
    2: 'Azúcar',
    3: 'Cacao',
    4: 'Mantequilla',
    5: 'Otros / Micro'
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
    if (r.items?.length) {
      const names: Record<number, string> = {};
      const nextItems = r.items.map((it, idx) => {
        const mat = materials.find(m => m.id === it.materialId);
        const itemName = it.materialName || mat?.name || `Ingrediente ${idx + 1}`;
        names[it.id] = itemName;
        return {
          id: it.id,
          materialId: it.materialId,
          pct: it.pctValue,
          isLocked: it.isLocked === 1,
          errorTolPct: it.errorTolPct,
          costPerMg: mat?.costPerMg || 0.000003
        };
      });
      setCustomNamesMap(names);
      setFormulaItems(nextItems);
    }
  };

  // Slider change using zero-sum
  const handleSliderChange = (movedId: number, val: number) => {
    const next = redistributeSliders(formulaItems, movedId, val);
    setFormulaItems(next);
  };

  // Direct grams input change: recalculates percentage and triggers redistribution
  const handleGramsChange = (itemId: number, grams: number) => {
    const safeGrams = Math.max(0, grams);
    const newPct = (safeGrams / batchWeightG) * 100;
    const next = redistributeSliders(formulaItems, itemId, Math.min(100, newPct));
    setFormulaItems(next);
  };

  const toggleLock = (id: number) => {
    setFormulaItems(prev => prev.map(item =>
      item.id === id ? { ...item, isLocked: !item.isLocked } : item
    ));
  };

  const handleRemoveItem = (id: number) => {
    setFormulaItems(prev => prev.filter(i => i.id !== id));
  };

  // Add custom ingredient on the fly
  const handleAddCustomIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newId = Date.now();
    const newPct = Math.min(100, (customGrams / batchWeightG) * 100);
    const costPerMg = (customCostPerKg / 1000) / 1000; // $/mg

    // Save to materials inventory so it's part of the ingredients catalog
    addMaterial({
      name: customName.trim(),
      type: 'INSUMO',
      unit: 'kg',
      stockMg: customGrams * 1000 * 5, // 5 batches in stock
      minStock: customGrams * 1000,
      costPerUnit: customCostPerKg,
      buyUnit: 'Kilogramo',
      buyQtyMg: 1000000
    });

    const newMat = useAppStore.getState().materials.find(m => m.name === customName.trim());

    setCustomNamesMap(prev => ({ ...prev, [newId]: customName.trim() }));

    const newItem: SliderItem = {
      id: newId,
      materialId: newMat?.id || 0,
      pct: newPct,
      isLocked: false,
      errorTolPct: 2.0,
      costPerMg
    };

    const next = redistributeSliders([...formulaItems, newItem], newId, newPct);
    setFormulaItems(next);
    setIsCustomMatModalOpen(false);
    setCustomName('');
    pushAlert({ type: 'success', message: `Ingrediente personalizado "${customName}" añadido a la fórmula` });
  };

  // Calculations
  const calculatedItems = useMemo(() => {
    const batchMg = batchWeightG * 1000;
    return formulaItems.map((item, idx) => {
      const netMg = (batchMg * item.pct) / 100;
      const mat = materials.find(m => m.id === item.materialId);
      const name = customNamesMap[item.id] || mat?.name || `Ingrediente ${idx + 1}`;
      return {
        ...item,
        netWeightMg: netMg,
        netWeightG: netMg / 1000,
        name,
        color: PASTEL_COLORS[idx % PASTEL_COLORS.length],
        costPerMg: mat?.costPerMg || item.costPerMg
      };
    });
  }, [formulaItems, batchWeightG, materials, customNamesMap]);

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
    return {
      ...c,
      packaging: packagingCost,
      laborAndOven: laborAndServices,
      baseTotal
    };
  }, [calculatedItems, packagingCost, laborAndServices, coldWastePct, thermalWastePct]);

  // Price calculations
  const prices = useMemo(() => {
    return calcPrices(costs.baseTotal, {
      taxPct: settings.taxPct,
      cogsPct: settings.cogsPct,
      wholesalePct: wholesaleCustomPct
    });
  }, [costs.baseTotal, settings.taxPct, settings.cogsPct, wholesaleCustomPct]);

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
      pctValue: ci.pct,
      netWeightMg: ci.netWeightMg,
      isLocked: ci.isLocked ? 1 : 0,
      errorTolPct: ci.errorTolPct,
      sortOrder: idx,
      materialName: ci.name
    }));

    updateRecipe(selectedRecipeId, {
      name: recipeName,
      batchWeightG,
      coldWastePct,
      thermalWastePct,
      items: itemsPayload,
      costs,
      prices
    });
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
      items: [
        { id: Date.now() + 1, recipeId: 0, materialId: 0, pctValue: 50, netWeightMg: newBatchWeight * 500, isLocked: 0, errorTolPct: 2, sortOrder: 0, materialName: 'Base Principal' },
        { id: Date.now() + 2, recipeId: 0, materialId: 0, pctValue: 30, netWeightMg: newBatchWeight * 300, isLocked: 0, errorTolPct: 2, sortOrder: 1, materialName: 'Endulzante / Azúcar' },
        { id: Date.now() + 3, recipeId: 0, materialId: 0, pctValue: 20, netWeightMg: newBatchWeight * 200, isLocked: 0, errorTolPct: 2, sortOrder: 2, materialName: 'Saborizante Clave' }
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
                  background: isSelected ? 'var(--clr-gold-500)' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : 'var(--clr-text-primary)',
                  border: isSelected ? '2px solid var(--clr-gold-600)' : '1px solid var(--clr-border-strong)',
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
          
          {/* Card: Fórmula y Porcentajes */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            
            {/* Card Header with View Toggle (Porcentajes % <-> Gramos/mg) */}
            <div className="flex items-center justify-between">
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--clr-text-primary)' }}>
                Fórmula y Porcentajes
              </h2>

              {/* Toggle Switch */}
              <div className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text-secondary)' }}>
                <span style={{ color: viewUnitMode === 'PCT' ? 'var(--clr-text-primary)' : 'var(--clr-text-muted)', fontWeight: viewUnitMode === 'PCT' ? 700 : 500 }}>
                  Porcentajes %
                </span>
                
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={viewUnitMode === 'GRAMS'}
                    onChange={e => setViewUnitMode(e.target.checked ? 'GRAMS' : 'PCT')}
                  />
                  <span className="toggle-slider"></span>
                </label>

                <span style={{ color: viewUnitMode === 'GRAMS' ? 'var(--clr-text-primary)' : 'var(--clr-text-muted)', fontWeight: viewUnitMode === 'GRAMS' ? 700 : 500 }}>
                  Gramos/mg
                </span>
              </div>
            </div>

            {/* List of Ingredients with Custom Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {calculatedItems.map((item) => (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  
                  {/* Label & Value Display */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
                        {item.name}
                      </span>
                      
                      {/* Metric Indicator */}
                      {viewUnitMode === 'PCT' ? (
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>
                          ({item.pct.toFixed(0)}%)
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={Math.round(item.netWeightG)}
                            onChange={(e) => handleGramsChange(item.id, Number(e.target.value))}
                            style={{
                              width: 65,
                              padding: '2px 6px',
                              borderRadius: 6,
                              border: '1px solid var(--clr-border-strong)',
                              fontFamily: 'var(--font-mono)',
                              fontSize: 13,
                              fontWeight: 700,
                              textAlign: 'center'
                            }}
                          />
                          <span style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>g</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Lock Button */}
                      <button
                        onClick={() => toggleLock(item.id)}
                        className="btn-ghost"
                        title={item.isLocked ? 'Ingrediente bloqueado (fijo)' : 'Desbloqueado para cálculo'}
                        style={{ padding: 4, color: item.isLocked ? 'var(--clr-text-primary)' : 'var(--clr-text-muted)' }}
                      >
                        {item.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                      </button>

                      {/* Remove item */}
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

                  {/* Range Slider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      disabled={item.isLocked}
                      value={item.pct}
                      onChange={e => handleSliderChange(item.id, Number(e.target.value))}
                      className="custom-range"
                      style={{
                        '--clr-thumb-color': item.color,
                        accentColor: item.color,
                        cursor: item.isLocked ? 'not-allowed' : 'pointer'
                      } as React.CSSProperties}
                    />
                  </div>

                </div>
              ))}
            </div>

            {/* Quick Add Selector from Existing Ingredients */}
            <div className="flex items-center gap-2" style={{ marginTop: 8, paddingTop: 12, borderTop: '1px dashed var(--clr-border)' }}>
              <select
                className="input"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    const mat = materials.find(m => m.id === Number(e.target.value));
                    if (mat) {
                      const newId = Date.now();
                      setCustomNamesMap(prev => ({ ...prev, [newId]: mat.name }));
                      const newItem: SliderItem = {
                        id: newId,
                        materialId: mat.id,
                        pct: 5,
                        isLocked: false,
                        errorTolPct: 2,
                        costPerMg: mat.costPerMg || 0.000003
                      };
                      const next = redistributeSliders([...formulaItems, newItem], newId, 5);
                      setFormulaItems(next);
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
                  background: '#E2F0FD',
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
                      width: 44,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontWeight: 700,
                      fontSize: 14,
                      color: '#1E5080',
                      textAlign: 'center'
                    }}
                    value={coldWastePct}
                    onChange={e => setColdWastePct(Number(e.target.value))}
                  />
                  <span style={{ fontWeight: 700, color: '#1E5080', fontSize: 13 }}>%</span>
                </div>
              </div>

              {/* Merma térmica */}
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text-secondary)' }}>
                  Merma térmica:
                </span>
                <div style={{
                  background: '#FDE7EF',
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
                      width: 44,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontWeight: 700,
                      fontSize: 14,
                      color: '#9C2756',
                      textAlign: 'center'
                    }}
                    value={thermalWastePct}
                    onChange={e => setThermalWastePct(Number(e.target.value))}
                  />
                  <span style={{ fontWeight: 700, color: '#9C2756', fontSize: 13 }}>%</span>
                </div>
              </div>

              {/* Margen de error */}
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text-secondary)' }}>
                  Margen de error:
                </span>
                <div style={{
                  background: '#FFFFFF',
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
              Costeo y Precio Sugerido
            </h2>

            {/* Cost Breakdown Block (Matching Image) */}
            <div style={{
              background: '#FFF9F1',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              border: '1px solid #F2E4D4',
              display: 'grid',
              gridTemplateColumns: '1fr 1.3fr',
              alignItems: 'center',
              gap: 16
            }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text-secondary)', display: 'block' }}>
                  Costo Base:
                </span>
                <span className="font-mono" style={{ fontSize: 34, fontWeight: 800, color: '#2A1B12', letterSpacing: '-0.03em' }}>
                  ${costs.baseTotal.toFixed(2)}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--clr-text-secondary)' }}>Insumos:</span>
                  <span className="font-mono font-bold">${costs.ingredients.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--clr-text-secondary)' }}>Empaque:</span>
                  <div className="flex items-center gap-1 font-mono font-bold">
                    <span>$</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={packagingCost}
                      onChange={e => setPackagingCost(Number(e.target.value))}
                      style={{ width: 55, border: 'none', background: 'transparent', textAlign: 'right', fontWeight: 700, fontFamily: 'inherit', outline: 'none' }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--clr-text-secondary)' }}>Mano de Obra/Servicios:</span>
                  <div className="flex items-center gap-1 font-mono font-bold">
                    <span>$</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={laborAndServices}
                      onChange={e => setLaborAndServices(Number(e.target.value))}
                      style={{ width: 55, border: 'none', background: 'transparent', textAlign: 'right', fontWeight: 700, fontFamily: 'inherit', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Wholesale percentage slider bar (Solicitado por el usuario) */}
            <div style={{
              background: '#F8F4EE',
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
                <span className="font-mono font-bold" style={{ color: 'var(--clr-gold-600)' }}>
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
                background: '#FFFFFF',
                border: '1px solid var(--clr-border-strong)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 12px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 6
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-secondary)', lineHeight: 1.2 }}>
                  Precio Mínimo<br />(Piso):
                </span>
                <span className="font-mono font-bold" style={{ fontSize: 24, color: '#2A1B12' }}>
                  ${prices.piso.toFixed(2)}
                </span>
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
                gap: 6,
                boxShadow: '0 6px 20px rgba(223, 152, 50, 0.35)',
                color: '#FFFFFF'
              }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255, 255, 255, 0.95)', lineHeight: 1.2 }}>
                  Precio Sugerido<br />(Óptimo):
                </span>
                <span className="font-mono font-bold" style={{ fontSize: 26, color: '#FFFFFF' }}>
                  ${prices.optimo.toFixed(2)}
                </span>
              </div>

              {/* Precio Premium */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid var(--clr-border-strong)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 12px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 6
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-secondary)', lineHeight: 1.2 }}>
                  Precio<br />Premium:
                </span>
                <span className="font-mono font-bold" style={{ fontSize: 24, color: '#2A1B12' }}>
                  ${prices.premium.toFixed(2)}
                </span>
              </div>

            </div>

            {/* Wholesale Price Badge */}
            <div className="flex items-center justify-between" style={{
              background: '#FFF8EE',
              border: '1px dashed var(--clr-gold-400)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 14px'
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>
                Precio Mayorista Calculado:
              </span>
              <span className="font-mono font-bold" style={{ fontSize: 16, color: 'var(--clr-gold-600)' }}>
                ${prices.mayor.toFixed(2)}
              </span>
            </div>

            {/* Prominent Dark Button: [Copiar Consulta para IA] 🪄+AI */}
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
                background: '#2A1A12',
                color: '#FFFFFF',
                boxShadow: '0 6px 18px rgba(42, 26, 18, 0.25)'
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
        background: '#FFFFFF',
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
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(30, 20, 10, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div className="card animate-fadeIn" style={{ maxWidth: 480, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--clr-text-primary)' }}>
              Agregar Ingrediente Personalizado
            </h2>
            <p style={{ fontSize: 13, color: 'var(--clr-text-secondary)', margin: 0 }}>
              Ingresa el nombre, los gramos requeridos en esta receta y su costo. Se integrará automáticamente a los medidores de ingredientes.
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
                  placeholder="Ej: Topping Galleta Lotus, Pasta de Avellanas..."
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>
                    Cantidad en Receta (g)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    className="input font-mono font-bold"
                    value={customGrams}
                    onChange={e => setCustomGrams(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>
                    Costo Estimado ($ / kg)
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
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(30, 20, 10, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div className="card animate-fadeIn" style={{
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
                background: '#FAF5EE',
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
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(30, 20, 10, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div className="card animate-fadeIn" style={{ maxWidth: 460, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
