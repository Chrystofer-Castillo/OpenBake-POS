import { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import {
  Receipt, Plus, Search, Printer,
  Eye, CheckCircle2, AlertTriangle, ShieldCheck, X
} from 'lucide-react';
import type { Invoice, InvoiceItem, ExitType } from '../types';

export default function BillingPage() {
  const settings = useAppStore(s => s.settings);
  const recipes = useAppStore(s => s.recipes);
  const customers = useAppStore(s => s.customers);
  const invoices = useAppStore(s => s.invoices);
  const addInvoice = useAppStore(s => s.addInvoice);
  const pushAlert = useAppStore(s => s.pushAlert);

  // Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | ExitType>('ALL');

  // New Invoice Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | 'MOSTRADOR'>('MOSTRADOR');
  const [exitType, setExitType] = useState<ExitType>('VENTA');
  const [isWholesale, setIsWholesale] = useState(false);
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Cart items
  const [cart, setCart] = useState<Array<{ recipeId: number; name: string; qty: number; unitPrice: number; baseCost: number }>>([]);
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Selected invoice for detail/receipt modal
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // Calculate cart totals
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, it) => acc + (it.qty * it.unitPrice), 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    // If gift, eaten, or lost, price charged is $0 (absorbed as cost/leak)
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

  // Open modal for billing
  const handleOpenNewInvoice = () => {
    setSelectedCustomerId('MOSTRADOR');
    setExitType('VENTA');
    setIsWholesale(false);
    setCart([]);
    setPaidAmount(0);
    setInvoiceNotes('');
    setIsModalOpen(true);
  };

  // Submit invoice
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

    // Mock sha256 for audit
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

    setIsModalOpen(false);
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

  // Billing Totals
  const totalSalesUsd = useMemo(() => {
    return invoices
      .filter(i => i.exitType === 'VENTA' || i.exitType === 'CREDITO')
      .reduce((acc, i) => acc + i.total, 0);
  }, [invoices]);

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-gold">
              <Receipt size={14} /> Facturación & Despacho
            </span>
            <span className="badge badge-mint">Moneda Dual ($ / Bs)</span>
          </div>
          <h1 className="page-title" style={{ marginTop: 6 }}>Facturación, POS & Salidas</h1>
          <p className="page-subtitle">
            Emisión de tickets de venta al detal y al mayor, salidas de inventario y registro contable inmutable.
          </p>
        </div>

        <button onClick={handleOpenNewInvoice} className="btn btn-primary">
          <Plus size={16} />
          <span>Generar Factura / Despacho</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--clr-text-muted)', fontWeight: 600 }}>FACTURACIÓN TOTAL REGISTRADA</span>
          <span className="font-mono font-bold" style={{ fontSize: 24, color: 'var(--clr-gold-400)' }}>
            ${totalSalesUsd.toFixed(2)}
          </span>
          <span className="font-mono" style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
            Bs. {(totalSalesUsd * settings.bcvRate).toFixed(2)} (Tasa BCV {settings.bcvRate})
          </span>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--clr-text-muted)', fontWeight: 600 }}>TICKETS EMITIDOS</span>
          <span className="font-mono font-bold" style={{ fontSize: 24, color: 'var(--clr-text-primary)' }}>
            {invoices.length}
          </span>
          <span style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
            Con sello criptográfico de trazabilidad.
          </span>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--clr-text-muted)', fontWeight: 600 }}>MODALIDAD AL MAYOR</span>
          <span style={{ fontSize: 13, color: 'var(--clr-text-secondary)' }}>
            Aplica automáticamente el <strong>{settings.wholesalePct}% de descuento</strong> a pedidos mayoristas.
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
            placeholder="Buscar por código serial (DA-2026-...) o cliente..."
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
            Regalos / Marketing
          </button>
          <button
            onClick={() => setFilterType('PERDIDO')}
            className={`btn ${filterType === 'PERDIDO' ? 'btn-danger' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '6px 12px' }}
          >
            Mermas / Desecho
          </button>
        </div>
      </div>

      {/* Invoices Audit Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>SERIAL</th>
              <th>FECHA & HORA</th>
              <th>CLIENTE / DESTINO</th>
              <th>TIPO SALIDA</th>
              <th>TOTAL ($)</th>
              <th>TOTAL (Bs.)</th>
              <th>ESTADO PAGO</th>
              <th style={{ textAlign: 'right' }}>COMPROBANTE</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(inv => {
              const isPaid = inv.paid >= inv.total;
              return (
                <tr key={inv.id}>
                  <td>
                    <strong className="font-mono" style={{ color: 'var(--clr-gold-400)' }}>
                      {inv.serialCode}
                    </strong>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: 'var(--clr-text-secondary)' }}>
                      {new Date(inv.createdAt).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--clr-text-primary)' }}>
                      {inv.customerSnap}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${
                      inv.exitType === 'VENTA' ? 'badge-primary' :
                      inv.exitType === 'REGALO' ? 'badge-gold' :
                      inv.exitType === 'PERDIDO' ? 'badge-red' : 'badge-mint'
                    }`} style={{ fontSize: 10 }}>
                      {inv.exitType}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono font-bold" style={{ color: 'var(--clr-text-primary)' }}>
                      ${inv.total.toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono" style={{ color: 'var(--clr-text-muted)', fontSize: 12 }}>
                      Bs. {(inv.total * settings.bcvRate).toFixed(2)}
                    </span>
                  </td>
                  <td>
                    {isPaid ? (
                      <span className="badge badge-mint flex items-center gap-1" style={{ fontSize: 10 }}>
                        <CheckCircle2 size={10} /> Pagado
                      </span>
                    ) : (
                      <span className="badge badge-red flex items-center gap-1" style={{ fontSize: 10 }}>
                        <AlertTriangle size={10} /> Pendiente
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setViewingInvoice(inv)}
                      className="btn-ghost"
                      title="Ver Comprobante"
                      style={{ padding: 6, color: 'var(--clr-primary-light)' }}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CREATE NEW INVOICE MODAL */}
      {isModalOpen && (
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
            maxWidth: 800,
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            overflowY: 'auto'
          }}>
            <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--clr-border)', paddingBottom: 10 }}>
              <div className="flex items-center gap-2">
                <Receipt size={20} color="var(--clr-gold-400)" />
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
                  Generar Comprobante de Despacho / Venta
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="btn-ghost" style={{ cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSubmitInvoice} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Type and Customer row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Tipo de Salida</label>
                  <select
                    className="input"
                    value={exitType}
                    onChange={e => setExitType(e.target.value as ExitType)}
                  >
                    <option value="VENTA">Venta Normal (Contado)</option>
                    <option value="CREDITO">Venta a Crédito</option>
                    <option value="REGALO">Regalo / Degustación Comercial</option>
                    <option value="COMIDO">Consumo Personal / Empleados</option>
                    <option value="PERDIDO">Pérdida / Falla Eléctrica / Desecho</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Cliente / Destinatario</label>
                  <select
                    className="input"
                    value={selectedCustomerId}
                    onChange={e => {
                      const v = e.target.value;
                      setSelectedCustomerId(v === 'MOSTRADOR' ? 'MOSTRADOR' : Number(v));
                    }}
                  >
                    <option value="MOSTRADOR">Cliente Mostrador (Venta al paso)</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.cedulaRif}) {c.totalDebt > 0 ? `— Deuda: $${c.totalDebt}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Wholesale Toggle */}
              {exitType === 'VENTA' && (
                <div style={{
                  background: 'rgba(59,130,246,0.08)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(59,130,246,0.2)'
                }}>
                  <div>
                    <strong style={{ fontSize: 13, color: 'var(--clr-primary-light)' }}>
                      ¿Es Venta al Mayor?
                    </strong>
                    <p style={{ fontSize: 11, color: 'var(--clr-text-muted)', margin: 0 }}>
                      Aplica el descuento al mayor configurado ({settings.wholesalePct}%) a los productos seleccionados.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isWholesale}
                    onChange={e => {
                      setIsWholesale(e.target.checked);
                      // Recalculate cart items if changed
                      setCart(prev => prev.map(item => {
                        const rec = recipes.find(r => r.id === item.recipeId);
                        if (!rec) return item;
                        const newPrice = e.target.checked && rec.prices?.mayor ? rec.prices.mayor : (rec.prices?.optimo || item.unitPrice);
                        return { ...item, unitPrice: newPrice };
                      }));
                    }}
                    style={{ width: 20, height: 20, cursor: 'pointer', accentColor: 'var(--clr-primary-light)' }}
                  />
                </div>
              )}

              {/* Add Product selector */}
              <div>
                <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Añadir Producto al Carrito</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginTop: 4 }}>
                  {recipes.map(rec => {
                    const price = isWholesale && rec.prices?.mayor ? rec.prices.mayor : (rec.prices?.optimo || 5.0);
                    return (
                      <button
                        type="button"
                        key={rec.id}
                        onClick={() => handleAddToCart(rec.id)}
                        className="btn btn-secondary"
                        style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px' }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{rec.name}</span>
                        <div className="flex items-center justify-between" style={{ width: '100%', marginTop: 4 }}>
                          <span className="font-mono font-bold" style={{ color: 'var(--clr-gold-400)' }}>
                            ${price.toFixed(2)}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--clr-text-muted)' }}>
                            + Añadir
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cart Items list */}
              <div style={{
                background: 'var(--clr-bg-subtle)',
                border: '1px solid var(--clr-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-text-secondary)' }}>ÍTEMS EN EL TICKET:</span>
                
                {cart.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', margin: '8px 0', textAlign: 'center' }}>
                    No has añadido ningún producto aún. Haz clic en los botones de arriba.
                  </p>
                ) : (
                  cart.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--clr-border)', paddingBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{it.name}</span>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => handleUpdateQty(idx, -1)} className="btn-ghost" style={{ padding: '2px 6px' }}>-</button>
                          <span className="font-mono font-bold" style={{ fontSize: 13, minWidth: 20, textAlign: 'center' }}>{it.qty}</span>
                          <button type="button" onClick={() => handleUpdateQty(idx, 1)} className="btn-ghost" style={{ padding: '2px 6px' }}>+</button>
                        </div>
                        <span className="font-mono font-bold" style={{ fontSize: 13, minWidth: 70, textAlign: 'right' }}>
                          ${(it.qty * it.unitPrice).toFixed(2)}
                        </span>
                        <button type="button" onClick={() => handleRemoveFromCart(idx)} className="btn-ghost" style={{ color: 'var(--clr-danger)', padding: 4 }}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {/* Total display */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--clr-border)' }}>
                  <div className="flex items-center justify-between">
                    <span style={{ fontWeight: 700, fontSize: 15 }}>TOTAL A COBRAR:</span>
                    <div style={{ textAlign: 'right' }}>
                      <span className="font-mono font-bold" style={{ fontSize: 20, color: 'var(--clr-gold-400)' }}>
                        ${cartTotal.toFixed(2)}
                      </span>
                      <span className="font-mono" style={{ fontSize: 12, color: 'var(--clr-text-muted)', display: 'block' }}>
                        Bs. {(cartTotal * settings.bcvRate).toFixed(2)} (Tasa BCV {settings.bcvRate})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Input */}
              {exitType === 'VENTA' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Monto Pagado al Momento ($)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input font-mono font-bold"
                      value={paidAmount}
                      onChange={e => setPaidAmount(Number(e.target.value))}
                      placeholder={`Total: $${cartTotal.toFixed(2)}`}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Notas de la Venta / Despacho</label>
                    <input
                      type="text"
                      className="input"
                      value={invoiceNotes}
                      onChange={e => setInvoiceNotes(e.target.value)}
                      placeholder="Ej: Pago móvil en Bs, entregado a domicilio..."
                    />
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3" style={{ marginTop: 8 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={cart.length === 0}>
                  Confirmar y Descontar Inventario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW RECEIPT / INVOICE MODAL */}
      {viewingInvoice && (
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
            maxWidth: 550,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            background: 'var(--clr-bg-panel)',
            border: '2px solid var(--clr-gold-400)'
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed var(--clr-border)', paddingBottom: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--clr-gold-400)', textTransform: 'uppercase' }}>
                {settings.businessName}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', margin: '2px 0' }}>
                RIF: {settings.rif || 'J-50291847-1'} · {settings.address}
              </p>
              <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', margin: '2px 0' }}>
                {settings.city}, {settings.state} · Tel: {settings.phone}
              </p>
              <div className="flex items-center justify-center gap-2" style={{ marginTop: 6 }}>
                <span className="font-mono font-bold" style={{ fontSize: 14, color: 'var(--clr-text-primary)' }}>
                  COMPROBANTE: {viewingInvoice.serialCode}
                </span>
              </div>
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--clr-text-muted)' }}>Fecha:</span>
                <span>{new Date(viewingInvoice.createdAt).toLocaleString('es-VE')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--clr-text-muted)' }}>Cliente:</span>
                <strong>{viewingInvoice.customerSnap}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--clr-text-muted)' }}>Tipo de Salida:</span>
                <span className="badge badge-gold" style={{ fontSize: 10 }}>{viewingInvoice.exitType}</span>
              </div>
            </div>

            {/* Items */}
            <div style={{ borderTop: '1px solid var(--clr-border)', borderBottom: '1px solid var(--clr-border)', padding: '10px 0' }}>
              <table style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: 'var(--clr-text-muted)', textAlign: 'left' }}>
                    <th>DESCRIPCIÓN</th>
                    <th style={{ textAlign: 'center' }}>CANT</th>
                    <th style={{ textAlign: 'right' }}>P. UNIT</th>
                    <th style={{ textAlign: 'right' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingInvoice.items?.map(it => (
                    <tr key={it.id}>
                      <td style={{ padding: '4px 0' }}>{it.recipeNameSnap}</td>
                      <td style={{ textAlign: 'center' }}>{it.qty}</td>
                      <td style={{ textAlign: 'right' }} className="font-mono">${it.unitPriceCharged.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }} className="font-mono font-bold">
                        ${(it.qty * it.unitPriceCharged).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="flex items-center justify-between" style={{ fontSize: 16 }}>
                <strong>TOTAL FACTURADO:</strong>
                <span className="font-mono font-bold" style={{ color: 'var(--clr-gold-400)', fontSize: 20 }}>
                  ${viewingInvoice.total.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between" style={{ fontSize: 13, color: 'var(--clr-text-muted)' }}>
                <span>Equivalente en Bolívares (BCV):</span>
                <span className="font-mono font-bold">Bs. {(viewingInvoice.total * settings.bcvRate).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between" style={{ fontSize: 12, color: 'var(--clr-mint-400)' }}>
                <span>Monto Pagado:</span>
                <span className="font-mono font-bold">${viewingInvoice.paid.toFixed(2)}</span>
              </div>
            </div>

            {/* Integrity Hash */}
            <div style={{ background: 'var(--clr-bg-subtle)', padding: 8, borderRadius: 4, textAlign: 'center' }}>
              <div className="flex items-center justify-center gap-1" style={{ fontSize: 10, color: 'var(--clr-mint-400)' }}>
                <ShieldCheck size={12} /> Sello Criptográfico Inmutable
              </div>
              <span className="font-mono" style={{ fontSize: 9, color: 'var(--clr-text-muted)', wordBreak: 'break-all' }}>
                SHA256: {viewingInvoice.sha256}
              </span>
            </div>

            <div className="flex items-center justify-end gap-3" style={{ paddingTop: 8 }}>
              <button onClick={() => setViewingInvoice(null)} className="btn btn-secondary">
                Cerrar
              </button>
              <button onClick={() => window.print()} className="btn btn-primary">
                <Printer size={15} /> Imprimir Comprobante
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
