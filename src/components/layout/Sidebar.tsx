import { useAppStore } from '../../store/appStore';
import {
  LayoutDashboard, FlaskConical, Package, BookUser,
  Receipt, Settings, ChevronLeft
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'billboard',  label: 'Panel Financiero', icon: LayoutDashboard, section: 'Principal' },
  { id: 'laboratory', label: 'Laboratorio',       icon: FlaskConical,    section: 'Producción' },
  { id: 'inventory',  label: 'Inventario',        icon: Package,         section: 'Producción' },
  { id: 'customers',  label: 'Cuaderno Virtual',  icon: BookUser,        section: 'Clientes' },
  { id: 'billing',    label: 'Facturación',       icon: Receipt,         section: 'Clientes' },
  { id: 'settings',   label: 'Ajustes',           icon: Settings,        section: 'Sistema' },
];

export default function Sidebar() {
  const { settings, activeModule, sidebarOpen, setActiveModule, toggleSidebar } = useAppStore();
  const sections = [...new Set(NAV_ITEMS.map(i => i.section))];

  return (
    <aside className="sidebar" style={{ width: sidebarOpen ? 'var(--sidebar-w)' : 'var(--sidebar-collapsed-w)' }}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🍦</div>
        {sidebarOpen && (
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-name">{settings?.businessName ?? 'Dulce Arte'}</span>
            <span className="sidebar-logo-sub">Sistema ERP</span>
          </div>
        )}
        <button className="btn btn-ghost btn-icon" onClick={toggleSidebar}
          style={{ marginLeft: 'auto', opacity: 0.5 }}
          title={sidebarOpen ? 'Contraer' : 'Expandir'}>
          <ChevronLeft size={16} style={{ transform: sidebarOpen ? 'none' : 'rotate(180deg)', transition: 'transform 200ms' }} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {sections.map(section => (
          <div key={section}>
            {sidebarOpen && <div className="sidebar-section-label">{section}</div>}
            {NAV_ITEMS.filter(i => i.section === section).map(item => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button key={item.id}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveModule(item.id)}
                  title={!sidebarOpen ? item.label : undefined}
                  style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}>
                  <Icon className="sidebar-item-icon" size={18} />
                  {sidebarOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {sidebarOpen && (
        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--clr-border)',
          fontSize: '11px', color: 'var(--clr-text-muted)', textAlign: 'center' }}>
          v2.0 · Offline-First · 32/64 bits
        </div>
      )}
    </aside>
  );
}
