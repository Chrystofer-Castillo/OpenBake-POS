import { useAppStore } from '../store/appStore';
import { TrendingUp, DollarSign, Users } from 'lucide-react';

interface QuadrantProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accent?: 'gold' | 'rose' | 'mint' | 'red';
}

function Quadrant({ title, subtitle, children, accent }: QuadrantProps) {
  const borderColor = accent === 'gold' ? 'rgba(245,200,66,0.2)'
    : accent === 'rose' ? 'rgba(244,114,182,0.2)'
    : accent === 'mint' ? 'rgba(52,211,153,0.2)'
    : accent === 'red'  ? 'rgba(239,68,68,0.2)'
    : 'var(--clr-border)';

  return (
    <div className="card" style={{ borderColor, display:'flex', flexDirection:'column', gap:'var(--space-5)' }}>
      <div>
        <h3 style={{ fontWeight:700, fontSize:16, color:'var(--clr-text-primary)' }}>{title}</h3>
        {subtitle && <p style={{ fontSize:12, color:'var(--clr-text-muted)', marginTop:4 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

interface ThermometerBarProps {
  label: string;
  actual: number;
  target: number;
  unit?: string;
}

function ThermometerBar({ label, actual, target, unit = '%' }: ThermometerBarProps) {
  const pct = Math.min((actual / (target * 1.5)) * 100, 100);
  const status = actual <= target ? 'ok' : actual <= target * 1.2 ? 'warn' : 'danger';
  const fillClass = status === 'ok' ? 'progress-fill-mint'
    : status === 'warn' ? 'progress-fill-warn' : 'progress-fill-red';
  const statusColor = status === 'ok' ? 'var(--clr-mint-400)'
    : status === 'warn' ? 'var(--clr-warning)' : 'var(--clr-danger)';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <div className="flex items-center justify-between">
        <span style={{ fontSize:13, color:'var(--clr-text-secondary)' }}>{label}</span>
        <div className="flex items-center gap-2">
          <span style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:600, color: statusColor }}>
            {actual.toFixed(1)}{unit}
          </span>
          <span style={{ fontSize:11, color:'var(--clr-text-muted)' }}>/ {target}{unit} meta</span>
        </div>
      </div>
      <div className="progress-bar">
        <div className={`progress-fill ${fillClass}`} style={{ width:`${pct}%` }} />
      </div>
    </div>
  );
}

export default function BillboardPage() {
  const settings = useAppStore(s => s.settings);
  const customers = useAppStore(s => s.customers);
  const invoices = useAppStore(s => s.invoices);
  const setActiveModule = useAppStore(s => s.setActiveModule);

  // Dynamic calculations from invoices & customers
  const grossIncome = invoices
    .filter(i => i.exitType === 'VENTA' || i.exitType === 'CREDITO')
    .reduce((acc, i) => acc + i.total, 0);

  const realCash = invoices.reduce((acc, i) => acc + i.paid, 0);
  const accountsReceivable = customers.reduce((acc, c) => acc + c.totalDebt, 0);
  const totalDebors = customers.filter(c => c.totalDebt > 0).length;

  const leaksGifts = invoices.filter(i => i.exitType === 'REGALO').reduce((acc, i) => acc + i.total, 0);
  const leaksEaten = invoices.filter(i => i.exitType === 'COMIDO').reduce((acc, i) => acc + i.total, 0);
  const leaksLost = invoices.filter(i => i.exitType === 'PERDIDO').reduce((acc, i) => acc + i.total, 0);
  const leaksCost = leaksGifts + leaksEaten + leaksLost;

  const ownerSalary = grossIncome * ((settings?.ownerSalaryPct ?? 20) / 100);
  const netProfit = grossIncome * ((settings?.netProfitPct ?? 8) / 100);

  const demo = {
    grossIncome,
    realCash,
    accountsReceivable,
    cogsPctActual: settings?.cogsPct ?? 30,
    opexPctActual: settings?.opexPct ?? 18,
    ownerSalary,
    netProfit,
    leaksCost,
    totalDebors,
    leaksGifts,
    leaksEaten,
    leaksLost
  };

  const bcvRate = settings?.bcvRate || 46.85;
  const fmt = (n: number) => `$${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtBs = (usd: number) => `Bs. ${(usd * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="animate-fadeIn" style={{ display:'flex', flexDirection:'column', gap:'var(--space-8)' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 Panel Financiero</h1>
          <p className="page-subtitle">Centro de control gerencial — Mes en curso</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-mint font-mono" style={{ fontSize: 11 }}>
            Tasa BCV: Bs. {bcvRate.toFixed(2)}
          </span>
          <span className="badge badge-gold">🟢 En Tiempo Real</span>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid-3">
        {[
          { label:'Ingresos Brutos', value: fmt(demo.grossIncome), bsValue: fmtBs(demo.grossIncome), icon: DollarSign, color:'var(--clr-gold-400)', sub:'Facturado en el mes' },
          { label:'Caja Disponible', value: fmt(demo.realCash), bsValue: fmtBs(demo.realCash), icon: TrendingUp, color:'var(--clr-mint-400)', sub:'Cobrado efectivo' },
          { label:'Dinero en la Calle', value: fmt(demo.accountsReceivable), bsValue: fmtBs(demo.accountsReceivable), icon: Users, color:'var(--clr-rose-400)', sub:`${demo.totalDebors} deudores activos`, clickable: true },
        ].map(stat => (
          <div
            key={stat.label}
            className="stat-card card-gold"
            onClick={() => stat.clickable && setActiveModule('customers')}
            style={{ cursor: stat.clickable ? 'pointer' : 'default' }}
            title={stat.clickable ? 'Clic para ver detalles en Cuaderno de Clientes' : undefined}
          >
            <div className="flex items-center justify-between">
              <span className="stat-card-label">{stat.label}</span>
              <stat.icon size={18} color={stat.color} />
            </div>
            <div className="stat-card-value" style={{ color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--clr-text-secondary)', marginTop: 4 }}>
              {stat.bsValue}
            </div>
            <div className="stat-card-sub">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* 4 Quadrants */}
      <div className="grid-2" style={{ gap:'var(--space-6)' }}>
        {/* A: Thermometer */}
        <Quadrant title="🌡️ Termómetro de Desviaciones"
          subtitle="Realidad vs. metas configuradas en Ajustes"
          accent="gold">
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <ThermometerBar label="Costo de Materia Prima (COGS)" actual={demo.cogsPctActual} target={settings?.cogsPct ?? 30} />
            <ThermometerBar label="Gastos Operativos (OPEX)" actual={demo.opexPctActual} target={settings?.opexPct ?? 18} />
            <ThermometerBar
              label="% Sueldo del Dueño"
              actual={demo.grossIncome > 0 ? (demo.ownerSalary / demo.grossIncome) * 100 : (settings?.ownerSalaryPct ?? 20)}
              target={settings?.ownerSalaryPct ?? 20}
            />
          </div>
          <div style={{ padding: 'var(--space-3)', background:'rgba(245,200,66,0.08)', borderRadius:'var(--radius-md)',
            border:'1px solid rgba(245,200,66,0.2)', fontSize:12, color:'var(--clr-text-secondary)' }}>
            💡 Las barras en rojo indican desviación crítica &gt; 20% sobre la meta configurada.
          </div>
        </Quadrant>

        {/* B: Capital */}
        <Quadrant title="💰 Capital Líquido y Circulación"
          subtitle="Flujo de efectivo real del período"
          accent="mint">
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { label:'Ingresos Brutos Totales', val: fmt(demo.grossIncome), color:'var(--clr-text-primary)' },
              { label:'Caja Real / Disponible',  val: fmt(demo.realCash),    color:'var(--clr-mint-400)' },
              { label:'Dinero en la Calle',      val: fmt(demo.accountsReceivable), color:'var(--clr-rose-400)' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between" style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--clr-bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--clr-border)'
              }}>
                <span style={{ fontSize:13, color:'var(--clr-text-secondary)' }}>{row.label}</span>
                <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color: row.color }}>{row.val}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setActiveModule('customers')} className="btn btn-secondary" style={{ width:'100%' }}>
            <Users size={14} /> Ver Deudores y Enviar WhatsApp
          </button>
        </Quadrant>

        {/* C: Leaks */}
        <Quadrant title="🕳️ El Agujero de Fugas"
          subtitle="Costo oculto de salidas no facturadas"
          accent="red">
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { label:'🎁 Cortesías y Regalos', val: fmt(demo.leaksGifts), pct: demo.leaksCost > 0 ? (demo.leaksGifts / demo.leaksCost) * 100 : 0 },
              { label:'🍽️ Autoconsumo del equipo', val: fmt(demo.leaksEaten), pct: demo.leaksCost > 0 ? (demo.leaksEaten / demo.leaksCost) * 100 : 0 },
              { label:'❌ Pérdidas y Mermas', val: fmt(demo.leaksLost), pct: demo.leaksCost > 0 ? (demo.leaksLost / demo.leaksCost) * 100 : 0 },
            ].map(row => (
              <div key={row.label} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize:12, color:'var(--clr-text-secondary)' }}>{row.label}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:600, color:'var(--clr-danger)' }}>{row.val}</span>
                </div>
                <div className="progress-bar" style={{ height:4 }}>
                  <div className="progress-fill progress-fill-red" style={{ width:`${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between" style={{
            padding:'var(--space-3) var(--space-4)',
            background:'rgba(239,68,68,0.08)',
            borderRadius:'var(--radius-md)',
            border:'1px solid rgba(239,68,68,0.2)'
          }}>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--clr-danger)' }}>Total Fugas del Mes</span>
            <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--clr-danger)' }}>{fmt(demo.leaksCost)}</span>
          </div>
        </Quadrant>

        {/* D: Salary + Net Profit */}
        <Quadrant title="🏆 Remuneración y Utilidad Neta"
          subtitle="Tu trabajo tiene valor — financieramente separado de la caja"
          accent="gold">
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ padding:'var(--space-5)', background:'rgba(245,200,66,0.08)',
              borderRadius:'var(--radius-lg)', border:'1px solid rgba(245,200,66,0.2)', textAlign:'center' }}>
              <div style={{ fontSize:11, color:'var(--clr-text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
                Sueldo del Maestro Repostero
              </div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:32, fontWeight:800, color:'var(--clr-gold-400)' }}>
                {fmt(demo.ownerSalary)}
              </div>
              <div style={{ fontSize:12, color:'var(--clr-text-muted)', marginTop:4 }}>
                {settings?.ownerSalaryPct ?? 20}% de los ingresos brutos
              </div>
            </div>
            <div style={{ padding:'var(--space-5)', background:'rgba(52,211,153,0.08)',
              borderRadius:'var(--radius-lg)', border:'1px solid rgba(52,211,153,0.2)', textAlign:'center' }}>
              <div style={{ fontSize:11, color:'var(--clr-text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
                Utilidad Neta Real
              </div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:32, fontWeight:800, color:'var(--clr-mint-400)' }}>
                {fmt(demo.netProfit)}
              </div>
              <div style={{ fontSize:12, color:'var(--clr-text-muted)', marginTop:4 }}>
                Disponible para reinversión y fondo de reserva
              </div>
            </div>
          </div>
        </Quadrant>
      </div>
    </div>
  );
}
