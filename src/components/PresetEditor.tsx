import React from 'react';
import { Music, Palette, Sliders, Type } from 'lucide-react';
import type { ConfigBank, PresetConfig } from '../config/types';
import { serialManager } from '../serial/serialManager';
import { useConfigStore } from '../state/configStore';
import { BladeCanvas } from './BladeCanvas';
import { PresetList } from './PresetList';
import { buildStyleString } from './styleStringBuilder';
import {
  OFF_MODE_OPTIONS,
  getOffStateValue,
  getSchemaControlsForStyle,
  getStyleTuningValue,
  getVisibleStyleTuningArgs,
  type StyleTuningKey,
} from './styleTuningConfig';

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

const COLOR_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'base_color', label: 'Base Color' },
  { key: 'alt_color', label: 'Alt Color' },
  { key: 'blast_color', label: 'Blast Color' },
  { key: 'clash_color', label: 'Clash Color' },
  { key: 'lockup_color', label: 'Lockup Color' },
];

const SCHEMA_CONTROL_INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text-h)',
};

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const createLegacyPreset = (
  params: Record<string, string>,
  bladeCount: number,
): PresetConfig => {
  const blades = Array.from({ length: bladeCount }, (_, bladeIndex) => {
    const bladeOrdinal = bladeIndex + 1;
    const styleKey = `blade${bladeOrdinal}_style`;
    const prefix = `blade${bladeOrdinal}_`;
    const bladeParams: Record<string, string> = {};
    let style = params[styleKey] || params.style || 'standard';

    Object.entries(params).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.startsWith(prefix.toLowerCase())) {
        const field = key.slice(prefix.length);
        if (field.toLowerCase() === 'style') {
          style = value;
        } else {
          bladeParams[field] = value;
        }
        return;
      }

      if (
        bladeIndex === 0 &&
        !lowerKey.startsWith('blade') &&
        lowerKey !== 'name' &&
        lowerKey !== 'font' &&
        lowerKey !== 'track' &&
        lowerKey !== 'style'
      ) {
        bladeParams[key] = value;
      }
    });

    return { style, params: bladeParams };
  });

  return {
    name: params.name || '',
    font: params.font || '',
    track: params.track || '',
    blades,
  };
};

