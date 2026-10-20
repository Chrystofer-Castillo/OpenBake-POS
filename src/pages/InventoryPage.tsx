import { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import {
  Package, Plus, Search, AlertTriangle, CheckCircle2, ArrowDownCircle,
  ArrowUpCircle, Trash2, Edit3, RefreshCw
} from 'lucide-react';
import type { RawMaterial, MaterialType, UnitType } from '../types';

export default function InventoryPage() {
  const settings = useAppStore(s => s.settings);
  const materials = useAppStore(s => s.materials);
  const addMaterial = useAppStore(s => s.addMaterial);
  const updateMaterial = useAppStore(s => s.updateMaterial);
  const deleteMaterial = useAppStore(s => s.deleteMaterial);
  const pushAlert = useAppStore(s => s.pushAlert);

  // Search and filter: Default to INSUMO (Solo Ingredientes) per user request
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'INSUMO' | 'EMPAQUE' | 'ALL' | 'ALERTS'>('INSUMO');

  // Modal for new / edit material
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<MaterialType>('INSUMO');
  const [unit, setUnit] = useState<UnitType>('kg');
  const [stockHuman, setStockHuman] = useState<number>(10);
  const [minStockHuman, setMinStockHuman] = useState<number>(3);
  const [costPerUnit, setCostPerUnit] = useState<number>(4.50);
  const [buyUnit, setBuyUnit] = useState('Kilogramo');

  // Quick Stock Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustMat, setAdjustMat] = useState<RawMaterial | null>(null);
  const [adjustQtyHuman, setAdjustQtyHuman] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<'COMPRA' | 'MERMA' | 'AJUSTE'>('COMPRA');

  // Helper unit conversions
  const unitMultiplier = (u: UnitType): number => {
    switch (u) {
      case 'kg':
      case 'l':
        return 1000000; // 1 kg = 1,000,000 mg
      case 'g':
      case 'ml':
        return 1000;
      case 'mg':
        return 1;
      case 'und':
        return 1;
    }
  };

  const humanizeStock = (mat: RawMaterial) => {
    const mult = unitMultiplier(mat.unit);
    const qty = mat.stockMg / mult;
    return `${qty.toLocaleString('es-VE', { maximumFractionDigits: 2 })} ${mat.unit}`;
  };

  const humanizeMinStock = (mat: RawMaterial) => {
    const mult = unitMultiplier(mat.unit);
    const qty = mat.minStock / mult;
    return `${qty.toLocaleString('es-VE', { maximumFractionDigits: 2 })} ${mat.unit}`;
  };

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (filterType === 'ALL') return true;
      if (filterType === 'INSUMO') return m.type === 'INSUMO';
      if (filterType === 'EMPAQUE') return m.type === 'EMPAQUE';
      if (filterType === 'ALERTS') return m.stockStatus === 'low' || m.stockStatus === 'critical';
      return true;
    });
  }, [materials, searchTerm, filterType]);

  // Inventory Totals
  const totalValueUsd = useMemo(() => {
    return materials.reduce((acc, m) => {
      const mult = unitMultiplier(m.unit);
      const unitsInStock = m.stockMg / mult;
      return acc + (unitsInStock * m.costPerUnit);
    }, 0);
  }, [materials]);

  const alertCount = useMemo(() => {
    return materials.filter(m => m.stockStatus === 'low' || m.stockStatus === 'critical').length;
  }, [materials]);

  // Open modal for new
  const handleOpenNew = () => {
    setEditingId(null);
    setName('');
    setType('INSUMO');
    setUnit('kg');
    setStockHuman(10);
    setMinStockHuman(3);
    setCostPerUnit(3.50);
    setBuyUnit('Kilogramo');
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (m: RawMaterial) => {
    setEditingId(m.id);
    setName(m.name);
    setType(m.type);
    setUnit(m.unit);
    const mult = unitMultiplier(m.unit);
    setStockHuman(m.stockMg / mult);
    setMinStockHuman(m.minStock / mult);
    setCostPerUnit(m.costPerUnit);
    setBuyUnit(m.buyUnit);
    setIsModalOpen(true);
  };

  // Save form
  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const mult = unitMultiplier(unit);
    const stockMg = stockHuman * mult;
    const minStock = minStockHuman * mult;
    const buyQtyMg = mult; // 1 unit in mg

    if (editingId) {
      updateMaterial(editingId, {
        name,
        type,
        unit,
        stockMg,
        minStock,
        costPerUnit,
        buyUnit,
        buyQtyMg
      });
    } else {
      addMaterial({
        name,
        type,
        unit,
        stockMg,
        minStock,
        costPerUnit,
        buyUnit,
        buyQtyMg
      });
    }

    setIsModalOpen(false);
  };

  // Save Quick Adjustment
  const handleApplyAdjustment = () => {
    if (!adjustMat) return;
    const mult = unitMultiplier(adjustMat.unit);
    const deltaMg = adjustQtyHuman * mult;
    let newStockMg = adjustMat.stockMg;

    if (adjustReason === 'COMPRA') {
      newStockMg += deltaMg;
    } else {
      newStockMg = Math.max(0, newStockMg - deltaMg);
    }

    updateMaterial(adjustMat.id, { stockMg: newStockMg });
    pushAlert({
      type: 'success',
      message: `${adjustReason === 'COMPRA' ? 'Entrada registrada' : 'Merma descontada'} en "${adjustMat.name}"`
    });
    setAdjustModalOpen(false);
  };

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-mint">
              <Package size={14} /> Control de Inventario
            </span>
            <span className="badge badge-gold">Precisión Miligramo</span>
          </div>
          <h1 className="page-title" style={{ marginTop: 6 }}>Almacén & Materias Primas</h1>
          <p className="page-subtitle">
            Kardex de insumos y empaques con valuación en tiempo real y alertas de reposición.
          </p>
        </div>

        <button onClick={handleOpenNew} className="btn btn-primary">
          <Plus size={16} />
          <span>Nuevo Insumo / Empaque</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--clr-text-muted)', fontWeight: 600 }}>VALORACIÓN TOTAL (USD)</span>
          <span className="font-mono font-bold" style={{ fontSize: 24, color: 'var(--clr-mint-400)' }}>
            ${totalValueUsd.toFixed(2)}
          </span>
          <span className="font-mono" style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
            Bs. {(totalValueUsd * settings.bcvRate).toFixed(2)} (Tasa BCV {settings.bcvRate})
          </span>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--clr-text-muted)', fontWeight: 600 }}>TOTAL ÍTEMS EN STOCK</span>
          <span className="font-mono font-bold" style={{ fontSize: 24, color: 'var(--clr-gold-400)' }}>
            {materials.length}
          </span>
          <span style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
            {materials.filter(m => m.type === 'INSUMO').length} Insumos · {materials.filter(m => m.type === 'EMPAQUE').length} Empaques
          </span>
        </div>

        <div className="card" style={{ borderColor: alertCount > 0 ? 'rgba(239,68,68,0.3)' : 'var(--clr-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--clr-text-muted)', fontWeight: 600 }}>ALERTAS DE REPOSICIÓN</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold" style={{ fontSize: 24, color: alertCount > 0 ? 'var(--clr-danger)' : 'var(--clr-mint-400)' }}>
              {alertCount}
            </span>
            {alertCount > 0 ? (
              <span className="badge badge-red flex items-center gap-1">
                <AlertTriangle size={12} /> Requiere Compra
              </span>
            ) : (
              <span className="badge badge-mint flex items-center gap-1">
                <CheckCircle2 size={12} /> Stock Saludable
              </span>
            )}
          </div>
          <span style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
            Ítems bajo o cerca del umbral mínimo de seguridad.
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 260 }}>
          <Search size={16} color="var(--clr-text-muted)" />
          <input
            type="text"
            className="input"
            placeholder="Buscar por nombre de ingrediente o empaque..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('INSUMO')}
            className={`btn ${filterType === 'INSUMO' ? 'btn-caramel' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '6px 14px' }}
          >
            🌾 Solo Ingredientes ({materials.filter(m => m.type === 'INSUMO').length})
          </button>
          <button
            onClick={() => setFilterType('EMPAQUE')}
            className={`btn ${filterType === 'EMPAQUE' ? 'btn-caramel' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '6px 14px' }}
          >
            📦 Empaques y Envases ({materials.filter(m => m.type === 'EMPAQUE').length})
          </button>
          <button
            onClick={() => setFilterType('ALL')}
            className={`btn ${filterType === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '6px 14px' }}
          >
            Todos ({materials.length})
          </button>
          <button
            onClick={() => setFilterType('ALERTS')}
            className={`btn ${filterType === 'ALERTS' ? 'btn-danger' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '6px 14px' }}
          >
            <AlertTriangle size={13} /> Alertas ({alertCount})
          </button>
        </div>
      </div>

      {/* Materials Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>ESTADO</th>
              <th>NOMBRE DEL PRODUCTO</th>
              <th>TIPO</th>
              <th>STOCK ACTUAL</th>
              <th>STOCK MÍNIMO</th>
              <th>COSTO UNITARIO ($)</th>
              <th>VALOR TOTAL ($)</th>
              <th style={{ textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.map(mat => {
              const mult = unitMultiplier(mat.unit);
              const totalVal = (mat.stockMg / mult) * mat.costPerUnit;

              return (
                <tr key={mat.id}>
                  <td>
                    {mat.stockStatus === 'critical' ? (
                      <span className="badge badge-red flex items-center gap-1" style={{ fontSize: 10 }}>
                        <AlertTriangle size={10} /> Crítico
                      </span>
                    ) : mat.stockStatus === 'low' ? (
                      <span className="badge badge-gold flex items-center gap-1" style={{ fontSize: 10 }}>
                        <AlertTriangle size={10} /> Bajo
                      </span>
                    ) : (
                      <span className="badge badge-mint flex items-center gap-1" style={{ fontSize: 10 }}>
                        <CheckCircle2 size={10} /> OK
                      </span>
                    )}
                  </td>
                  <td>
                    <strong style={{ color: 'var(--clr-text-primary)' }}>{mat.name}</strong>
                  </td>
                  <td>
                    <span className={`badge ${mat.type === 'INSUMO' ? 'badge-primary' : 'badge-gold'}`} style={{ fontSize: 10 }}>
                      {mat.type}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono font-bold" style={{
                      color: mat.stockStatus === 'critical' ? 'var(--clr-danger)' : mat.stockStatus === 'low' ? 'var(--clr-warning)' : 'var(--clr-text-primary)'
                    }}>
                      {humanizeStock(mat)}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono" style={{ color: 'var(--clr-text-muted)' }}>
                      {humanizeMinStock(mat)}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono">${mat.costPerUnit.toFixed(2)} / {mat.unit}</span>
                  </td>
                  <td>
                    <span className="font-mono font-bold" style={{ color: 'var(--clr-mint-400)' }}>
                      ${totalVal.toFixed(2)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setAdjustMat(mat);
                          setAdjustQtyHuman(1);
                          setAdjustReason('COMPRA');
                          setAdjustModalOpen(true);
                        }}
                        className="btn-ghost"
                        title="Registrar Entrada / Merma"
                        style={{ padding: 6, color: 'var(--clr-primary-light)' }}
                      >
                        <RefreshCw size={15} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(mat)}
                        className="btn-ghost"
                        title="Editar Material"
                        style={{ padding: 6, color: 'var(--clr-gold-400)' }}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Seguro que deseas eliminar "${mat.name}"?`)) {
                            deleteMaterial(mat.id);
                          }
                        }}
                        className="btn-ghost"
                        title="Eliminar"
                        style={{ padding: 6, color: 'var(--clr-danger)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal-content animate-fadeIn" style={{ maxWidth: 520, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
              {editingId ? 'Editar Materia Prima / Empaque' : 'Nueva Materia Prima / Empaque'}
            </h2>

            <form onSubmit={handleSaveMaterial} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Nombre del Ítem</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="Ej: Leche Entera Pasteurizada"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Tipo</label>
                  <select
                    className="input"
                    value={type}
                    onChange={e => setType(e.target.value as MaterialType)}
                  >
                    <option value="INSUMO">Insumo Alimenticio</option>
                    <option value="EMPAQUE">Empaque / Envase</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Unidad de Medida</label>
                  <select
                    className="input"
                    value={unit}
                    onChange={e => setUnit(e.target.value as UnitType)}
                  >
                    <option value="kg">Kilogramo (kg)</option>
                    <option value="g">Gramo (g)</option>
                    <option value="l">Litro (l)</option>
                    <option value="ml">Mililitro (ml)</option>
                    <option value="und">Unidad (und)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Stock Inicial ({unit})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="input font-mono"
                    value={stockHuman}
                    onChange={e => setStockHuman(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Stock Mínimo Alerta ({unit})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="input font-mono"
                    value={minStockHuman}
                    onChange={e => setMinStockHuman(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Costo por Unidad ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="input font-mono"
                    value={costPerUnit}
                    onChange={e => setCostPerUnit(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Presentación de Compra</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ej: Saco 25kg / Caja"
                    value={buyUnit}
                    onChange={e => setBuyUnit(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3" style={{ marginTop: 12 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Guardar Cambios' : 'Crear en Almacén'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADJUSTMENT MODAL */}
      {adjustModalOpen && adjustMat && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setAdjustModalOpen(false); }}>
          <div className="modal-content animate-fadeIn" style={{ maxWidth: 450, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
              Movimiento Rápido de Stock
            </h2>
            <p style={{ fontSize: 13, color: 'var(--clr-text-muted)' }}>
              Ítem: <strong>{adjustMat.name}</strong> (Stock actual: {humanizeStock(adjustMat)})
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Tipo de Movimiento</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustReason('COMPRA')}
                    className={`btn ${adjustReason === 'COMPRA' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: 12 }}
                  >
                    <ArrowDownCircle size={14} /> Entrada / Compra
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustReason('MERMA')}
                    className={`btn ${adjustReason === 'MERMA' ? 'btn-danger' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: 12 }}
                  >
                    <ArrowUpCircle size={14} /> Merma / Desecho
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Cantidad en {adjustMat.unit}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input font-mono"
                  value={adjustQtyHuman}
                  onChange={e => setAdjustQtyHuman(Number(e.target.value))}
                />
              </div>

              <div className="flex items-center justify-end gap-3" style={{ marginTop: 12 }}>
                <button type="button" onClick={() => setAdjustModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="button" onClick={handleApplyAdjustment} className="btn btn-primary">
                  Aplicar Ajuste
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
