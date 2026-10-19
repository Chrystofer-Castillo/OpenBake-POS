import './index.css';
import { useAppStore } from './store/appStore';
import Sidebar from './components/layout/Sidebar';

// Pages (lazy loaded)
import BillboardPage from './pages/BillboardPage';
import LaboratoryPage from './pages/LaboratoryPage';
import InventoryPage from './pages/InventoryPage';
import CustomersPage from './pages/CustomersPage';
import BillingPage from './pages/BillingPage';
import SettingsPage from './pages/SettingsPage';

function AlertToast() {
  const { alerts, dismissAlert } = useAppStore();
  if (!alerts.length) return null;
  return (
    <div style={{ position:'fixed', bottom: 24, right: 24, display:'flex', flexDirection:'column', gap: 8, zIndex: 999 }}>
      {alerts.map(a => (
        <div key={a.id} className="animate-slideIn" style={{
          background: a.type === 'success' ? 'rgba(34,197,94,0.15)'
            : a.type === 'error' ? 'rgba(239,68,68,0.15)'
            : a.type === 'warn' ? 'rgba(245,158,11,0.15)'
            : 'rgba(59,130,246,0.15)',
          border: `1px solid ${
            a.type === 'success' ? 'rgba(34,197,94,0.4)'
            : a.type === 'error' ? 'rgba(239,68,68,0.4)'
            : a.type === 'warn' ? 'rgba(245,158,11,0.4)'
            : 'rgba(59,130,246,0.4)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          color: 'var(--clr-text-primary)',
          fontSize: 14,
          display:'flex', alignItems:'center', gap: 12,
          backdropFilter: 'blur(8px)',
          minWidth: 280,
          maxWidth: 400
        }}>
          <span style={{ flex:1 }}>{a.message}</span>
          <button onClick={() => dismissAlert(a.id)}
            style={{ background:'none', border:'none', cursor:'pointer',
              color:'var(--clr-text-muted)', fontSize:16 }}>✕</button>
        </div>
      ))}
    </div>
  );
}

function PageRouter() {
  const activeModule = useAppStore(s => s.activeModule);
  switch (activeModule) {
    case 'billboard':  return <BillboardPage />;
    case 'laboratory': return <LaboratoryPage />;
    case 'inventory':  return <InventoryPage />;
    case 'customers':  return <CustomersPage />;
    case 'billing':    return <BillingPage />;
    case 'settings':   return <SettingsPage />;
    default:           return <BillboardPage />;
  }
}

export default function App() {
  const sidebarOpen = useAppStore(s => s.sidebarOpen);
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content" style={{ marginLeft: sidebarOpen ? 'var(--sidebar-w)' : 'var(--sidebar-collapsed-w)' }}>
        <PageRouter />
      </main>
      <AlertToast />
    </div>
  );
}
