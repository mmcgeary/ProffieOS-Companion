import React from 'react';
import { useConfigStore } from '../state/configStore';
import { BladeCanvas } from './BladeCanvas';
import { Sliders, Thermometer, Wind, Music, Type, Folder, Palette } from 'lucide-react';

export const PresetEditor: React.FC = () => {
  const { sections, updateParam, loadSample, addPreset, activePresetIndex, setActivePresetIndex } = useConfigStore();
  
  const presets = sections.filter(s => s.name.toLowerCase().startsWith('preset'));
  const activePreset = presets[activePresetIndex];
  const activeSectionIndex = sections.findIndex(s => s === activePreset);

  if (sections.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text)' }}>
        <p style={{ fontSize: '18px', marginBottom: '20px' }}>No configuration loaded.</p>
        <button 
          onClick={loadSample}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: '1px solid var(--accent)',
            background: 'var(--accent-bg)',
            color: 'var(--accent)',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Load Sample Config
        </button>
      </div>
    );
  }

  if (!activePreset) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>No presets found in configuration.</div>;
  }

  const handleParamChange = (key: string, value: string) => {
    updateParam(activeSectionIndex, key, value);
  };

  // ProffieOS 8.x Argument-style color mapping (0-65535)
  const COLORS: Record<string, string> = {
    'Red': '65535,0,0',
    'Green': '0,65535,0',
    'Blue': '0,0,65535',
    'White': '65535,65535,65535',
    'Black': '0,0,0',
    'Cyan': '0,65535,65535',
    'Magenta': '65535,0,65535',
    'Yellow': '65535,65535,0',
    'Orange': '65535,42405,0',
    'IceBlue': '38550,38550,65535',
    'FireOrange': '65535,25700,0',
  };

  const resolveColor = (c: string) => COLORS[c] || c;

  // Real ProffieOS 8.x Style String Builder
  const buildStyleString = () => {
    const args = new Array(31).fill('~');
    const styleName = activePreset.params.style || 'standard';
    args[0] = `ini_${styleName}`;
    
    // ProffieOS 8.x Argument Mapping (from ini_style_arg_ids.h)
    args[1] = resolveColor(activePreset.params.base_color || 'Blue');
    args[2] = resolveColor(activePreset.params.alt_color || 'Cyan');
    args[5] = resolveColor(activePreset.params.blast_color || 'White');
    args[6] = resolveColor(activePreset.params.clash_color || 'White');
    args[7] = resolveColor(activePreset.params.lockup_color || 'White');
    
    args[12] = activePreset.params.ignition_time || '300';
    args[13] = activePreset.params.retraction_time || '800';
    
    args[17] = activePreset.params.flicker_depth || '12000';
    args[18] = activePreset.params.flicker_speed || '1000';
    args[19] = activePreset.params.stripe_width || '5000';
    args[20] = activePreset.params.stripe_speed || '900';
    args[21] = activePreset.params.motion_gain || '4096';
    args[22] = activePreset.params.noise_mix || '8000';
    args[23] = activePreset.params.base_contrast || '32768';
    args[24] = activePreset.params.drift_rate || '600';
    args[25] = activePreset.params.warm_shift || '2000';
    args[26] = activePreset.params.jitter_amount || '50';
    args[27] = activePreset.params.spark_mix || '5000';
    args[28] = activePreset.params.heat_rand || '4500';
    args[29] = activePreset.params.fire_cooling || '55';
    args[30] = activePreset.params.rainbow_speed || '800';

    return args.join(' ');
  };

  const styleString = buildStyleString();

  // Full list of ProffieOS 8.x Built-in Style Templates (OUR styles)
  const BUILTIN_STYLES = [
    { value: 'standard', label: 'Standard (Pulsing)' },
    { value: 'humpflicker', label: 'Hump Flicker' },
    { value: 'unstable', label: 'Unstable (BrownNoise)' },
    { value: 'fire', label: 'Fire Blade' },
    { value: 'rainbow', label: 'Rainbow' },
    { value: 'strobe', label: 'Stroboscope' },
    { value: 'pulse', label: 'Pulse' },
    { value: 'rotoscope', label: 'Rotoscope' },
    { value: 'ghostly', label: 'Ghostly' },
    { value: 'lightning', label: 'Lightning' },
    { value: 'darksaber', label: 'Darksaber' },
    { value: 'kylo', label: 'Kylo Ren' },
    { value: 'prequels', label: 'Prequels (Audio Flicker)' },
    { value: 'sequels', label: 'Sequels (Audio Flicker)' },
    { value: 'ancient', label: 'Ancient' },
  ];

  const styleName = activePreset.params.style || 'standard';

  const ALL_TUNING_ARGS = [
    { key: 'flicker_speed', label: 'Pulse Frequency (RPM)', min: 0, max: 200, step: 5, icon: <Wind size={14} />, styles: ['standard', 'humpflicker', 'unstable', 'pulse', 'ghostly', 'kylo'] },
    { key: 'flicker_depth', label: 'Flicker/Pulse Depth', min: 0, max: 32768, step: 100, icon: <Thermometer size={14} />, styles: ['standard', 'humpflicker', 'unstable', 'ghostly', 'kylo', 'sequels', 'prequels'] },
    { key: 'ignition_time', label: 'Ignition Time (ms)', min: 50, max: 3000, step: 50, icon: <Sliders size={14} />, styles: ['all'] },
    { key: 'retraction_time', label: 'Retraction Time (ms)', min: 50, max: 3000, step: 50, icon: <Sliders size={14} />, styles: ['all'] },
    { key: 'noise_mix', label: 'Instability / Noise', min: 0, max: 32768, step: 100, icon: <Wind size={14} />, styles: ['unstable', 'ghostly', 'lightning', 'kylo', 'sequels'] },
    { key: 'base_contrast', label: 'Contrast (Black vs Alt)', min: 0, max: 32768, step: 100, icon: <Thermometer size={14} />, styles: ['standard', 'humpflicker', 'rotoscope', 'ghostly', 'darksaber', 'prequels', 'ancient'] },
    { key: 'stripe_width', label: 'Stripe Width', min: 100, max: 40000, step: 500, icon: <Sliders size={14} />, styles: ['rainbow', 'rotoscope', 'darksaber', 'ancient'] },
    { key: 'stripe_speed', label: 'Stripe Speed', min: 0, max: 20000, step: 100, icon: <Wind size={14} />, styles: ['rainbow', 'rotoscope', 'darksaber', 'ancient'] },
    { key: 'rainbow_speed', label: 'Rainbow Speed', min: 0, max: 5000, step: 100, icon: <Wind size={14} />, styles: ['rainbow'] },
    { key: 'fire_cooling', label: 'Fire Cooling', min: 10, max: 200, step: 1, icon: <Thermometer size={14} />, styles: ['fire'] },
  ];

  const activeTuningArgs = ALL_TUNING_ARGS.filter(arg => 
    arg.styles.includes('all') || arg.styles.includes(styleName.toLowerCase())
  );

  return (
    <div className="preset-editor" style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '40px' }}>
      
      {/* Sidebar: Preset List */}
      <aside style={{ borderRight: '1px solid var(--border)', paddingRight: '40px' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text)' }}>Preset List</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {presets.map((p, i) => (
            <button 
              key={i}
              onClick={() => setActivePresetIndex(i)}
              style={{
                textAlign: 'left',
                padding: '12px 15px',
                borderRadius: '8px',
                border: activePresetIndex === i ? '1px solid var(--accent)' : '1px solid transparent',
                background: activePresetIndex === i ? 'var(--accent-bg)' : 'transparent',
                color: activePresetIndex === i ? 'var(--accent)' : 'var(--text-h)',
                cursor: 'pointer',
                fontWeight: activePresetIndex === i ? 600 : 400,
                fontSize: '15px'
              }}
            >
              {p.params.name || `Preset ${i+1}`}
            </button>
          ))}
          <button 
            onClick={addPreset}
            style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '14px' }}>
            + Add Preset
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        
        {/* Real-time Visualizer Header */}
        <div style={{ background: 'var(--code-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Type size={18} color="var(--accent)" />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{activePreset.params.name || 'Unnamed Preset'}</h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500, background: 'var(--bg)', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--border)' }}>PIXEL-PERFECT RENDER</span>
          </div>
          <BladeCanvas styleString={styleString} numLeds={144} />
          
          {/* Quick Tuning Sliders */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '30px', paddingTop: '25px', borderTop: '1px solid var(--border)' }}>
            {activeTuningArgs.map((arg) => (
              <div key={arg.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '5px' }}>{arg.icon} {arg.label}</span>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{activePreset.params[arg.key] || (arg.key.includes('time') ? '300' : '0')}</span>
                </div>
                <input 
                  type="range"
                  min={arg.min}
                  max={arg.max}
                  step={arg.step}
                  value={activePreset.params[arg.key] || (arg.key.includes('time') ? '300' : '0')}
                  onChange={(e) => handleParamChange(arg.key, e.target.value)}
                  style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent)' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Configuration Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          {/* Identity Card */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '25px', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Music size={16} /> Identity & Sound
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Name</label>
                <input type="text" value={activePreset.params.name || ''} onChange={(e) => handleParamChange('name', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Font Path</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" value={activePreset.params.font || ''} onChange={(e) => handleParamChange('font', e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }} />
                  <button style={{ padding: '0 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)' }}><Folder size={16} /></button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Track</label>
                <input type="text" value={activePreset.params.track || ''} onChange={(e) => handleParamChange('track', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }} />
              </div>
            </div>
          </div>

          {/* Visual Style Card */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '25px', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Palette size={16} /> Blade Appearance
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Base Logic</label>
                <select value={activePreset.params.style || 'standard'} onChange={(e) => handleParamChange('style', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }}>
                  {BUILTIN_STYLES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Base Color</label>
                  <input type="text" value={activePreset.params.base_color || ''} onChange={(e) => handleParamChange('base_color', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Alt Color</label>
                  <input type="text" value={activePreset.params.alt_color || ''} onChange={(e) => handleParamChange('alt_color', e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
