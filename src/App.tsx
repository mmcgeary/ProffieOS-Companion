import React from 'react'
import { useConfigStore } from './state/configStore'
import { PresetEditor } from './components/PresetEditor'
import { GlobalSettings } from './components/GlobalSettings'
import { ButtonMapping } from './components/ButtonMapping'
import { StyleTuning } from './components/StyleTuning'
import { Radio, Save, Power, Wifi, Terminal } from 'lucide-react'

const App: React.FC = () => {
  const { sections, isConnected, connect, disconnect, isDirty, saveToBoard, saveStatus, logs, error } = useConfigStore()
  const [activeTab, setActiveTab] = React.useState('presets')
  const [showLogs, setShowLogs] = React.useState(false)

  const tabs = [
    { id: 'presets', label: 'Presets', component: <PresetEditor /> },
    { id: 'global', label: 'Global', component: <GlobalSettings /> },
    { id: 'buttons', label: 'Buttons', component: <ButtonMapping /> },
    { id: 'tuning', label: 'Tuning', component: <StyleTuning /> },
  ]

  const activeComponent = tabs.find(t => t.id === activeTab)?.component

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', background: 'var(--bg)', color: 'var(--text)' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '20px 40px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Radio size={28} color="var(--accent)" />
          <h1 style={{ margin: 0, fontSize: '24px', letterSpacing: '-0.5px', color: 'var(--text-h)' }}>ProffieOS Companion</h1>
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <button 
            onClick={() => setShowLogs(!showLogs)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: showLogs ? 'var(--accent-bg)' : 'var(--bg)',
              color: showLogs ? 'var(--accent)' : 'var(--text-h)',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <Terminal size={18} />
            Logs
          </button>

          <button 
            onClick={isConnected ? disconnect : connect}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text-h)',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            {isConnected ? <Power size={18} /> : <Wifi size={18} />}
            {isConnected ? 'Disconnect' : 'Connect to Board'}
          </button>

          <button 
            onClick={saveToBoard}
            disabled={!isConnected || sections.length === 0 || saveStatus === 'saving'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: saveStatus === 'success' ? '#10b981' : (saveStatus === 'error' ? '#ef4444' : (isConnected && sections.length > 0 ? 'var(--accent)' : 'var(--border)')),
              color: 'white',
              cursor: (isConnected && sections.length > 0 && saveStatus !== 'saving') ? 'pointer' : 'default',
              fontWeight: 600,
              opacity: isConnected && sections.length > 0 ? 1 : 0.5,
              transition: 'all 0.2s'
            }}
          >
            <Save size={18} className={saveStatus === 'saving' ? 'animate-pulse' : ''} />
            {saveStatus === 'saving' ? 'Saving...' : (saveStatus === 'success' ? 'Saved!' : (saveStatus === 'error' ? 'Error!' : 'Save to SD'))}
          </button>
        </div>
      </header>

      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div className="tabs-header" style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          gap: '10px',
          padding: '0 40px'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 500,
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text)',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="tab-content" style={{ flexGrow: 1 }}>
          {activeComponent}
        </div>

        {showLogs && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '250px',
            background: '#1a1b26',
            color: '#a9b1d6',
            padding: '20px',
            fontFamily: 'var(--mono)',
            fontSize: '12px',
            overflowY: 'auto',
            borderTop: '4px solid var(--accent)',
            zIndex: 1000,
            boxShadow: '0 -10px 30px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: 'white' }}>
              <span style={{ fontWeight: 600 }}>BOARD SERIAL LOGS</span>
              <button onClick={() => setShowLogs(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>✕ Close</button>
            </div>
            {logs.length === 0 ? (
              <div style={{ opacity: 0.5 }}>Waiting for board output...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} style={{ marginBottom: '4px', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '10px' }}>
                  <span style={{ color: '#565f89', marginRight: '10px' }}>[{new Date().toLocaleTimeString()}]</span>
                  {log}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <footer style={{ 
        padding: '15px 40px', 
        fontSize: '12px', 
        display: 'flex', 
        justifyContent: 'space-between',
        borderTop: '1px solid var(--border)', 
        color: 'var(--text)',
        background: 'var(--bg)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span>ProffieOS v6.x / v7.x Compatible</span>
          <a href="https://github.com/profezzorn/ProffieOS" style={{ color: 'inherit' }}>
            Source
          </a>
          {error && <span style={{ color: '#ef4444', fontWeight: 600, marginLeft: '20px' }}>⚠️ ERROR: {error}</span>}
        </div>
        {isDirty && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>● Unsaved changes</span>}
      </footer>
    </div>
  )
}

export default App
