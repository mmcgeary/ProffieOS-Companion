import React from 'react';
import { useConfigStore } from '../state/configStore';
import { Volume2, Zap, RotateCcw } from 'lucide-react';

export const GlobalSettings: React.FC = () => {
  const { sections, updateParam } = useConfigStore();
  const globalSection = sections.find(s => s.name.toLowerCase() === 'global');
  const globalIndex = sections.findIndex(s => s.name.toLowerCase() === 'global');

  if (sections.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text)' }}>No configuration loaded.</div>;
  }

  if (!globalSection) return <div style={{ padding: '40px', color: 'var(--text)' }}>No [Global] section found in configuration.</div>;

  const handleParamChange = (key: string, value: string) => {
    updateParam(globalIndex, key, value);
  };

  return (
    <div className="global-settings" style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
        
        {/* Audio Card */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '25px', borderRadius: '12px', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Volume2 size={20} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, textTransform: 'uppercase' }}>Audio</h3>
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500 }}>System Volume</label>
              <span style={{ fontSize: '14px', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{globalSection.params.Volume || 1500}</span>
            </div>
            <input 
              type="range" min="0" max="3000" step="50"
              value={globalSection.params.Volume || 1500} 
              onChange={(e) => handleParamChange('Volume', e.target.value)}
              style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Motion Card */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '25px', borderRadius: '12px', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Zap size={20} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, textTransform: 'uppercase' }}>Sensing</h3>
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500 }}>Clash Threshold</label>
              <span style={{ fontSize: '14px', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{globalSection.params.ClashThreshold || 2.5}</span>
            </div>
            <input 
              type="number" step="0.1"
              value={globalSection.params.ClashThreshold || 2.5} 
              onChange={(e) => handleParamChange('ClashThreshold', e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', fontSize: '16px' }}
            />
          </div>
        </div>

        {/* Gestures Card */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '25px', borderRadius: '12px', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <RotateCcw size={20} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, textTransform: 'uppercase' }}>Gestures</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <GestureToggle 
              label="Twist ON/OFF" 
              flag={1} 
              currentValue={parseInt(globalSection.params.GestureFlags || '0')}
              onChange={(newVal) => handleParamChange('GestureFlags', newVal.toString())}
            />
            <GestureToggle 
              label="Stab ON" 
              flag={2} 
              currentValue={parseInt(globalSection.params.GestureFlags || '0')}
              onChange={(newVal) => handleParamChange('GestureFlags', newVal.toString())}
            />
            <GestureToggle 
              label="Swing ON" 
              flag={4} 
              currentValue={parseInt(globalSection.params.GestureFlags || '0')}
              onChange={(newVal) => handleParamChange('GestureFlags', newVal.toString())}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

const GestureToggle: React.FC<{ label: string, flag: number, currentValue: number, onChange: (v: number) => void }> = ({ label, flag, currentValue, onChange }) => {
  const isActive = (currentValue & flag) !== 0;
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-h)' }}>
      <input 
        type="checkbox" 
        checked={isActive} 
        onChange={(e) => {
          const next = e.target.checked ? (currentValue | flag) : (currentValue & ~flag);
          onChange(next);
        }}
        style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
      />
      {label}
    </label>
  );
};
