import { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import {
  Users, Plus, Search, MessageSquare, DollarSign,
  AlertCircle, CheckCircle, Edit3
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
    let msg = settings.waTemplate
      .replace('{nombreCliente}', c.fullName)
      .replace('{nombreNegocio}', settings.businessName)
      .replace('{saldoPendiente}', `$${c.totalDebt.toFixed(2)} (Bs. ${(c.totalDebt * settings.bcvRate).toFixed(2)})`)
      .replace('{fechaLimite}', 'lo antes posible');

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const match = c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    c.cedulaRif.toLowerCase().includes(searchTerm.toLowerCase());
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

  const handleOpenNew = () => {
    setEditingId(null);
    setCedulaRif('V-');
    setFullName('');
    setPhoneWa('+58 ');
    setAddress('');
    setNotes('');
    setDefaultPriceMode('DYNAMIC');
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
    setIsModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !cedulaRif.trim()) return;

    if (editingId) {
      updateCustomer(editingId, {
        cedulaRif,
        fullName,
        phoneWa,
        address,
        notes,
        defaultPriceMode
      });
    } else {
      addCustomer({
        cedulaRif,
        fullName,
        phoneWa,
        address,
        notes,
        defaultPriceMode
      });
    }

    setIsModalOpen(false);
  };

  const handleApplyAbono = () => {
    if (!selectedCust || abonoAmount <= 0) return;
    const newDebt = Math.max(0, selectedCust.totalDebt - abonoAmount);
    updateCustomer(selectedCust.id, { totalDebt: newDebt });
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

      {/* Search and Filters */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 260 }}>
          <Search size={16} color="var(--clr-text-muted)" />
          <input
            type="text"
            className="input"
            placeholder="Buscar por nombre o cédula/RIF..."
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

      {/* Customers Table */}
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
              <th style={{ textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map(cust => (
              <tr key={cust.id}>
                <td>
                  {cust.totalDebt > 0 ? (
                    <span className="badge badge-red flex items-center gap-1" style={{ fontSize: 10 }}>
                      <AlertCircle size={10} /> Deuda
                    </span>
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
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT CUSTOMER MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div className="card animate-fadeIn" style={{ maxWidth: 500, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
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

      {/* ABONO MODAL */}
      {abonoModalOpen && selectedCust && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div className="card animate-fadeIn" style={{ maxWidth: 420, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
