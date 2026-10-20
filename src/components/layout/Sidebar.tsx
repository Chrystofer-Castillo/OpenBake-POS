import { useAppStore } from '../../store/appStore';
import {
  FileText, Package, BookOpen, Receipt,
  DollarSign, Settings, ChevronLeft
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

      {/* Bottom Settings */}
      <div className="sidebar-footer">
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
