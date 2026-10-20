import { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import {
  Receipt, Search, Printer,
  Eye, CheckCircle2, AlertTriangle, X,
  ShoppingBag, ArrowRight
} from 'lucide-react';
import type { Invoice, InvoiceItem, ExitType } from '../types';

export default function BillingPage() {
  const settings = useAppStore(s => s.settings);
  const recipes = useAppStore(s => s.recipes);
  const customers = useAppStore(s => s.customers);
  const invoices = useAppStore(s => s.invoices);
  const addInvoice = useAppStore(s => s.addInvoice);
  const pushAlert = useAppStore(s => s.pushAlert);

  // Active view: 'pos' (terminal en vivo) or 'history' (auditoría de tickets)
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');

  // Filter for history
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | ExitType>('ALL');

  // POS State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | 'MOSTRADOR'>('MOSTRADOR');
  const [exitType, setExitType] = useState<ExitType>('VENTA');
  const [isWholesale, setIsWholesale] = useState(false);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [cart, setCart] = useState<Array<{ recipeId: number; name: string; qty: number; unitPrice: number; baseCost: number }>>([]);
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Selected invoice for receipt modal
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // Calculate cart totals
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, it) => acc + (it.qty * it.unitPrice), 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    if (['REGALO', 'COMIDO', 'PERDIDO'].includes(exitType)) {
      return 0;
    }
    return cartSubtotal;
  }, [cartSubtotal, exitType]);

  // Add product to cart
  const handleAddToCart = (recipeId: number) => {
    const rec = recipes.find(r => r.id === recipeId);
    if (!rec) return;

    let price = rec.prices?.optimo || 5.0;
    if (isWholesale && rec.prices?.mayor) {
      price = rec.prices.mayor;
    }

    const baseCost = rec.costs?.baseTotal || 3.0;

    const existingIdx = cart.findIndex(c => c.recipeId === recipeId);
    if (existingIdx !== -1) {
      setCart(prev => prev.map((it, idx) =>
        idx === existingIdx ? { ...it, qty: it.qty + 1 } : it
      ));
    } else {
      setCart(prev => [
        ...prev,
        {
          recipeId: rec.id,
          name: `${rec.name}${isWholesale ? ' [Mayorista]' : ''}`,
          qty: 1,
          unitPrice: price,
          baseCost
        }
      ]);
    }
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateQty = (index: number, delta: number) => {
    setCart(prev => prev.map((it, idx) => {
      if (idx === index) {
        const newQty = Math.max(1, it.qty + delta);
        return { ...it, qty: newQty };
      }
      return it;
    }));
  };

  // Submit invoice from live terminal
  const handleSubmitInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart.length) {
      pushAlert({ type: 'warn', message: 'Debes añadir al menos un producto al ticket' });
      return;
    }

    let customerSnap = 'Cliente Mostrador (Venta al paso)';
    let customerId: number | null = null;

    if (selectedCustomerId !== 'MOSTRADOR') {
      const cust = customers.find(c => c.id === selectedCustomerId);
      if (cust) {
        customerId = cust.id;
        customerSnap = `${cust.fullName} (${cust.cedulaRif})`;
      }
    }

    const items: Omit<InvoiceItem, 'id' | 'invoiceId'>[] = cart.map(it => ({
      recipeId: it.recipeId,
      recipeNameSnap: it.name,
      qty: it.qty,
      unitPriceCharged: exitType === 'REGALO' || exitType === 'COMIDO' || exitType === 'PERDIDO' ? 0 : it.unitPrice,
      unitBaseCostSnapshot: it.baseCost
    }));

    const sha256 = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const invoiceTotal = cartTotal;
    const actualPaid = exitType === 'CREDITO' ? 0 : paidAmount > 0 ? paidAmount : invoiceTotal;

    addInvoice({
      customerId,
      customerSnap,
      exitType,
      total: invoiceTotal,
      paid: actualPaid,
      dueDate: exitType === 'CREDITO' ? new Date(Date.now() + 7 * 86400000).toISOString() : null,
      notes: invoiceNotes,
      sha256,
      items: items.map((it, idx) => ({ ...it, id: idx + 1, invoiceId: 0 }))
    });

    // Reset cart
    setCart([]);
    setPaidAmount(0);
    setInvoiceNotes('');
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch = inv.serialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.customerSnap.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
      if (filterType === 'ALL') return true;
      return inv.exitType === filterType;
    });
  }, [invoices, searchTerm, filterType]);

  const totalSalesUsd = useMemo(() => {
    return invoices
      .filter(i => i.exitType === 'VENTA' || i.exitType === 'CREDITO')
      .reduce((acc, i) => acc + i.total, 0);
  }, [invoices]);

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      
      {/* Top Header */}
      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-gold">
              <Receipt size={14} /> Punto de Venta Principal (Nivel 1)
            </span>
            <span className="badge badge-mint">Tasa BCV: {settings.bcvRate} Bs/$</span>
            <span className="badge badge-gold font-mono">Total Vendido: ${totalSalesUsd.toFixed(2)}</span>
          </div>
          <h1 className="page-title" style={{ marginTop: 4 }}>
            Caja / POS & Despacho
          </h1>
          <p className="page-subtitle">
            Facturación inmediata al detal o mayorista, control de caja y descuento automático de inventario.
          </p>
        </div>

        {/* Navigation Tabs (POS en vivo vs Historial) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pos')}
            className={`btn ${activeTab === 'pos' ? 'btn-caramel' : 'btn-secondary'}`}
            style={{ fontWeight: 700 }}
          >
            <ShoppingBag size={15} />
            <span>Terminal de Venta (POS)</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 700 }}
          >
            <Receipt size={15} />
            <span>Historial de Tickets ({invoices.length})</span>
          </button>
        </div>
      </div>

      {/* POS LIVE TERMINAL VIEW */}
      {activeTab === 'pos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 'var(--space-6)' }}>
          
          {/* Left: Product Catalog Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            
            {/* Wholesale & Options Bar */}
            <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
                  Modalidad de Venta:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsWholesale(false);
                    setCart(prev => prev.map(item => {
                      const rec = recipes.find(r => r.id === item.recipeId);
                      return { ...item, name: rec?.name || item.name, unitPrice: rec?.prices?.optimo || item.unitPrice };
                    }));
                  }}
                  className={`btn ${!isWholesale ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 12, padding: '6px 14px' }}
                >
                  Detal (Público)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsWholesale(true);
                    setCart(prev => prev.map(item => {
                      const rec = recipes.find(r => r.id === item.recipeId);
                      const price = rec?.prices?.mayor || rec?.prices?.optimo || item.unitPrice;
                      return { ...item, name: `${rec?.name || item.name} [Mayorista]`, unitPrice: price };
                    }));
                  }}
                  className={`btn ${isWholesale ? 'btn-caramel' : 'btn-secondary'}`}
                  style={{ fontSize: 12, padding: '6px 14px' }}
                >
                  Mayorista (-{settings.wholesalePct}%)
                </button>
              </div>

              <span style={{ fontSize: 11, color: 'var(--clr-text-muted)' }}>
                Toca cualquier producto para sumar
              </span>
            </div>

            {/* Product Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
              {recipes.map(rec => {
                const price = isWholesale && rec.prices?.mayor ? rec.prices.mayor : (rec.prices?.optimo || 5.0);
                const countInCart = cart.find(c => c.recipeId === rec.id)?.qty || 0;

                return (
                  <div
                    key={rec.id}
                    onClick={() => handleAddToCart(rec.id)}
                    className="card"
                    style={{
                      padding: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: countInCart > 0 ? '2px solid var(--clr-gold-500)' : '1px solid var(--clr-border-strong)',
                      boxShadow: countInCart > 0 ? '0 4px 16px rgba(223, 152, 50, 0.2)' : 'var(--shadow-sm)',
                      position: 'relative'
                    }}
                  >
                    {countInCart > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        background: 'var(--clr-gold-500)',
                        color: '#FFFFFF',
                        borderRadius: '9999px',
                        width: 22,
                        height: 22,
                        fontSize: 12,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {countInCart}
                      </span>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 24 }}>🍦</span>
                      <strong style={{ fontSize: 14, color: 'var(--clr-text-primary)', lineHeight: 1.2 }}>
                        {rec.name}
                      </strong>
                      <span style={{ fontSize: 11, color: 'var(--clr-text-secondary)' }}>
                        Rendimiento: {rec.batchWeightG}g
                      </span>
                    </div>

                    <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px dashed var(--clr-border)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span className="font-mono font-bold" style={{ fontSize: 18, color: 'var(--clr-gold-600)' }}>
                        ${price.toFixed(2)}
                      </span>
                      <span className="font-mono" style={{ fontSize: 11, color: 'var(--clr-text-muted)' }}>
                        Bs. {(price * settings.bcvRate).toFixed(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Right: Checkout Ticket & Payment Panel */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', background: '#FFFFFF', border: '2px solid var(--clr-border-strong)' }}>
            
            <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--clr-border)', paddingBottom: 10 }}>
              <div className="flex items-center gap-2">
                <Receipt size={18} color="var(--clr-gold-500)" />
                <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--clr-text-primary)' }}>
                  Ticket de Venta Actual
                </h2>
              </div>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="btn-ghost" style={{ fontSize: 12, color: 'var(--clr-danger)' }}>
                  Vaciar
                </button>
              )}
            </div>

            {/* Customer & Exit Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>Cliente</label>
                <select
                  className="input"
                  value={selectedCustomerId}
                  onChange={e => {
                    const v = e.target.value;
                    setSelectedCustomerId(v === 'MOSTRADOR' ? 'MOSTRADOR' : Number(v));
                  }}
                  style={{ fontSize: 12, padding: '8px 10px' }}
                >
                  <option value="MOSTRADOR">Cliente Mostrador</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.fullName} ({c.cedulaRif})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>Tipo de Salida</label>
                <select
                  className="input"
                  value={exitType}
                  onChange={e => setExitType(e.target.value as ExitType)}
                  style={{ fontSize: 12, padding: '8px 10px' }}
                >
                  <option value="VENTA">Venta (Contado)</option>
                  <option value="CREDITO">Venta a Crédito</option>
                  <option value="REGALO">Regalo / Degustación</option>
                  <option value="COMIDO">Consumo Personal</option>
                  <option value="PERDIDO">Merma / Desecho</option>
                </select>
              </div>
            </div>

            {/* Items List in Ticket */}
            <div style={{
              background: '#FAF6EE',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minHeight: 180,
              maxHeight: 280,
              overflowY: 'auto',
              border: '1px solid #ECE2D2'
            }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--clr-text-muted)', margin: 'auto' }}>
                  <ShoppingBag size={28} style={{ opacity: 0.3, margin: '0 auto 6px' }} />
                  <p style={{ fontSize: 12 }}>El ticket está vacío.<br />Toca los productos de la izquierda para cobrar.</p>
                </div>
              ) : (
                cart.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between" style={{ borderBottom: '1px dashed #E2D6C5', paddingBottom: 6 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--clr-text-primary)' }}>{it.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--clr-text-muted)' }}>${it.unitPrice.toFixed(2)} c/u</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1" style={{ background: '#FFFFFF', borderRadius: 6, border: '1px solid #DDD0BF', padding: '1px 4px' }}>
                        <button type="button" onClick={() => handleUpdateQty(idx, -1)} className="btn-ghost" style={{ padding: '0 4px', fontSize: 13, fontWeight: 800 }}>-</button>
                        <span className="font-mono font-bold" style={{ fontSize: 12, minWidth: 18, textAlign: 'center' }}>{it.qty}</span>
                        <button type="button" onClick={() => handleUpdateQty(idx, 1)} className="btn-ghost" style={{ padding: '0 4px', fontSize: 13, fontWeight: 800 }}>+</button>
                      </div>
                      <span className="font-mono font-bold" style={{ fontSize: 13, minWidth: 60, textAlign: 'right' }}>
                        ${(it.qty * it.unitPrice).toFixed(2)}
                      </span>
                      <button type="button" onClick={() => handleRemoveFromCart(idx)} className="btn-ghost" style={{ color: 'var(--clr-danger)', padding: 2 }}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total Display */}
            <div style={{
              background: '#FFF8EE',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              border: '1px solid #F0DFCC',
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--clr-text-primary)' }}>TOTAL A PAGAR:</span>
                <span className="font-mono font-bold" style={{ fontSize: 28, color: 'var(--clr-gold-600)' }}>
                  ${cartTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between" style={{ fontSize: 13, color: 'var(--clr-text-secondary)' }}>
                <span>Equivalente Bolívares (BCV):</span>
                <span className="font-mono font-bold">Bs. {(cartTotal * settings.bcvRate).toFixed(2)}</span>
              </div>
            </div>

            {/* Payment & Notes */}
            {exitType === 'VENTA' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>Monto Pagado ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="input font-mono font-bold"
                    placeholder={`$${cartTotal.toFixed(2)}`}
                    value={paidAmount}
                    onChange={e => setPaidAmount(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>Nota / Referencia</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Pago móvil, efectivo..."
                    value={invoiceNotes}
                    onChange={e => setInvoiceNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmitInvoice}
              disabled={cart.length === 0}
              className="btn btn-caramel"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: 15,
                fontWeight: 800,
                boxShadow: '0 4px 16px rgba(223, 152, 50, 0.35)',
                cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                opacity: cart.length === 0 ? 0.6 : 1
              }}
            >
              <span>Confirmar Venta & Descontar Inventario</span>
              <ArrowRight size={16} />
            </button>

          </div>

        </div>
      )}

      {/* HISTORY AUDIT VIEW */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          
          {/* Filter Bar */}
          <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 260 }}>
              <Search size={16} color="var(--clr-text-muted)" />
              <input
                type="text"
                className="input"
                placeholder="Buscar por serial (DA-2026-...) o cliente..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterType('ALL')}
                className={`btn ${filterType === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                Todas ({invoices.length})
              </button>
              <button
                onClick={() => setFilterType('VENTA')}
                className={`btn ${filterType === 'VENTA' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                Ventas
              </button>
              <button
                onClick={() => setFilterType('REGALO')}
                className={`btn ${filterType === 'REGALO' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                Regalos
              </button>
              <button
                onClick={() => setFilterType('PERDIDO')}
                className={`btn ${filterType === 'PERDIDO' ? 'btn-danger' : 'btn-secondary'}`}
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                Mermas
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>SERIAL</th>
                  <th>FECHA & HORA</th>
                  <th>CLIENTE / DESTINO</th>
                  <th>TIPO</th>
                  <th>TOTAL ($)</th>
                  <th>TOTAL (Bs.)</th>
                  <th>ESTADO</th>
                  <th style={{ textAlign: 'right' }}>COMPROBANTE</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => (
                  <tr key={inv.id}>
                    <td><strong className="font-mono">{inv.serialCode}</strong></td>
                    <td style={{ fontSize: 12 }}>{new Date(inv.createdAt).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td><strong>{inv.customerSnap}</strong></td>
                    <td><span className="badge badge-gold" style={{ fontSize: 10 }}>{inv.exitType}</span></td>
                    <td className="font-mono font-bold">${inv.total.toFixed(2)}</td>
                    <td className="font-mono" style={{ fontSize: 12, color: 'var(--clr-text-secondary)' }}>Bs. {(inv.total * settings.bcvRate).toFixed(2)}</td>
                    <td>
                      {inv.paid >= inv.total ? (
                        <span className="badge badge-mint flex items-center gap-1" style={{ fontSize: 10 }}><CheckCircle2 size={10} /> Pagado</span>
                      ) : (
                        <span className="badge badge-red flex items-center gap-1" style={{ fontSize: 10 }}><AlertTriangle size={10} /> Deuda</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => setViewingInvoice(inv)} className="btn-ghost" title="Ver Recibo" style={{ padding: 6 }}>
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* VIEW RECEIPT MODAL */}
      {viewingInvoice && (
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
          <div className="card animate-fadeIn" style={{ maxWidth: 500, width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed var(--clr-border)', paddingBottom: 10 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--clr-text-primary)' }}>{settings.businessName}</h2>
              <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', margin: 0 }}>RIF: {settings.rif} · {settings.city}, {settings.state}</p>
              <span className="font-mono font-bold" style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
                COMPROBANTE: {viewingInvoice.serialCode}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--clr-text-muted)' }}>Cliente:</span>
                <strong>{viewingInvoice.customerSnap}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--clr-text-muted)' }}>Fecha:</span>
                <span>{new Date(viewingInvoice.createdAt).toLocaleString('es-VE')}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--clr-border)', borderBottom: '1px solid var(--clr-border)', padding: '8px 0' }}>
              <table style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: 'var(--clr-text-muted)', textAlign: 'left' }}>
                    <th>Ítem</th>
                    <th style={{ textAlign: 'center' }}>Cant</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingInvoice.items?.map(it => (
                    <tr key={it.id}>
                      <td>{it.recipeNameSnap}</td>
                      <td style={{ textAlign: 'center' }}>{it.qty}</td>
                      <td style={{ textAlign: 'right' }} className="font-mono font-bold">${(it.qty * it.unitPriceCharged).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between" style={{ fontSize: 16 }}>
              <strong>TOTAL:</strong>
              <span className="font-mono font-bold" style={{ fontSize: 22, color: 'var(--clr-gold-600)' }}>
                ${viewingInvoice.total.toFixed(2)} (Bs. {(viewingInvoice.total * settings.bcvRate).toFixed(2)})
              </span>
            </div>

            <div className="flex items-center justify-end gap-3" style={{ paddingTop: 8 }}>
              <button onClick={() => setViewingInvoice(null)} className="btn btn-secondary">Cerrar</button>
              <button onClick={() => window.print()} className="btn btn-primary"><Printer size={15} /> Imprimir</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
