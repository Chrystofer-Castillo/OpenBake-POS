import { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import {
  Users, Plus, Search, MessageSquare, DollarSign,
  AlertCircle, CheckCircle, Edit3, Clock, AlertTriangle
} from 'lucide-react';
import type { Customer, PriceMode } from '../types';

export default function CustomersPage() {
  const settings = useAppStore(s => s.settings);
  const customers = useAppStore(s => s.customers);
  const addCustomer = useAppStore(s => s.addCustomer);
  const updateCustomer = useAppStore(s => s.updateCustomer);
  const pushAlert = useAppStore(s => s.pushAlert);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterSolvency, setFilterSolvency] = useState<'ALL' | 'DEBT' | 'OK'>('ALL');

  // Customer modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form fields
  const [cedulaRif, setCedulaRif] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneWa, setPhoneWa] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [defaultPriceMode, setDefaultPriceMode] = useState<PriceMode>('DYNAMIC');
  const [paymentDueDate, setPaymentDueDate] = useState('');

  // Payment Abono Modal
  const [abonoModalOpen, setAbonoModalOpen] = useState(false);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [abonoAmount, setAbonoAmount] = useState<number>(0);

  // WhatsApp Message Helper
  const sendWhatsAppReminder = (c: Customer) => {
    if (!c.phoneWa) {
      pushAlert({ type: 'warn', message: 'El cliente no tiene teléfono de WhatsApp registrado' });
      return;
    }

    const cleanPhone = c.phoneWa.replace(/[^\d]/g, '');
    const dueDateStr = c.paymentDueDate
      ? new Date(c.paymentDueDate).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'lo antes posible';
    let msg = settings.waTemplate
      .replace('{nombreCliente}', c.fullName)
      .replace('{nombreNegocio}', settings.businessName)
      .replace('{saldoPendiente}', `$${c.totalDebt.toFixed(2)} (Bs. ${(c.totalDebt * settings.bcvRate).toFixed(2)})`)
      .replace('{fechaLimite}', dueDateStr);

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // MODULE 2 FIX: Search also matches phone/WhatsApp numbers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const term = searchTerm.toLowerCase();
      const match = c.fullName.toLowerCase().includes(term) ||
                    c.cedulaRif.toLowerCase().includes(term) ||
                    (c.phoneWa && c.phoneWa.replace(/[\s\-\+]/g, '').includes(searchTerm.replace(/[\s\-\+]/g, '')));
      if (!match) return false;
      if (filterSolvency === 'DEBT') return c.totalDebt > 0;
      if (filterSolvency === 'OK') return c.totalDebt <= 0;
      return true;
    });
  }, [customers, searchTerm, filterSolvency]);

  // KPI calculations
  const totalReceivable = useMemo(() => {
    return customers.reduce((acc, c) => acc + c.totalDebt, 0);
  }, [customers]);

  const debtCustomersCount = useMemo(() => {
    return customers.filter(c => c.totalDebt > 0).length;
  }, [customers]);

  // Due date helpers
  const getDueDateStatus = (c: Customer) => {
    if (!c.paymentDueDate || c.totalDebt <= 0) return null;
    const now = new Date();
    const due = new Date(c.paymentDueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'soon';
    return 'ok';
  };

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setCedulaRif('V-');
    setFullName('');
    setPhoneWa('+58 ');
    setAddress('');
    setNotes('');
    setDefaultPriceMode('DYNAMIC');
    setPaymentDueDate('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingId(c.id);
    setCedulaRif(c.cedulaRif);
    setFullName(c.fullName);
    setPhoneWa(c.phoneWa || '');
    setAddress(c.address || '');
    setNotes(c.notes || '');
    setDefaultPriceMode(c.defaultPriceMode);
    setPaymentDueDate(c.paymentDueDate ? c.paymentDueDate.slice(0, 10) : '');
    setIsModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !cedulaRif.trim()) return;

    const data = {
      cedulaRif,
      fullName,
      phoneWa,
      address,
      notes,
      defaultPriceMode,
      paymentDueDate: paymentDueDate ? new Date(paymentDueDate).toISOString() : null,
    };

    if (editingId) {
      updateCustomer(editingId, data);
    } else {
      addCustomer(data);
    }

    setIsModalOpen(false);
  };

  const handleApplyAbono = () => {
    if (!selectedCust || abonoAmount <= 0) return;
    const newDebt = Math.max(0, selectedCust.totalDebt - abonoAmount);
    updateCustomer(selectedCust.id, {
      totalDebt: newDebt,
      paymentDueDate: newDebt <= 0 ? null : selectedCust.paymentDueDate,
    });
    pushAlert({
      type: 'success',
      message: `Abono de $${abonoAmount.toFixed(2)} registrado para ${selectedCust.fullName}`
    });
    setAbonoModalOpen(false);
  };

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-primary">
              <Users size={14} /> CRM & Directorio
            </span>
            <span className="badge badge-gold">Cuenta Corriente</span>
          </div>
          <h1 className="page-title" style={{ marginTop: 6 }}>Clientes & Cuentas por Cobrar</h1>
          <p className="page-subtitle">
            Gestión de clientes, historial de solvencia y recordatorios de cobranza por WhatsApp en 1-click.
          </p>
        </div>

        <button onClick={handleOpenNew} className="btn btn-primary">
          <Plus size={16} />
          <span>Registrar Nuevo Cliente</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--clr-text-muted)', fontWeight: 600 }}>TOTAL CUENTAS POR COBRAR</span>
          <span className="font-mono font-bold" style={{ fontSize: 24, color: 'var(--clr-rose-400)' }}>
            ${totalReceivable.toFixed(2)}
          </span>
          <span className="font-mono" style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
            Bs. {(totalReceivable * settings.bcvRate).toFixed(2)} (Tasa BCV {settings.bcvRate})
          </span>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--clr-text-muted)', fontWeight: 600 }}>CLIENTES CON SALDO PENDIENTE</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold" style={{ fontSize: 24, color: debtCustomersCount > 0 ? 'var(--clr-warning)' : 'var(--clr-mint-400)' }}>
              {debtCustomersCount}
            </span>
            <span style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
              de {customers.length} registrados
            </span>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--clr-text-muted)', fontWeight: 600 }}>RECORDATORIO WHATSAPP</span>
          <span style={{ fontSize: 13, color: 'var(--clr-text-secondary)' }}>
            Plantilla activa con montos bimonetarios automáticos.
          </span>
        </div>
      </div>

      {/* Search and Filters — MODULE 2 FIX: placeholder updated */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 260 }}>
          <Search size={16} color="var(--clr-text-muted)" />
          <input
            type="text"
            className="input"
            placeholder="Buscar por nombre, cédula/RIF o teléfono..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterSolvency('ALL')}
            className={`btn ${filterSolvency === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '6px 12px' }}
          >
            Todos ({customers.length})
          </button>
          <button
            onClick={() => setFilterSolvency('DEBT')}
            className={`btn ${filterSolvency === 'DEBT' ? 'btn-danger' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '6px 12px' }}
          >
            Con Saldo Pendiente ({debtCustomersCount})
          </button>
          <button
            onClick={() => setFilterSolvency('OK')}
            className={`btn ${filterSolvency === 'OK' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '6px 12px' }}
          >
            Solventes
          </button>
        </div>
      </div>

      {/* Customers Table — MODULE 3: Added due date column */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>ESTADO</th>
              <th>CÉDULA / RIF</th>
              <th>NOMBRE / RAZÓN SOCIAL</th>
              <th>TELÉFONO / WHATSAPP</th>
              <th>DIRECCIÓN / ZONA</th>
              <th>DEUDA PENDIENTE ($)</th>
              <th>FECHA LÍMITE</th>
              <th style={{ textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map(cust => {
              const dueStatus = getDueDateStatus(cust);
              return (
              <tr key={cust.id}>
                <td>
                  {cust.totalDebt > 0 ? (
                    dueStatus === 'overdue' ? (
                      <span className="badge badge-red flex items-center gap-1" style={{ fontSize: 10 }}>
                        <AlertTriangle size={10} /> Vencido
                      </span>
                    ) : (
                      <span className="badge badge-red flex items-center gap-1" style={{ fontSize: 10 }}>
                        <AlertCircle size={10} /> Deuda
                      </span>
                    )
                  ) : (
                    <span className="badge badge-mint flex items-center gap-1" style={{ fontSize: 10 }}>
                      <CheckCircle size={10} /> Solvente
                    </span>
                  )}
                </td>
                <td>
                  <strong className="font-mono">{cust.cedulaRif}</strong>
                </td>
                <td>
                  <span style={{ fontWeight: 600, color: 'var(--clr-text-primary)' }}>{cust.fullName}</span>
                  {cust.notes && (
                    <p style={{ fontSize: 11, color: 'var(--clr-text-muted)', margin: 0 }}>{cust.notes}</p>
                  )}
                </td>
                <td>
                  <span className="font-mono" style={{ fontSize: 12 }}>{cust.phoneWa || 'Sin teléfono'}</span>
                </td>
                <td>
                  <span style={{ fontSize: 12, color: 'var(--clr-text-secondary)' }}>{cust.address || '—'}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="font-mono font-bold" style={{
                      color: cust.totalDebt > 0 ? 'var(--clr-rose-400)' : 'var(--clr-mint-400)'
                    }}>
                      ${cust.totalDebt.toFixed(2)}
                    </span>
                    {cust.totalDebt > 0 && (
                      <span className="font-mono" style={{ fontSize: 10, color: 'var(--clr-text-muted)' }}>
                        Bs. {(cust.totalDebt * settings.bcvRate).toFixed(2)}
                      </span>
                    )}
                  </div>
                </td>
                {/* MODULE 3: Due Date column */}
                <td>
                  {cust.totalDebt > 0 && cust.paymentDueDate ? (
                    <div className="flex items-center gap-1" style={{
                      color: dueStatus === 'overdue' ? 'var(--clr-danger)'
                           : dueStatus === 'soon' ? 'var(--clr-warning)'
                           : 'var(--clr-text-secondary)',
                      fontSize: 12,
                      fontWeight: dueStatus === 'overdue' ? 700 : 500
                    }}>
                      <Clock size={12} />
                      <span>{formatDueDate(cust.paymentDueDate)}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>—</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="flex items-center justify-end gap-1">
                    {cust.totalDebt > 0 && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedCust(cust);
                            setAbonoAmount(cust.totalDebt);
                            setAbonoModalOpen(true);
                          }}
                          className="btn-ghost"
                          title="Registrar Abono"
                          style={{ padding: 6, color: 'var(--clr-mint-400)' }}
                        >
                          <DollarSign size={16} />
                        </button>
                        <button
                          onClick={() => sendWhatsAppReminder(cust)}
                          className="btn-ghost"
                          title="Enviar Recordatorio por WhatsApp"
                          style={{ padding: 6, color: 'var(--clr-mint-400)' }}
                        >
                          <MessageSquare size={16} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleOpenEdit(cust)}
                      className="btn-ghost"
                      title="Editar Datos"
                      style={{ padding: 6, color: 'var(--clr-gold-400)' }}
                    >
                      <Edit3 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT CUSTOMER MODAL — MODULE 4 FIX: uses .modal-overlay class */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal-content animate-fadeIn" style={{ maxWidth: 520, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
              {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>

            <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Cédula / RIF</label>
                  <input
                    type="text"
                    required
                    className="input font-mono"
                    placeholder="V-12345678"
                    value={cedulaRif}
                    onChange={e => setCedulaRif(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Nombre Completo / Razón Social</label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="Ej: Inversiones El Muelle C.A."
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Teléfono / WhatsApp</label>
                <input
                  type="text"
                  className="input font-mono"
                  placeholder="+58 424-1234567"
                  value={phoneWa}
                  onChange={e => setPhoneWa(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Dirección / Sector</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Sector Miraflores, Calle 4"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Notas o Preferencias</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Gustos del cliente, condiciones de pago..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ resize: 'none' }}
                />
              </div>

              {/* MODULE 3: Payment Due Date Field */}
              <div>
                <label style={{ fontSize: 12, color: 'var(--clr-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={12} /> Fecha Límite de Pago
                </label>
                <input
                  type="date"
                  className="input font-mono"
                  value={paymentDueDate}
                  onChange={e => setPaymentDueDate(e.target.value)}
                />
                <span style={{ fontSize: 10, color: 'var(--clr-text-muted)', marginTop: 2, display: 'block' }}>
                  Opcional. Se usa para recordatorios de cobranza automáticos por WhatsApp.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3" style={{ marginTop: 12 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Guardar Cambios' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ABONO MODAL — MODULE 4 FIX: uses .modal-overlay class */}
      {abonoModalOpen && selectedCust && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setAbonoModalOpen(false); }}>
          <div className="modal-content animate-fadeIn" style={{ maxWidth: 420, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
              Registrar Abono a Cuenta Corriente
            </h2>
            <p style={{ fontSize: 13, color: 'var(--clr-text-secondary)', margin: 0 }}>
              Cliente: <strong>{selectedCust.fullName}</strong><br />
              Deuda pendiente: <span className="font-mono font-bold" style={{ color: 'var(--clr-rose-400)' }}>${selectedCust.totalDebt.toFixed(2)}</span>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Monto a Abonar ($)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  max={selectedCust.totalDebt}
                  className="input font-mono font-bold"
                  style={{ fontSize: 18 }}
                  value={abonoAmount}
                  onChange={e => setAbonoAmount(Number(e.target.value))}
                />
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--clr-text-muted)', marginTop: 4, display: 'block' }}>
                  Equivalente en Bolívares: Bs. {(abonoAmount * settings.bcvRate).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3" style={{ marginTop: 8 }}>
                <button type="button" onClick={() => setAbonoModalOpen(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="button" onClick={handleApplyAbono} className="btn btn-primary">
                  Confirmar Abono
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
