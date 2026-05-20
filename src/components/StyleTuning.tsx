import React from 'react';
import { useConfigStore } from '../state/configStore';
import { Sliders, Thermometer, Wind, Zap, ZapOff, Activity, Layers, Repeat, Sun, Flame } from 'lucide-react';
import { STYLE_TUNING_ARGS, getStyleTuningValue, type StyleTuningKey } from './styleTuningConfig';

const TUNING_ARG_ICONS: Record<StyleTuningKey, React.ReactNode> = {
  ignition_time: <Zap size={16} />,
  retraction_time: <ZapOff size={16} />,
  flicker_depth: <Activity size={16} />,
  flicker_speed: <Wind size={16} />,
  stripe_width: <Layers size={16} />,
  stripe_speed: <Repeat size={16} />,
  motion_gain: <Activity size={16} />,
  noise_mix: <Activity size={16} />,
  base_contrast: <Sliders size={16} />,
  pulse_rate: <Repeat size={16} />,
  pulse_depth: <Activity size={16} />,
  strobe_freq: <Zap size={16} />,
  strobe_ms: <ZapOff size={16} />,
  drift_rate: <Wind size={16} />,
  warm_shift: <Thermometer size={16} />,
  jitter_amount: <Activity size={16} />,
  spark_mix: <Sun size={16} />,
  heat_rand: <Flame size={16} />,
  fire_cooling: <Thermometer size={16} />,
  rainbow_speed: <Repeat size={16} />,
};

export const StyleTuning: React.FC = () => {
  const { sections, updateParam, activePresetIndex } = useConfigStore();
  
  const presets = sections.filter(s => s.name.toLowerCase().startsWith('preset'));
  const activePreset = presets[activePresetIndex]; 
  const activeSectionIndex = sections.findIndex(s => s === activePreset);

  if (sections.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text)' }}>No configuration loaded.</div>;
  }

  if (!activePreset) return <div style={{ padding: '40px', color: 'var(--text)' }}>No active preset to tune.</div>;

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
        {STYLE_TUNING_ARGS.map((arg) => {
          const currentValue = getStyleTuningValue(activePreset.params, arg.key);
          return (
            <div key={arg.key} style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {TUNING_ARG_ICONS[arg.key]}
                  <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-h)' }}>{arg.label}</span>
                </div>
                <span style={{ fontSize: '13px', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)' }}>
                  {currentValue}
                </span>
              </div>

              <input
                type="range"
                min={arg.min}
                max={arg.max}
                step={arg.step}
                value={currentValue}
                onChange={(e) => updateParam(activeSectionIndex, arg.key, e.target.value)}
                style={{
                  width: '100%',
                  cursor: 'pointer',
                  accentColor: 'var(--accent)'
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
