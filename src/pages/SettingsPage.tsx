import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import {
  Settings, Save, RotateCcw, Download,
  DollarSign, Building2, MessageSquare, Cpu,
  Palette, Check
} from 'lucide-react';
import { AVAILABLE_THEMES } from '../lib/themes';

export default function SettingsPage() {
  const settings = useAppStore(s => s.settings);
  const updateSettings = useAppStore(s => s.updateSettings);
  const resetToDefaults = useAppStore(s => s.resetToDefaults);
  const pushAlert = useAppStore(s => s.pushAlert);

  // Form State
  const [theme, setTheme] = useState(settings.theme || 'vainilla');
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [rif, setRif] = useState(settings.rif || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [address, setAddress] = useState(settings.address || '');
  const [state, setState] = useState(settings.state);
  const [city, setCity] = useState(settings.city);
  const [zoneType, setZoneType] = useState(settings.zoneType);

  // Financial Parameters
  const [bcvRate, setBcvRate] = useState<number>(settings.bcvRate || 46.85);
  const [taxPct, setTaxPct] = useState<number>(settings.taxPct);
  const [cogsPct, setCogsPct] = useState<number>(settings.cogsPct);
  const [opexPct, setOpexPct] = useState<number>(settings.opexPct);
  const [ownerSalaryPct, setOwnerSalaryPct] = useState<number>(settings.ownerSalaryPct);
  const [reinvestPct, setReinvestPct] = useState<number>(settings.reinvestPct);
  const [netProfitPct, setNetProfitPct] = useState<number>(settings.netProfitPct);
  const [wholesalePct, setWholesalePct] = useState<number>(settings.wholesalePct || 18);

  // WhatsApp
  const [waTemplate, setWaTemplate] = useState(settings.waTemplate);

  const handleSelectTheme = (themeId: string) => {
    setTheme(themeId);
    updateSettings({ theme: themeId });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      theme,
      businessName,
      rif,
      phone,
      address,
      state,
      city,
      zoneType,
      bcvRate,
      taxPct,
      cogsPct,
      opexPct,
      ownerSalaryPct,
      reinvestPct,
      netProfitPct,
      wholesalePct,
      waTemplate
    });
  };

  const handleExportBackup = () => {
    const raw = {
      settings,
      materials: useAppStore.getState().materials,
      recipes: useAppStore.getState().recipes,
      customers: useAppStore.getState().customers,
      invoices: useAppStore.getState().invoices,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(raw, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dulce_arte_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushAlert({ type: 'success', message: 'Copia de seguridad descargada exitosamente' });
  };

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-gold">
              <Settings size={14} /> Configuración Central
            </span>
            <span className="badge badge-mint">32 & 64 Bits Ready</span>
          </div>
          <h1 className="page-title" style={{ marginTop: 6 }}>Parámetros del Sistema</h1>
          <p className="page-subtitle">
            Ajustes fiscales, tasa cambiaria oficial BCV, márgenes financieros y datos de la empresa.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleExportBackup} className="btn btn-secondary">
            <Download size={16} />
            <span>Respaldar Datos (JSON)</span>
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            <Save size={16} />
            <span>Guardar Configuración</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        
        {/* Section 0: Theme & Aesthetics System (MODULE 5) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="flex items-center gap-2">
              <Palette size={18} color="var(--clr-gold-400)" />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
                Personalización Visual — Temas Pasteles & Oscuros
              </h3>
            </div>
            <span className="badge badge-gold" style={{ fontSize: 11 }}>
              {AVAILABLE_THEMES.length} Temas Disponibles
            </span>
          </div>

          <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', margin: 0 }}>
            Haz clic en cualquier sabor para transformar toda la interfaz en tiempo real. Todos los colores se adaptan a pastelería fina, heladería o modo nocturno.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Pasteles */}
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                🍨 Sabores & Colores Pasteles Claros
              </span>
              <div className="theme-grid" style={{ marginTop: 8 }}>
                {AVAILABLE_THEMES.filter(t => !t.isDark).map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className={`theme-swatch ${theme === t.id ? 'active' : ''}`}
                    onClick={() => handleSelectTheme(t.id)}
                    style={{
                      background: t.colors.bg,
                      color: t.colors.text,
                      border: theme === t.id ? '2px solid var(--clr-gold-500)' : '1px solid var(--clr-border)'
                    }}
                  >
                    <div className="theme-swatch-colors">
                      <div className="theme-swatch-dot" style={{ background: t.colors.bg }} />
                      <div className="theme-swatch-dot" style={{ background: t.colors.sidebar }} />
                      <div className="theme-swatch-dot" style={{ background: t.colors.accent }} />
                    </div>
                    <div style={{ fontSize: 20, marginBottom: 2 }}>{t.emoji}</div>
                    <div className="theme-swatch-name">{t.name}</div>
                    {theme === t.id && (
                      <div style={{
                        marginTop: 4,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: 10,
                        fontWeight: 700,
                        color: t.colors.accent
                      }}>
                        <Check size={11} /> Activo
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Oscuros */}
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--clr-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                🌑 Modo Oscuro Premium
              </span>
              <div className="theme-grid" style={{ marginTop: 8 }}>
                {AVAILABLE_THEMES.filter(t => t.isDark).map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className={`theme-swatch ${theme === t.id ? 'active' : ''}`}
                    onClick={() => handleSelectTheme(t.id)}
                    style={{
                      background: t.colors.bg,
                      color: t.colors.text,
                      border: theme === t.id ? '2px solid var(--clr-gold-500)' : '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <div className="theme-swatch-colors">
                      <div className="theme-swatch-dot" style={{ background: t.colors.bg }} />
                      <div className="theme-swatch-dot" style={{ background: t.colors.sidebar }} />
                      <div className="theme-swatch-dot" style={{ background: t.colors.accent }} />
                    </div>
                    <div style={{ fontSize: 20, marginBottom: 2 }}>{t.emoji}</div>
                    <div className="theme-swatch-name">{t.name}</div>
                    {theme === t.id && (
                      <div style={{
                        marginTop: 4,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: 10,
                        fontWeight: 700,
                        color: t.colors.accent
                      }}>
                        <Check size={11} /> Activo
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Business Identity */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="flex items-center gap-2">
            <Building2 size={18} color="var(--clr-gold-400)" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
              Identidad del Negocio & Ubicación de Mercado
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Nombre de la Heladería / Pastelería</label>
              <input
                type="text"
                className="input"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>RIF / Identificación Fiscal</label>
              <input
                type="text"
                className="input font-mono"
                value={rif}
                onChange={e => setRif(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Teléfono de Contacto</label>
              <input
                type="text"
                className="input font-mono"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Dirección Física / Local</label>
              <input
                type="text"
                className="input"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Estado</label>
              <input
                type="text"
                className="input"
                value={state}
                onChange={e => setState(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Ciudad / Municipio</label>
              <input
                type="text"
                className="input"
                value={city}
                onChange={e => setCity(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Zona de Mercado</label>
              <input
                type="text"
                className="input"
                value={zoneType}
                onChange={e => setZoneType(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Financial Engine & Dual Currency */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="flex items-center gap-2">
            <DollarSign size={18} color="var(--clr-mint-400)" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
              Parámetros Financieros & Tasa BCV
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            
            {/* Tasa BCV */}
            <div style={{ background: 'var(--clr-bg-subtle)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--clr-border)' }}>
              <label style={{ fontSize: 12, color: 'var(--clr-mint-400)', fontWeight: 700 }}>
                Tasa de Cambio BCV (Bs. / USD)
              </label>
              <input
                type="number"
                step="0.01"
                className="input font-mono font-bold"
                style={{ fontSize: 16, marginTop: 4, color: 'var(--clr-mint-400)' }}
                value={bcvRate}
                onChange={e => setBcvRate(Number(e.target.value))}
              />
              <span style={{ fontSize: 10, color: 'var(--clr-text-muted)', marginTop: 4, display: 'block' }}>
                Actualiza todos los precios e inventarios en Bolívares.
              </span>
            </div>

            {/* Wholesale Pct */}
            <div style={{ background: 'rgba(59,130,246,0.08)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <label style={{ fontSize: 12, color: 'var(--clr-primary-light)', fontWeight: 700 }}>
                % Descuento al Mayor por Defecto
              </label>
              <input
                type="number"
                min="0"
                max="50"
                step="1"
                className="input font-mono font-bold"
                style={{ fontSize: 16, marginTop: 4, color: 'var(--clr-primary-light)' }}
                value={wholesalePct}
                onChange={e => setWholesalePct(Number(e.target.value))}
              />
              <span style={{ fontSize: 10, color: 'var(--clr-text-muted)', marginTop: 4, display: 'block' }}>
                Margen especial para ventas por volumen a revendedores.
              </span>
            </div>

            {/* IVA */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Impuesto IVA (%)</label>
              <input
                type="number"
                step="1"
                className="input font-mono"
                value={taxPct}
                onChange={e => setTaxPct(Number(e.target.value))}
              />
            </div>

            {/* COGS Target */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Costo MP Meta (COGS %)</label>
              <input
                type="number"
                step="1"
                className="input font-mono"
                value={cogsPct}
                onChange={e => setCogsPct(Number(e.target.value))}
              />
            </div>

            {/* OPEX */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Gastos Operativos (OPEX %)</label>
              <input
                type="number"
                step="1"
                className="input font-mono"
                value={opexPct}
                onChange={e => setOpexPct(Number(e.target.value))}
              />
            </div>

            {/* Sueldo del Dueño */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Sueldo del Dueño (%)</label>
              <input
                type="number"
                step="1"
                className="input font-mono"
                value={ownerSalaryPct}
                onChange={e => setOwnerSalaryPct(Number(e.target.value))}
              />
            </div>

            {/* Reinversión */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Fondo Reinversión (%)</label>
              <input
                type="number"
                step="1"
                className="input font-mono"
                value={reinvestPct}
                onChange={e => setReinvestPct(Number(e.target.value))}
              />
            </div>

            {/* Ganancia Neta */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>Ganancia Neta Libre (%)</label>
              <input
                type="number"
                step="1"
                className="input font-mono"
                value={netProfitPct}
                onChange={e => setNetProfitPct(Number(e.target.value))}
              />
            </div>

          </div>
        </div>

        {/* Section 3: WhatsApp Collection Template */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="flex items-center gap-2">
            <MessageSquare size={18} color="var(--clr-mint-400)" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
              Plantilla de Cobranza para WhatsApp
            </h3>
          </div>

          <p style={{ fontSize: 12, color: 'var(--clr-text-muted)', margin: 0 }}>
            Variables admitidas: <code>{'{nombreCliente}'}</code>, <code>{'{nombreNegocio}'}</code>, <code>{'{saldoPendiente}'}</code>, <code>{'{fechaLimite}'}</code>.
          </p>

          <textarea
            className="input"
            rows={3}
            value={waTemplate}
            onChange={e => setWaTemplate(e.target.value)}
            style={{ resize: 'none', lineHeight: 1.5 }}
          />
        </div>

        {/* Section 4: System Diagnostics & 32/64 bits support */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="flex items-center gap-2">
            <Cpu size={18} color="var(--clr-gold-400)" />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
              Arquitectura del Sistema & Compatibilidad Multiplataforma
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 12 }}>
            <div style={{ background: 'var(--clr-bg-subtle)', padding: 10, borderRadius: 6 }}>
              <span style={{ color: 'var(--clr-text-muted)' }}>Arquitectura nativa:</span>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--clr-mint-400)' }}>
                x86_64 (64-bit) & i686 (32-bit)
              </p>
            </div>
            <div style={{ background: 'var(--clr-bg-subtle)', padding: 10, borderRadius: 6 }}>
              <span style={{ color: 'var(--clr-text-muted)' }}>Base de Datos:</span>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--clr-gold-400)' }}>
                SQLite WAL (Full Synchronous)
              </p>
            </div>
            <div style={{ background: 'var(--clr-bg-subtle)', padding: 10, borderRadius: 6 }}>
              <span style={{ color: 'var(--clr-text-muted)' }}>Motor Aritmético:</span>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--clr-text-primary)' }}>
                Decimal.js (20 decimales sin redondeo IEEE)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--clr-border)' }}>
            <span style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>
              ¿Deseas reiniciar todos los datos a la configuración inicial de fábrica?
            </span>
            <button
              type="button"
              onClick={() => {
                if (confirm('¿Estás seguro de que deseas restablecer todos los datos a los valores de fábrica? Esta acción no se puede deshacer.')) {
                  resetToDefaults();
                }
              }}
              className="btn btn-ghost"
              style={{ color: 'var(--clr-danger)', fontSize: 12 }}
            >
              <RotateCcw size={14} /> Restaurar Fábrica
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
