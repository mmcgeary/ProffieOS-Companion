import React from 'react';
import { useConfigStore } from '../state/configStore';
import { Volume2, Zap, RotateCcw, Clock, Sun } from 'lucide-react';
import {
  getGlobalParamValue,
  getGestureEnabled,
  type GlobalGestureKey,
} from '../config/globalConfig';

export const GlobalSettings: React.FC = () => {
  const { sections, updateParam, doc } = useConfigStore();
  const globalSection = sections.find(s => s.name.toLowerCase() === 'global');
  const globalIndex = sections.findIndex(s => s.name.toLowerCase() === 'global');

  if (sections.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text)' }}>No configuration loaded.</div>;
  }

  if (!globalSection) return <div style={{ padding: '40px', color: 'var(--text)' }}>No [Global] section found in configuration.</div>;

  const handleParamChange = (key: string, value: string) => {
    updateParam(globalIndex, key, value);
  };

  const rawVolume = parseInt(getGlobalParamValue(globalSection.params, 'volume') || '1000', 10);
  const maxVolume = doc?.hardwareProfile.maxVolume ?? 3000;
  // If the parsed volume is higher than maxVolume, show maxVolume in the UI since the board will clamp it
  const volume = Math.min(rawVolume, maxVolume).toString();

  const clashThreshold = getGlobalParamValue(globalSection.params, 'clash_threshold') || '8';
  const bladeDimming = getGlobalParamValue(globalSection.params, 'blade_dimming') || '100';
  const idleOffTime = getGlobalParamValue(globalSection.params, 'idle_off_time') || '600000';
  const motionTimeout = getGlobalParamValue(globalSection.params, 'motion_timeout') || '900000';
  const shortClickTimeout = getGlobalParamValue(globalSection.params, 'button_short_click_timeout') || '500';
  const doubleClickTimeout = getGlobalParamValue(globalSection.params, 'button_double_click_timeout') || '500';

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
                <span style={{ fontSize: '14px', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{volume}</span>
              </div>
              <input 
                type="range" min="0" max={maxVolume} step="1"
                value={volume} 
                onChange={(e) => handleParamChange('volume', e.target.value)}
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
                <span style={{ fontSize: '14px', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{clashThreshold}</span>
              </div>
              <input 
                type="number" min="1" max="16" step="1"
                value={clashThreshold} 
                onChange={(e) => handleParamChange('clash_threshold', e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', fontSize: '16px' }}
              />
            </div>
        </div>

        {/* Blade Card */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '25px', borderRadius: '12px', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Sun size={20} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, textTransform: 'uppercase' }}>Blade</h3>
          </div>
          <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500 }}>Overall Brightness (%)</label>
                <span style={{ fontSize: '14px', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{bladeDimming}</span>
              </div>
              <input 
                type="range" min="0" max="100" step="1"
                value={bladeDimming} 
                onChange={(e) => handleParamChange('blade_dimming', e.target.value)}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
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
              label="Twist ON"
              gestureKey="twist_on"
              currentParams={globalSection.params}
              onChange={handleParamChange}
            />
            <GestureToggle 
              label="Twist OFF"
              gestureKey="twist_off"
              currentParams={globalSection.params}
              onChange={handleParamChange}
            />
            <GestureToggle 
              label="Stab ON"
              gestureKey="stab_on"
              currentParams={globalSection.params}
              onChange={handleParamChange}
            />
            <GestureToggle
              label="Swing ON"
              gestureKey="swing_on"
              currentParams={globalSection.params}
              onChange={handleParamChange}
            />
            <GestureToggle
              label="Thrust ON"
              gestureKey="thrust_on"
              currentParams={globalSection.params}
              onChange={handleParamChange}
            />
            <GestureToggle
              label="Force Push"
              gestureKey="force_push"
              currentParams={globalSection.params}
              onChange={handleParamChange}
            />
            <GestureToggle
              label="Melt"
              gestureKey="melt"
              currentParams={globalSection.params}
              onChange={handleParamChange}
            />
          </div>
        </div>

        {/* Timing Card */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '25px', borderRadius: '12px', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Clock size={20} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, textTransform: 'uppercase' }}>Timeouts (ms)</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="form-group">
              <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '5px' }}>Idle Off Time</label>
              <input 
                type="number" min="0" step="1000"
                value={idleOffTime} 
                onChange={(e) => handleParamChange('idle_off_time', e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', fontSize: '16px' }}
              />
            </div>
            
            <div className="form-group">
              <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '5px' }}>Motion Timeout</label>
              <input 
                type="number" min="0" step="1000"
                value={motionTimeout} 
                onChange={(e) => handleParamChange('motion_timeout', e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', fontSize: '16px' }}
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '5px' }}>Short Click</label>
              <input 
                type="number" min="50" max="2000" step="10"
                value={shortClickTimeout} 
                onChange={(e) => handleParamChange('button_short_click_timeout', e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', fontSize: '16px' }}
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '5px' }}>Double Click</label>
              <input 
                type="number" min="50" max="2000" step="10"
                value={doubleClickTimeout} 
                onChange={(e) => handleParamChange('button_double_click_timeout', e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', fontSize: '16px' }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const GestureToggle: React.FC<{
  label: string;
  gestureKey: GlobalGestureKey;
  currentParams: Record<string, string>;
  onChange: (key: string, value: string) => void;
}> = ({ label, gestureKey, currentParams, onChange }) => {
  const isActive = getGestureEnabled(currentParams, gestureKey);
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-h)' }}>
      <input 
        type="checkbox" 
        checked={isActive} 
        onChange={(e) => {
          onChange(gestureKey, e.target.checked ? 'true' : 'false');
        }}
        style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
      />
      {label}
    </label>
  );
};
