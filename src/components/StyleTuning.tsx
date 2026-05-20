import React from 'react';
import { useConfigStore } from '../state/configStore';
import { Sliders, Thermometer, Wind, Zap, ZapOff, Activity, Layers, Repeat, Sun, Flame } from 'lucide-react';

export const StyleTuning: React.FC = () => {
  const { sections, updateParam, activePresetIndex } = useConfigStore();
  
  const presets = sections.filter(s => s.name.toLowerCase().startsWith('preset'));
  const activePreset = presets[activePresetIndex]; 
  const activeSectionIndex = sections.findIndex(s => s === activePreset);

  if (sections.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text)' }}>No configuration loaded.</div>;
  }

  if (!activePreset) return <div style={{ padding: '40px', color: 'var(--text)' }}>No active preset to tune.</div>;

  // Real metadata from ini_tuning_arg_table.h
  const TUNING_ARGS = [
    { key: 'flicker_depth', label: 'Flicker Depth', min: 0, max: 32768, step: 100, icon: <Activity size={16} /> },
    { key: 'flicker_speed', label: 'Flicker Speed', min: 0, max: 2000, step: 10, icon: <Wind size={16} /> },
    { key: 'stripe_width', label: 'Stripe Width', min: 1, max: 10000, step: 100, icon: <Layers size={16} /> },
    { key: 'stripe_speed', label: 'Stripe Speed', min: 0, max: 20000, step: 100, icon: <Repeat size={16} /> },
    { key: 'motion_gain', label: 'Motion Gain', min: 0, max: 32768, step: 512, icon: <Activity size={16} /> },
    { key: 'noise_mix', label: 'Noise Mix', min: 0, max: 32768, step: 512, icon: <Activity size={16} /> },
    { key: 'base_contrast', label: 'Base Contrast', min: 0, max: 32768, step: 512, icon: <Sliders size={16} /> },
    { key: 'drift_rate', label: 'Drift Rate', min: 0, max: 10000, step: 10, icon: <Wind size={16} /> },
    { key: 'warm_shift', label: 'Warm Shift', min: 0, max: 32768, step: 512, icon: <Thermometer size={16} /> },
    { key: 'jitter_amount', label: 'Jitter Amount', min: 1, max: 200, step: 1, icon: <Activity size={16} /> },
    { key: 'spark_mix', label: 'Spark Mix', min: 0, max: 32768, step: 512, icon: <Sun size={16} /> },
    { key: 'heat_rand', label: 'Heat Rand', min: 0, max: 32768, step: 512, icon: <Flame size={16} /> },
    { key: 'fire_cooling', label: 'Fire Cooling', min: 0, max: 255, step: 1, icon: <Thermometer size={16} /> },
    { key: 'rainbow_speed', label: 'Rainbow Speed', min: 1, max: 20000, step: 100, icon: <Repeat size={16} /> },
    { key: 'ignition_time', label: 'Ignition Time', min: 50, max: 3000, step: 50, icon: <Zap size={16} /> },
    { key: 'retraction_time', label: 'Retraction Time', min: 50, max: 3000, step: 50, icon: <ZapOff size={16} /> },
  ];

  return (
    <div className="style-tuning" style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Sliders size={24} color="var(--accent)" />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Master Style Tuning: {activePreset.params.name}</h3>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text)', background: 'var(--accent-bg)', padding: '6px 12px', borderRadius: '6px' }}>EFFECTS GLOBAL CONFIG</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {TUNING_ARGS.map((arg) => (
          <div key={arg.key} style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {arg.icon}
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-h)' }}>{arg.label}</span>
              </div>
              <span style={{ fontSize: '13px', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)' }}>
                {activePreset.params[arg.key] || (arg.key.includes('time') ? '300' : '0')}
              </span>
            </div>
            
            <input 
              type="range"
              min={arg.min}
              max={arg.max}
              step={arg.step}
              value={activePreset.params[arg.key] || (arg.key.includes('time') ? '300' : '0')}
              onChange={(e) => updateParam(activeSectionIndex, arg.key, e.target.value)}
              style={{
                width: '100%',
                cursor: 'pointer',
                accentColor: 'var(--accent)'
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
