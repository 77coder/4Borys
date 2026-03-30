import { useEffect, useState } from 'react';
import { Beaker, Settings, Moon, Sun, LayoutDashboard } from 'lucide-react';
import { useAppStore } from './store';
import { LaboratoryTab } from './components/LaboratoryTab';
import { SettingsTab } from './components/SettingsTab';
import { BatchStatusWidget } from './components/BatchStatusWidget';

type Tab = 'laboratory' | 'settings';

function App() {
  const { theme, setTheme } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('laboratory');

  // Apply theme to document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div style={{ padding: '0.5rem 0', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--accent-color)', color: 'white', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <LayoutDashboard size={20} />
          </div>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>LLM Tester</h2>
        </div>

        <nav style={{ flex: 1 }}>
          <button
            className={`nav-item ${activeTab === 'laboratory' ? 'active' : ''}`}
            onClick={() => setActiveTab('laboratory')}
            style={{ width: '100%', textAlign: 'left', border: 'none', background: activeTab === 'laboratory' ? 'var(--accent-color)' : 'transparent' }}
          >
            <Beaker size={20} />
            <span>Laboratorium</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            style={{ width: '100%', textAlign: 'left', border: 'none', background: activeTab === 'settings' ? 'var(--accent-color)' : 'transparent' }}
          >
            <Settings size={20} />
            <span>Ustawienia</span>
          </button>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            className="nav-item"
            onClick={toggleTheme}
            style={{ width: '100%', textAlign: 'left', background: 'transparent' }}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            <span>Motyw {theme === 'dark' ? 'Jasny' : 'Ciemny'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'laboratory' && <LaboratoryTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>

      {/* Floating Widgets */}
      <BatchStatusWidget />
    </div>
  );
}

export default App;
