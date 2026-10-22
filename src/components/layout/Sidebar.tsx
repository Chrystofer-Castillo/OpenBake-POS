import { useAppStore } from '../../store/appStore';
import {
  FileText, Package, BookOpen, Receipt,
  DollarSign, Settings, ChevronLeft, Sun, Moon
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'billing',    label: 'Caja / POS',  icon: Receipt },
  { id: 'laboratory', label: 'Recetario',   icon: FileText },
  { id: 'inventory',  label: 'Inventario',  icon: Package },
  { id: 'customers',  label: 'Cuaderno',    icon: BookOpen },
  { id: 'billboard',  label: 'Finanzas',    icon: DollarSign },
];

export default function Sidebar() {
  const { activeModule, sidebarOpen, setActiveModule, toggleSidebar } = useAppStore();
  const theme = useAppStore(s => s.settings.theme || 'vainilla');
  const updateSettings = useAppStore(s => s.updateSettings);

  const isDark = ['chocolate-negro', 'mora-nocturna', 'espresso', 'midnight-mint'].includes(theme);

  const handleToggleTheme = () => {
    const nextTheme = isDark ? 'vainilla' : 'chocolate-negro';
    updateSettings({ theme: nextTheme });
  };

  return (
    <aside className="sidebar" style={{ width: sidebarOpen ? 'var(--sidebar-w)' : 'var(--sidebar-collapsed-w)' }}>
      {/* Header with Cupcake Logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">🧁</div>
        {sidebarOpen && (
          <div className="sidebar-logo-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Dulce Arte
          </div>
        )}
        <button
          className="btn-ghost"
          onClick={toggleSidebar}
          style={{ marginLeft: 'auto', padding: 4, color: 'var(--clr-sidebar-muted)' }}
          title={sidebarOpen ? 'Contraer' : 'Expandir'}
        >
          <ChevronLeft size={16} style={{ transform: sidebarOpen ? 'none' : 'rotate(180deg)', transition: 'transform 200ms' }} />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              className={`sidebar-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveModule(item.id)}
              title={!sidebarOpen ? item.label : undefined}
              style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
            >
              <Icon size={18} />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions: Theme Toggle & Settings */}
      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Quick Theme Switcher Button */}
        <button
          className="sidebar-btn"
          onClick={handleToggleTheme}
          title={!sidebarOpen ? (isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro') : undefined}
          style={{
            justifyContent: sidebarOpen ? 'flex-start' : 'center',
            color: isDark ? 'var(--clr-gold-400)' : 'var(--clr-sidebar-muted)'
          }}
        >
          {isDark ? <Sun size={18} color="var(--clr-gold-400)" /> : <Moon size={18} />}
          {sidebarOpen && <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>}
        </button>

        <button
          className={`sidebar-btn ${activeModule === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveModule('settings')}
          title={!sidebarOpen ? 'Ajustes' : undefined}
          style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
        >
          <Settings size={18} />
          {sidebarOpen && <span>Ajustes</span>}
        </button>
      </div>
    </aside>
  );
}
