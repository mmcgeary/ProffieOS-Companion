import React, { useState } from 'react';

export interface Tab {
  id: string;
  label: string;
  component: React.ReactNode;
}

interface TabbedLayoutProps {
  tabs: Tab[];
}

export const TabbedLayout: React.FC<TabbedLayoutProps> = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id);

  return (
    <div className="tabbed-layout" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div className="tabs-header" style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        marginBottom: '20px',
        gap: '10px',
        padding: '0 20px'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
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
      <div className="tab-content" style={{ flex: 1, padding: '0 20px', overflowY: 'auto', textAlign: 'left' }}>
        {tabs.find((tab) => tab.id === activeTab)?.component}
      </div>
    </div>
  );
};
