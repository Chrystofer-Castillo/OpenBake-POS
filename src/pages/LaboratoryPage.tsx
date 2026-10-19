import { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import {
  FlaskConical, Lock, Unlock, Sparkles, Copy, Check, Save,
  Plus, Trash2, Flame, Snowflake
} from 'lucide-react';
import {
  redistributeSliders,
  calcRecipeCosts,
  calcPrices,
  calcMaxCbase,
  buildAiQuery,
  type SliderItem
} from '../lib/engine';
import type { Recipe, RecipeItem } from '../types';

export default function LaboratoryPage() {
  const settings = useAppStore(s => s.settings);
  const materials = useAppStore(s => s.materials);
  const recipes = useAppStore(s => s.recipes);
  const addRecipe = useAppStore(s => s.addRecipe);
  const updateRecipe = useAppStore(s => s.updateRecipe);
  const pushAlert = useAppStore(s => s.pushAlert);

  // Active selected recipe or new
  const [selectedRecipeId, setSelectedRecipeId] = useState<number>(recipes[0]?.id || 1);
  const activeRecipe = recipes.find(r => r.id === selectedRecipeId) || recipes[0];

  // Working state for formulation
  const [recipeName, setRecipeName] = useState(activeRecipe?.name || 'Nueva Fórmula');
  const [recipeDesc, setRecipeDesc] = useState(activeRecipe?.description || '');
  const [batchWeightG, setBatchWeightG] = useState<number>(activeRecipe?.batchWeightG || 1000);
  const [coldWastePct, setColdWastePct] = useState<number>(activeRecipe?.coldWastePct || 2.0);
  const [thermalWastePct, setThermalWastePct] = useState<number>(activeRecipe?.thermalWastePct || 0.5);
  const [laborCostMin, setLaborCostMin] = useState<number>(activeRecipe?.laborCostMin || 12);
  const [ovenCostMin, setOvenCostMin] = useState<number>(activeRecipe?.ovenCostMin || 5);
  const [packagingCost, setPackagingCost] = useState<number>(activeRecipe?.costs?.packaging || 0.45);
  const [wholesaleCustomPct, setWholesaleCustomPct] = useState<number>(settings.wholesalePct || 18);

  // Target Costing simulator state
  const [targetSellPrice, setTargetSellPrice] = useState<number>(6.00);

  // AI Prompt Modal
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiMode, setAiMode] = useState<'market' | 'recipe' | 'social'>('market');
  const [copied, setCopied] = useState(false);

  // Items in formula
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
    return [];
  });

  // Switch recipe helper
  const handleSelectRecipe = (id: number) => {
    setSelectedRecipeId(id);
    const r = recipes.find(x => x.id === id);
    if (!r) return;
    setRecipeName(r.name);
    setRecipeDesc(r.description || '');
    setBatchWeightG(r.batchWeightG);
    setColdWastePct(r.coldWastePct);
    setThermalWastePct(r.thermalWastePct);
    setLaborCostMin(r.laborCostMin);
    setOvenCostMin(r.ovenCostMin);
    setPackagingCost(r.costs?.packaging || 0.45);
    setWholesaleCustomPct(r.prices?.wholesalePct || settings.wholesalePct || 18);
    if (r.items) {
      setFormulaItems(r.items.map(it => {
        const mat = materials.find(m => m.id === it.materialId);
        return {
          id: it.id,
          materialId: it.materialId,
          pct: it.pctValue,
          isLocked: it.isLocked === 1,
          errorTolPct: it.errorTolPct,
          costPerMg: mat?.costPerMg || 0.000003
        };
      }));
    }
  };

  // Slider change handler using zero-sum engine
  const handleSliderChange = (movedId: number, val: number) => {
    const next = redistributeSliders(formulaItems, movedId, val);
    setFormulaItems(next);
  };

  const toggleLock = (id: number) => {
    setFormulaItems(prev => prev.map(item =>
      item.id === id ? { ...item, isLocked: !item.isLocked } : item
    ));
  };

  const handleAddMaterialToFormula = (matId: number) => {
    const mat = materials.find(m => m.id === matId);
    if (!mat) return;
    if (formulaItems.some(i => i.materialId === matId)) {
      pushAlert({ type: 'warn', message: 'Ese ingrediente ya está en la fórmula' });
      return;
    }
    const newId = Date.now();
    const currentSum = formulaItems.reduce((acc, i) => acc + i.pct, 0);
    const available = Math.max(0, 100 - currentSum);
    const newPct = available > 0 ? Math.min(available, 5) : 0;
    const newItem: SliderItem = {
      id: newId,
      materialId: mat.id,
      pct: newPct,
      isLocked: false,
      errorTolPct: 1.5,
      costPerMg: mat.costPerMg || 0.000003
    };
    setFormulaItems([...formulaItems, newItem]);
  };

  const handleRemoveItem = (id: number) => {
    setFormulaItems(prev => prev.filter(i => i.id !== id));
  };

  // Calculations
  const calculatedItems = useMemo(() => {
    const batchMg = batchWeightG * 1000;
    return formulaItems.map(item => {
      const netMg = (batchMg * item.pct) / 100;
      const mat = materials.find(m => m.id === item.materialId);
      return {
        ...item,
        netWeightMg: netMg,
        netWeightG: netMg / 1000,
        name: mat?.name || 'Ingrediente',
        unit: mat?.unit || 'g',
        costPerMg: mat?.costPerMg || item.costPerMg
      };
    });
  }, [formulaItems, batchWeightG, materials]);

  const costs = useMemo(() => {
    const laborRatePerMin = 0.035; // $2.10/hr
    const ovenRatePerMin = 0.025;
    return calcRecipeCosts(
      calculatedItems,
      packagingCost,
      laborCostMin,
      ovenCostMin,
      laborRatePerMin,
      ovenRatePerMin,
      { coldWastePct, thermalWastePct }
    );
  }, [calculatedItems, packagingCost, laborCostMin, ovenCostMin, coldWastePct, thermalWastePct]);

  const prices = useMemo(() => {
    return calcPrices(costs.baseTotal, {
      taxPct: settings.taxPct,
      cogsPct: settings.cogsPct,
      wholesalePct: wholesaleCustomPct
    });
  }, [costs.baseTotal, settings.taxPct, settings.cogsPct, wholesaleCustomPct]);

  // Target Costing calculation
  const maxAllowedCbase = useMemo(() => {
    return calcMaxCbase(targetSellPrice, settings.taxPct, settings.cogsPct);
  }, [targetSellPrice, settings.taxPct, settings.cogsPct]);

  // Total Percentage sum
  const totalPct = useMemo(() => {
    return formulaItems.reduce((acc, i) => acc + i.pct, 0);
  }, [formulaItems]);

  // AI Prompt generation
  const generatedAiPrompt = useMemo(() => {
    return buildAiQuery({
      businessName: settings.businessName,
      recipeName,
      description: recipeDesc || 'Helado y repostería artesanal de alta calidad',
      finalWeightG: costs.finalWeightG,
      items: calculatedItems.map(i => ({
        name: i.name,
        weightG: i.netWeightG,
        pct: i.pct,
        cost: (i.netWeightMg * i.costPerMg)
      })),
      packagingDetail: 'Empaque grado alimenticio con sello',
      packagingCost,
      costs,
      prices,
      taxPct: settings.taxPct,
      state: settings.state,
      city: settings.city,
      zoneType: settings.zoneType,
      mode: aiMode
    });
  }, [settings, recipeName, recipeDesc, costs, calculatedItems, packagingCost, prices, aiMode]);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generatedAiPrompt);
    setCopied(true);
    pushAlert({ type: 'success', message: '¡Prompt copiado al portapapeles! Listo para pegar en ChatGPT o Claude.' });
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

    const recipeData: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> = {
      name: recipeName,
      description: recipeDesc,
      batchWeightG,
      coldWastePct,
      thermalWastePct,
      laborCostMin,
      ovenCostMin,
      priceMode: 'DYNAMIC',
      fixedPrice: null,
      competitorPrice: 8.0,
      roundingMode: 'PSYCHOLOGICAL',
      isArchived: 0,
      items: itemsPayload,
      costs,
      prices
    };

    if (recipes.some(r => r.id === selectedRecipeId)) {
      updateRecipe(selectedRecipeId, recipeData);
    } else {
      const newId = addRecipe(recipeData);
      setSelectedRecipeId(newId);
    }
  };

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-gold">
              <FlaskConical size={14} /> Laboratorio & Formulación
            </span>
            <span className="badge badge-mint">Motor Decimal.js</span>
          </div>
          <h1 className="page-title" style={{ marginTop: 6 }}>Laboratorio de Fórmulas y Precios</h1>
          <p className="page-subtitle">
            Ajuste dinámico suma cero, capas de merma técnica y cálculo de precios (Detal y Mayorista).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="btn btn-secondary"
            style={{ background: 'linear-gradient(135deg, rgba(245,200,66,0.15), rgba(244,114,182,0.15))', borderColor: 'var(--clr-gold-400)' }}
          >
            <Sparkles size={16} color="var(--clr-gold-400)" />
            <span>Consultor IA (Prompt)</span>
          </button>

          <button onClick={handleSaveRecipe} className="btn btn-primary">
            <Save size={16} />
            <span>Guardar Receta</span>
          </button>
        </div>
      </div>

      {/* Recipe Selector Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div className="flex items-center gap-3" style={{ flex: 1, minWidth: 260 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text-muted)' }}>Receta activa:</label>
          <select
            className="input"
            value={selectedRecipeId}
            onChange={(e) => handleSelectRecipe(Number(e.target.value))}
            style={{ fontWeight: 600 }}
          >
            {recipes.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedRecipeId(Date.now());
              setRecipeName('Nueva Receta Dulce Arte');
              setRecipeDesc('');
              setFormulaItems([]);
            }}
            className="btn btn-ghost"
            style={{ fontSize: 13 }}
          >
            <Plus size={14} /> Nueva Fórmula
          </button>
        </div>
      </div>

      {/* Main Formulation & Pricing Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 'var(--space-6)' }}>
        
        {/* Left Column: Sliders & Ingredients */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          {/* General Specs Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--clr-text-primary)' }}>Parámetros del Lote</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Nombre del Producto</label>
                <input
                  type="text"
                  className="input"
                  value={recipeName}
                  onChange={e => setRecipeName(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Peso Lote Crudo (g)</label>
                <input
                  type="number"
                  className="input font-mono"
                  value={batchWeightG}
                  onChange={e => setBatchWeightG(Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Costo Empaque ($)</label>
                <input
                  type="number"
                  step="0.05"
                  className="input font-mono"
                  value={packagingCost}
                  onChange={e => setPackagingCost(Number(e.target.value))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--clr-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Snowflake size={12} color="var(--clr-primary-light)" /> Merma Frío (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="input font-mono"
                  value={coldWastePct}
                  onChange={e => setColdWastePct(Number(e.target.value))}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--clr-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Flame size={12} color="var(--clr-rose-400)" /> Merma Térmica (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="input font-mono"
                  value={thermalWastePct}
                  onChange={e => setThermalWastePct(Number(e.target.value))}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--clr-text-muted)' }}>Mano de Obra (min)</label>
                <input
                  type="number"
                  className="input font-mono"
                  value={laborCostMin}
                  onChange={e => setLaborCostMin(Number(e.target.value))}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--clr-text-muted)' }}>Energía / Horno (min)</label>
                <input
                  type="number"
                  className="input font-mono"
                  value={ovenCostMin}
                  onChange={e => setOvenCostMin(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Zero-Sum Sliders Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
                  Ingredientes & Sliders Suma Cero
                </h3>
                <p style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
                  Bloquea los ingredientes fijos con el candado. Al mover uno, los desbloqueados se recalculan manteniendo el 100%.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: Math.abs(totalPct - 100) < 0.1 ? 'var(--clr-mint-400)' : 'var(--clr-warning)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  Total: {totalPct.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Ingredients Table & Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {calculatedItems.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--clr-bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    border: '1px solid var(--clr-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleLock(item.id)}
                        title={item.isLocked ? 'Ingrediente fijo (Bloqueado)' : 'Desbloquear para ajuste dinámico'}
                        style={{
                          background: item.isLocked ? 'rgba(245,200,66,0.15)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: item.isLocked ? 'var(--clr-gold-400)' : 'var(--clr-text-muted)',
                          padding: 4,
                          borderRadius: 4
                        }}
                      >
                        {item.isLocked ? <Lock size={15} /> : <Unlock size={15} />}
                      </button>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-mono" style={{ fontSize: 13, color: 'var(--clr-text-secondary)' }}>
                        {item.netWeightG.toFixed(1)} g
                      </span>
                      <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--clr-gold-400)', minWidth: 50, textAlign: 'right' }}>
                        {item.pct.toFixed(1)}%
                      </span>
                      <span className="font-mono" style={{ fontSize: 12, color: 'var(--clr-text-muted)', minWidth: 60, textAlign: 'right' }}>
                        ${(item.netWeightMg * item.costPerMg).toFixed(3)}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="btn-ghost"
                        style={{ color: 'var(--clr-danger)', padding: 4 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Range Slider */}
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.1"
                      disabled={item.isLocked}
                      value={item.pct}
                      onChange={e => handleSliderChange(item.id, Number(e.target.value))}
                      style={{
                        flex: 1,
                        cursor: item.isLocked ? 'not-allowed' : 'pointer',
                        accentColor: item.isLocked ? 'var(--clr-text-muted)' : 'var(--clr-gold-400)'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Add ingredient dropdown */}
            <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
              <select
                className="input"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddMaterialToFormula(Number(e.target.value));
                    e.target.value = '';
                  }
                }}
                style={{ fontSize: 13 }}
              >
                <option value="" disabled>+ Añadir ingrediente desde inventario...</option>
                {materials
                  .filter(m => !formulaItems.some(fi => fi.materialId === m.id))
                  .map(m => (
                    <option key={m.id} value={m.id}>{m.name} (${m.costPerUnit} / {m.buyUnit})</option>
                  ))
                }
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing Engine & Target Costing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          {/* Cost Layers Summary */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
              Estructura de Costo Base (Cbase)
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--clr-text-muted)' }}>1. Ingredientes (c/ mermas):</span>
                <span className="font-mono font-bold">${costs.ingredients.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--clr-text-muted)' }}>2. Empaque y tarrina:</span>
                <span className="font-mono font-bold">${costs.packaging.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--clr-text-muted)' }}>3. Mano de obra y energía:</span>
                <span className="font-mono font-bold">${costs.laborAndOven.toFixed(2)}</span>
              </div>
              <div style={{ borderTop: '1px dashed var(--clr-border)', margin: '4px 0' }} />
              <div className="flex items-center justify-between" style={{ fontSize: 15, color: 'var(--clr-text-primary)' }}>
                <span style={{ fontWeight: 700 }}>Costo Base Total (Cbase):</span>
                <span className="font-mono font-bold" style={{ color: 'var(--clr-mint-400)' }}>
                  ${costs.baseTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between" style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
                <span>Rendimiento neto final:</span>
                <span className="font-mono">{costs.finalWeightG.toFixed(0)} g (${(costs.costPerG * 100).toFixed(3)} / 100g)</span>
              </div>
            </div>
          </div>

          {/* 4-Tier Pricing Grid (INCLUDING WHOLESALE FEATURE REQUESTED BY USER) */}
          <div className="card" style={{ borderColor: 'rgba(245,200,66,0.3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <div className="flex items-center justify-between">
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--clr-gold-400)' }}>
                  Parrilla de Precios Inteligente
                </h3>
                <span className="badge badge-gold">IVA {settings.taxPct}% incl.</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', marginTop: 2 }}>
                Tasa BCV: <strong className="font-mono">{settings.bcvRate} Bs/$</strong>
              </p>
            </div>

            {/* Wholesale Custom Slider (Solicitud explícita del usuario) */}
            <div style={{
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-primary-light)' }}>
                  % Descuento Venta al Mayor:
                </span>
                <span className="font-mono font-bold" style={{ color: 'var(--clr-primary-light)', fontSize: 14 }}>
                  {wholesaleCustomPct}%
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="35"
                step="1"
                value={wholesaleCustomPct}
                onChange={e => setWholesaleCustomPct(Number(e.target.value))}
                style={{ accentColor: 'var(--clr-primary-light)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 11, color: 'var(--clr-text-muted)' }}>
                El precio mayorista se protege automáticamente para nunca caer por debajo del Precio Piso.
              </span>
            </div>

            {/* Price Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              
              {/* Precio Piso */}
              <div style={{
                background: 'var(--clr-bg-subtle)',
                border: '1px solid var(--clr-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>
                  1. Precio Piso (Mínimo)
                </span>
                <span className="font-mono font-bold" style={{ fontSize: 20, color: 'var(--clr-text-secondary)' }}>
                  ${prices.piso.toFixed(2)}
                </span>
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--clr-text-muted)' }}>
                  Bs. {(prices.piso * settings.bcvRate).toFixed(2)}
                </span>
                <span style={{ fontSize: 10, color: 'var(--clr-text-muted)' }}>Margen mínimo salud (15%)</span>
              </div>

              {/* Precio Óptimo (DESTACADO EN DORADO) */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(245,200,66,0.12), rgba(245,200,66,0.03))',
                border: '2px solid var(--clr-gold-400)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                boxShadow: '0 4px 16px rgba(245,200,66,0.1)'
              }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-gold-400)', textTransform: 'uppercase' }}>
                    2. Precio Óptimo ★
                  </span>
                  <span className="badge badge-gold" style={{ fontSize: 9 }}>Detal</span>
                </div>
                <span className="font-mono font-bold" style={{ fontSize: 22, color: 'var(--clr-gold-400)' }}>
                  ${prices.optimo.toFixed(2)}
                </span>
                <span className="font-mono font-bold" style={{ fontSize: 12, color: 'var(--clr-text-primary)' }}>
                  Bs. {(prices.optimo * settings.bcvRate).toFixed(2)}
                </span>
                <span style={{ fontSize: 10, color: 'var(--clr-text-secondary)' }}>Margen meta del negocio ({100 - settings.cogsPct}%)</span>
              </div>

              {/* Precio Premium */}
              <div style={{
                background: 'var(--clr-bg-subtle)',
                border: '1px solid rgba(244,114,182,0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--clr-rose-400)', textTransform: 'uppercase' }}>
                  3. Precio Premium
                </span>
                <span className="font-mono font-bold" style={{ fontSize: 20, color: 'var(--clr-rose-400)' }}>
                  ${prices.premium.toFixed(2)}
                </span>
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--clr-text-muted)' }}>
                  Bs. {(prices.premium * settings.bcvRate).toFixed(2)}
                </span>
                <span style={{ fontSize: 10, color: 'var(--clr-text-muted)' }}>Decoración / Gourmet (+30%)</span>
              </div>

              {/* Precio al Mayor (CONFIGURABLE) */}
              <div style={{
                background: 'rgba(59,130,246,0.1)',
                border: '2px solid var(--clr-primary-light)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-primary-light)', textTransform: 'uppercase' }}>
                    4. Precio al Mayor
                  </span>
                  <span className="badge badge-mint" style={{ fontSize: 9 }}>-{wholesaleCustomPct}%</span>
                </div>
                <span className="font-mono font-bold" style={{ fontSize: 22, color: 'var(--clr-primary-light)' }}>
                  ${prices.mayor.toFixed(2)}
                </span>
                <span className="font-mono font-bold" style={{ fontSize: 12, color: 'var(--clr-text-primary)' }}>
                  Bs. {(prices.mayor * settings.bcvRate).toFixed(2)}
                </span>
                <span style={{ fontSize: 10, color: 'var(--clr-text-secondary)' }}>Para cafeterías y revendedores</span>
              </div>

            </div>
          </div>

          {/* Target Costing Simulator (Costeo Inverso) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
              Simulador Inverso (Costeo por Objetivo)
            </h3>
            <p style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
              ¿A qué precio deseas vender? El sistema te indica el costo base máximo permitido para mantener la meta financiera.
            </p>

            <div className="flex items-center gap-3">
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--clr-text-muted)' }}>Precio de Venta Deseado ($)</label>
                <input
                  type="number"
                  step="0.5"
                  className="input font-mono"
                  value={targetSellPrice}
                  onChange={e => setTargetSellPrice(Number(e.target.value))}
                />
              </div>

              <div style={{ flex: 1, padding: '10px 14px', background: 'var(--clr-bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: 11, color: 'var(--clr-text-muted)', display: 'block' }}>Cbase Máximo:</span>
                <span className="font-mono font-bold" style={{ fontSize: 16, color: costs.baseTotal <= maxAllowedCbase ? 'var(--clr-mint-400)' : 'var(--clr-danger)' }}>
                  ${maxAllowedCbase.toFixed(2)}
                </span>
                <span style={{ fontSize: 10, display: 'block', color: 'var(--clr-text-muted)' }}>
                  {costs.baseTotal <= maxAllowedCbase ? '✓ Tu costo actual es viable' : '⚠ Debes reducir costos'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* AI CONSULTANT PROMPT GENERATOR MODAL (SOLICITUD EXPLÍCITA DEL USUARIO) */}
      {isAiModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div className="card animate-fadeIn" style={{
            maxWidth: 750,
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            borderColor: 'var(--clr-gold-400)'
          }}>
            <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--clr-border)', paddingBottom: 12 }}>
              <div className="flex items-center gap-2">
                <Sparkles size={20} color="var(--clr-gold-400)" />
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
                  Generador de Prompt para Inteligencia Artificial
                </h2>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="btn-ghost"
                style={{ fontSize: 18, color: 'var(--clr-text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--clr-text-secondary)', margin: 0 }}>
              Este módulo compila la fórmula exacta, costos y precios de tu negocio en <strong>{settings.city}, {settings.state}</strong>.
              Copia este texto y pégalo directamente en <strong>ChatGPT, Claude o DeepSeek</strong> para recibir asesoría profesional de alto nivel.
            </p>

            {/* Prompt Mode Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAiMode('market')}
                className={`btn ${aiMode === 'market' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 12, padding: '6px 14px' }}
              >
                1. Posición de Mercado & Precio
              </button>
              <button
                onClick={() => setAiMode('recipe')}
                className={`btn ${aiMode === 'recipe' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 12, padding: '6px 14px' }}
              >
                2. Balance Técnico & Reducción Costos
              </button>
              <button
                onClick={() => setAiMode('social')}
                className={`btn ${aiMode === 'social' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 12, padding: '6px 14px' }}
              >
                3. WhatsApp & Redes Sociales
              </button>
            </div>

            {/* Prompt Text Box */}
            <textarea
              readOnly
              value={generatedAiPrompt}
              style={{
                width: '100%',
                height: 280,
                background: 'var(--clr-bg-subtle)',
                border: '1px solid var(--clr-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--clr-text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                lineHeight: 1.5,
                padding: 14,
                resize: 'none'
              }}
            />

            {/* Footer Buttons */}
            <div className="flex items-center justify-between" style={{ paddingTop: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
                {calculatedItems.length} ingredientes incluidos con mermas y precios calculados.
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsAiModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleCopyPrompt}
                  className="btn btn-primary"
                  style={{ minWidth: 200 }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? '¡Copiado con Éxito!' : 'Copiar Texto para IA'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