export const PresetEditor: React.FC = () => {
  const {
    sections,
    doc,
    isConnected,
    activeBank,
    activePresetIndex,
    activeBladeIndex,
    updateParam,
    updateBladeParam,
    loadSample,
    addPreset,
    reorderPreset,
    deletePreset,
    setActiveBank,
    setActivePresetIndex,
    setActiveBladeIndex,
  } = useConfigStore();

  const [sdFontOptions, setSdFontOptions] = React.useState<string[]>([]);
  const [sdTrackOptions, setSdTrackOptions] = React.useState<string[]>([]);

  const presetSections = React.useMemo(
    () =>
      sections
        .map((section, index) => ({ section, index }))
        .filter(({ section }) => section.name.toLowerCase().startsWith('preset')),
    [sections],
  );

  const fallbackBladeCount = Math.max(1, doc?.hardwareProfile.numBlades ?? 1);
  const fallbackPresets = React.useMemo(
    () => presetSections.map(({ section }) => createLegacyPreset(section.params, fallbackBladeCount)),
    [fallbackBladeCount, presetSections],
  );
  const presets = doc ? doc.banks[activeBank].presets : fallbackPresets;
  const activePreset = presets[activePresetIndex];
  const bladeCount = Math.max(1, doc?.hardwareProfile.numBlades ?? activePreset?.blades.length ?? 1);
  const selectedBladeIndex = clamp(activeBladeIndex, 0, bladeCount - 1);
  const activeSectionIndex = presetSections[activePresetIndex]?.index ?? -1;
  const showBankSelector = Boolean(doc?.hardwareProfile.hasBladeDetect);

  const handleBankChange = (value: string) => {
    if (value === 'blade_in' || value === 'blade_out') {
      setActiveBank(value as ConfigBank);
    }
  };

  React.useEffect(() => {
    if (activeBladeIndex !== selectedBladeIndex) {
      setActiveBladeIndex(selectedBladeIndex);
    }
  }, [activeBladeIndex, selectedBladeIndex, setActiveBladeIndex]);

  React.useEffect(() => {
    if (!isConnected) {
      return;
    }

    let cancelled = false;
    void serialManager
      .listFonts()
      .then((fonts) => {
        if (!cancelled) setSdFontOptions(fonts);
      })
      .catch(() => {
        if (!cancelled) setSdFontOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isConnected]);

  React.useEffect(() => {
    if (!isConnected) {
      return;
    }

    const font = activePreset?.font?.trim();
    if (!font) {
      return;
    }

    let cancelled = false;
    void serialManager
      .listTracks(font)
      .then((tracks) => {
        if (!cancelled) setSdTrackOptions(tracks);
      })
      .catch(() => {
        if (!cancelled) setSdTrackOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activePreset?.font, isConnected]);

  const fontOptions = React.useMemo(() => {
    const values = new Set<string>();
    presets.forEach((preset) => {
      if (preset.font) values.add(preset.font);
    });
    sdFontOptions.forEach((font) => {
      if (font) values.add(font);
    });
    if (activePreset?.font) values.add(activePreset.font);
    return Array.from(values);
  }, [activePreset, presets, sdFontOptions]);

  const trackOptions = React.useMemo(() => {
    if (!activePreset?.font?.trim()) {
      return [];
    }
    const values = new Set<string>();
    if (activePreset?.track) values.add(activePreset.track);
    sdTrackOptions.forEach((track) => {
      if (track) values.add(track);
    });
    return Array.from(values);
  }, [activePreset, sdTrackOptions]);

  if (sections.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text)' }}>
        <p style={{ fontSize: '18px', marginBottom: '20px' }}>No configuration loaded.</p>
        <button
          onClick={() => {
            void loadSample();
          }}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: '1px solid var(--accent)',
            background: 'var(--accent-bg)',
            color: 'var(--accent)',
            cursor: 'pointer',
            fontWeight: 600,
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

  const selectedBlade =
    activePreset.blades[selectedBladeIndex] ||
    activePreset.blades[0] || { style: 'standard', params: {} };

  const handlePresetFieldChange = (key: 'name' | 'font' | 'track', value: string) => {
    if (activeSectionIndex < 0) return;
    updateParam(activeSectionIndex, key, value);
  };

  const handleBladeFieldChange = (key: string, value: string) => {
    updateBladeParam(activePresetIndex, selectedBladeIndex, key, value);
  };

  const styleString = buildStyleString(selectedBlade);
  const visibleStyleTuningArgs = getVisibleStyleTuningArgs(selectedBlade.style, selectedBlade.params);
  const schemaControls = getSchemaControlsForStyle(selectedBlade.style);
  const controlGroups: Record<'basic' | 'advanced', typeof schemaControls> = { basic: [], advanced: [] };
  for (const control of schemaControls) {
    controlGroups[control.uiLevel].push(control);
  }
  const basicControls = controlGroups.basic;
  const advancedControls = controlGroups.advanced;

  return (
    <div
      className="preset-editor"
      style={{
        padding: '32px',
        maxWidth: '1500px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '32px',
      }}
    >
      <PresetList
        presets={presets.map((preset) => ({ name: preset.name }))}
        activePresetIndex={activePresetIndex}
        onSelectPreset={setActivePresetIndex}
        onAddPreset={addPreset}
        onDeletePreset={deletePreset}
        onReorderPreset={reorderPreset}
      />

      <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {showBankSelector && (
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              padding: '12px 16px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: 'fit-content',
            }}
          >
            <label htmlFor="config-bank-select" style={{ fontSize: '13px', fontWeight: 600 }}>
              Config Bank
            </label>
            <select
              id="config-bank-select"
              aria-label="Config Bank"
              value={activeBank}
              onChange={(event) => handleBankChange(event.target.value)}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text-h)',
              }}
            >
              <option value="blade_in">blade_in</option>
              <option value="blade_out">blade_out</option>
            </select>
          </div>
        )}

        <div
          style={{
            background: 'var(--code-bg)',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Type size={18} color="var(--accent)" />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                {activePreset.name || 'Unnamed Preset'}
              </h2>
            </div>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--text)',
                fontWeight: 500,
                background: 'var(--bg)',
                padding: '4px 10px',
                borderRadius: '20px',
                border: '1px solid var(--border)',
              }}
            >
              PIXEL-PERFECT RENDER
            </span>
          </div>
          <BladeCanvas styleString={styleString} numLeds={144} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px' }}>
            <h3
              style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Music size={16} /> Identity & Sound
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Name</label>
                <input
                  type="text"
                  value={activePreset.name || ''}
                  onChange={(event) => handlePresetFieldChange('name', event.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Font</label>
                <select
                  value={activePreset.font || ''}
                  onChange={(event) => handlePresetFieldChange('font', event.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                  }}
                >
                  {fontOptions.length === 0 && <option value="">No SD fonts found</option>}
                  {fontOptions.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Track</label>
                <select
                  value={activePreset.track || ''}
                  onChange={(event) => handlePresetFieldChange('track', event.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                  }}
                >
                  {trackOptions.length === 0 && <option value="">No SD tracks found</option>}
                  {trackOptions.map((track) => (
                    <option key={track} value={track}>
                      {track}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px' }}>
            <h3
              style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Palette size={16} /> Per-Blade Style Controls
            </h3>

            <div role="tablist" aria-label="Blade editors" style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {Array.from({ length: bladeCount }, (_, bladeIndex) => (
                <button
                  key={bladeIndex}
                  type="button"
                  role="tab"
                  aria-selected={selectedBladeIndex === bladeIndex}
                  onClick={() => setActiveBladeIndex(bladeIndex)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: selectedBladeIndex === bladeIndex ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: selectedBladeIndex === bladeIndex ? 'var(--accent-bg)' : 'var(--bg)',
                    color: selectedBladeIndex === bladeIndex ? 'var(--accent)' : 'var(--text)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Blade {bladeIndex + 1}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Base Logic</label>
                <select
                  value={selectedBlade.style || 'standard'}
                  onChange={(event) => handleBladeFieldChange('style', event.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                  }}
                >
                  {BUILTIN_STYLES.map((style) => (
                    <option key={style.value} value={style.value}>
                      {style.label}
                    </option>
                  ))}
                </select>
              </div>

              {COLOR_FIELDS.map((field) => (
                <div key={field.key}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={selectedBlade.params[field.key] || ''}
                    onChange={(event) => handleBladeFieldChange(field.key, event.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text-h)',
                    }}
                  />
                </div>
              ))}

              {basicControls.length > 0 && (
                <div data-testid="basic-style-controls" style={{ gridColumn: '1 / -1' }}>
                  <h4 style={{ margin: '8px 0', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text)' }}>
                    Basic Style Controls
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {basicControls.map((ctrl) => (
                      <div key={ctrl.key}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                          {ctrl.label}
                        </label>
                        <input
                          type="text"
                          value={selectedBlade.params[ctrl.key] || ''}
                          onChange={(event) => handleBladeFieldChange(ctrl.key, event.target.value)}
                          style={SCHEMA_CONTROL_INPUT_STYLE}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {advancedControls.length > 0 && (
                <details data-testid="advanced-style-controls" style={{ gridColumn: '1 / -1' }}>
                  <summary style={{ margin: '8px 0', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>
                    Advanced Style Controls
                  </summary>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                    {advancedControls.map((ctrl) => (
                      <div key={ctrl.key}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                          {ctrl.label}
                        </label>
                        <input
                          type="text"
                          value={selectedBlade.params[ctrl.key] || ''}
                          onChange={(event) => handleBladeFieldChange(ctrl.key, event.target.value)}
                          style={SCHEMA_CONTROL_INPUT_STYLE}
                        />
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <div style={{ gridColumn: '1 / -1' }}>
                <h4 style={{ margin: '8px 0', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text)' }}>
                  Off-State Behavior
                </h4>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Off Color</label>
                <input
                  aria-label="Off Color"
                  type="text"
                  value={getOffStateValue(selectedBlade.params, 'off_color')}
                  onChange={(event) => handleBladeFieldChange('off_color', event.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Off Mode</label>
                <select
                  aria-label="Off Mode"
                  value={getOffStateValue(selectedBlade.params, 'off_mode')}
                  onChange={(event) => handleBladeFieldChange('off_mode', event.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                  }}
                >
                  {OFF_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Off Rate (ms)</label>
                <input
                  aria-label="Off Rate (ms)"
                  type="number"
                  min={10}
                  max={60000}
                  step={10}
                  value={getOffStateValue(selectedBlade.params, 'off_rate_ms')}
                  onChange={(event) => handleBladeFieldChange('off_rate_ms', event.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text-h)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px' }}>
          <h3
            style={{
              margin: '0 0 16px 0',
              fontSize: '14px',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Sliders size={16} /> Full Tuning Arguments
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {visibleStyleTuningArgs.map((arg) => {
            const value = getStyleTuningValue(selectedBlade.params, arg.key as StyleTuningKey);
              return (
                <div key={arg.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{arg.label}</label>
                    <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{value}</span>
                  </div>
                  <input
                    type="range"
                    min={arg.min}
                    max={arg.max}
                    step={arg.step}
                    value={value}
                    onChange={(event) => handleBladeFieldChange(arg.key, event.target.value)}
                    style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent)' }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
