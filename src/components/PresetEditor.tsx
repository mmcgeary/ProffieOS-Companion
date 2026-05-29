import React from 'react';
import { Music, Palette, Type } from 'lucide-react';
import type { ConfigBank, PresetConfig } from '../config/types';
import { serialManager } from '../serial/serialManager';
import { useConfigStore } from '../state/configStore';
import { BladeCanvas } from './BladeCanvas';
import { PresetList } from './PresetList';
import { buildStyleString, NAMED_COLORS } from './styleStringBuilder';
import {
  OFF_MODE_OPTIONS,
  getOffStateValue,
  getSchemaControlsForStyle,
} from './styleTuningConfig';

const ColorInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) => {
  const mode = value in NAMED_COLORS ? value : 'RGB';

  return (
    <div>
      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
        {label}
      </label>
      <select
        aria-label={label}
        value={mode}
        onChange={(e) => {
          const newMode = e.target.value;
          if (newMode !== 'RGB') {
            onChange(newMode);
          } else {
            onChange(NAMED_COLORS[mode] || '255,255,255');
          }
        }}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          color: 'var(--text-h)',
          marginBottom: mode === 'RGB' ? '8px' : '0',
        }}
      >
        {Object.keys(NAMED_COLORS).map(color => (
          <option key={color} value={color}>{color}</option>
        ))}
        <option value="RGB">RGB</option>
      </select>
      {mode === 'RGB' && (
        <input
          aria-label={`${label} Custom RGB`}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="R,G,B (0-65535)"
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--text-h)',
          }}
        />
      )}
    </div>
  );
};

const BUILTIN_STYLES = [
  { value: 'audio_flicker', label: 'Audio Flicker' },
  { value: 'hump_flicker', label: 'Hump Flicker' },
  { value: 'pulsing_stripes', label: 'Pulsing Stripes' },
  { value: 'energy', label: 'Energy' },
  { value: 'fire_unstable', label: 'Fire Unstable' },
  { value: 'plasma_blade', label: 'Plasma Blade' },
  { value: 'rainbow_blade', label: 'Rainbow Blade' },
  { value: 'energy_blade', label: 'Energy Blade' },
  { value: 'lava_blade', label: 'Lava Blade' },
  { value: 'sparkle_blade', label: 'Sparkle Blade' },
  { value: 'fire_blade', label: 'Fire Blade' },
  { value: 'pulse_accent', label: 'Pulse Accent' },
  { value: 'blink_accent', label: 'Blink Accent' },
  { value: 'random_blink_accent', label: 'Random Blink Accent' },
  { value: 'color_cycle_accent', label: 'Color Cycle Accent' },
  { value: 'film_blade', label: 'Film Blade' },
];

const DEFAULT_PARAM_VALUES: Record<string, string> = {
  base_color: 'Red',
  alt_color: 'White',
  alt_color2: 'Cyan',
  alt_color3: 'Magenta',
  blast_color: 'White',
  clash_color: 'White',
  lockup_color: 'White',
  drag_color: 'White',
  lb_color: 'White',
  stab_color: 'White',
  off_color: 'Black',
  ignition_time: '300',
  retraction_time: '200',
  flicker_mix: '12000',
  hump_amount: '12000',
  stripe_width: '5000',
  stripe_speed: '3000',
  pulse_rate: '1200',
  spark_mix: '5000',
  fire_mix: '5000',
  fire_cooling: '80',
  fire_sparking: '160',
  blink_ms: '50',
  blink_rate: '50',
  blink_duty: '16000',
  segment_size: '500',
  fade_ms: '100',
  noise_depth: '16000',
  on_size: '3000',
  on_rpm: '20',
  off_rpm: '10',
  inner_width: '4000',
  inner_speed: '2000',
  center_width: '2000',
  center_speed: '3000',
  edge_mix: '16000',
  plasma_width: '2000',
  plasma_speed: '3000',
  twist_amount: '3000',
  wave_speed: '2000',
  off_option: '1',
  inout_blink_ms: '50',
  inout_blink_rate: '50',
  inout_blink_duty: '16000',
  inout_pulse_rate: '1200'
};

const DIRECT_SCHEMA_PARAM_KEYS = new Set([
  'base_color',
  'alt_color',
  'blast_color',
  'clash_color',
  'lockup_color',
  'drag_color',
  'lb_color',
  'stab_color',
  'ignition_time',
  'retraction_time',
  'off_color',
]);

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
    let style = params[styleKey] || params.style || 'audio_flicker';

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
    boardSessionId,
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

  const globalSectionIndex = React.useMemo(
    () => sections.findIndex((s) => s.name.toLowerCase() === 'global'),
    [sections]
  );
  const globalLengthStr = doc?.shared.global[`blade${selectedBladeIndex + 1}_length`];
  const hwLength = doc?.hardwareProfile.bladeLengths?.[selectedBladeIndex];
  const currentBladeLength = globalLengthStr ? parseInt(globalLengthStr, 10) : (hwLength ?? 144);

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
  }, [isConnected, boardSessionId]);

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
  }, [activePreset?.font, isConnected, boardSessionId]);

  const fontOptions = React.useMemo(() => {
    const values = new Set<string>();
    sdFontOptions.forEach((font) => {
      if (font) values.add(font);
    });
    return Array.from(values).sort();
  }, [sdFontOptions]);

  const trackOptions = React.useMemo(() => {
    if (!activePreset?.font?.trim()) {
      return [];
    }
    const values = new Set<string>();
    sdTrackOptions.forEach((track) => {
      if (track) values.add(track);
    });
    return Array.from(values).sort();
  }, [activePreset?.font, sdTrackOptions]);

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
    activePreset.blades[0] || { style: 'audio_flicker', params: {}, styleParams: {} };

  const handlePresetFieldChange = (key: 'name' | 'font' | 'track', value: string) => {
    if (activeSectionIndex < 0) return;
    updateParam(activeSectionIndex, key, value);
  };

  const handleBladeFieldChange = (key: string, value: string) => {
    updateBladeParam(activePresetIndex, selectedBladeIndex, key, value);
  };

  const getSchemaControlValue = (key: string): string => {
    const normalizedKey = key.trim().toLowerCase();
    let val: string | undefined;
    if (DIRECT_SCHEMA_PARAM_KEYS.has(normalizedKey)) {
      val = selectedBlade.params[normalizedKey] ?? selectedBlade.styleParams?.[normalizedKey];
    } else {
      val = selectedBlade.styleParams?.[key] ?? selectedBlade.params[key];
    }
    return val ?? DEFAULT_PARAM_VALUES[normalizedKey] ?? '';
  };

  const handleSchemaControlChange = (key: string, value: string): void => {
    const normalizedKey = key.trim().toLowerCase();
    if (DIRECT_SCHEMA_PARAM_KEYS.has(normalizedKey)) {
      handleBladeFieldChange(normalizedKey, value);
      return;
    }
    handleBladeFieldChange(`param.${key}`, value);
  };

  const styleString = buildStyleString(selectedBlade);
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <label htmlFor="bladeLengthInput">Length:</label>
              <input
                id="bladeLengthInput"
                type="number"
                min="1"
                max="999"
                value={currentBladeLength}
                onChange={(e) => {
                  const val = e.target.value;
                  if (globalSectionIndex >= 0) {
                    updateParam(globalSectionIndex, `blade${selectedBladeIndex + 1}_length`, val);
                  }
                }}
                onBlur={(e) => {
                  const val = e.target.value;
                  if (isConnected && val) {
                    serialManager.writeCommand(`set_blade_length ${selectedBladeIndex + 1} ${val}`).catch(console.error);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                style={{
                  width: '60px',
                  padding: '4px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                }}
              />
            </div>
          </div>
          <BladeCanvas styleString={styleString} numLeds={currentBladeLength} />
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
                  {activePreset.font && !fontOptions.includes(activePreset.font) && (
                    <option value={activePreset.font}>{activePreset.font} (Not on SD)</option>
                  )}
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
                  {trackOptions.length === 0 && <option value="">No tracks found in font</option>}
                  {activePreset.track && !trackOptions.includes(activePreset.track) && (
                    <option value={activePreset.track}>{activePreset.track} (Not on SD)</option>
                  )}
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
                  value={selectedBlade.style || 'audio_flicker'}
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

              {basicControls.length > 0 && (
                <div data-testid="basic-style-controls" style={{ gridColumn: '1 / -1' }}>
                  <h4 style={{ margin: '8px 0', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text)' }}>
                    Basic Style Controls
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {basicControls.map((ctrl) => (
                      <React.Fragment key={ctrl.key}>
                        {ctrl.key.match(/_color\d*$/) ? (
                          <ColorInput
                            label={ctrl.label}
                            value={getSchemaControlValue(ctrl.key)}
                            onChange={(val) => handleSchemaControlChange(ctrl.key, val)}
                          />
                        ) : (
                          <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                              {ctrl.label}
                            </label>
                            <input
                              type="text"
                              value={getSchemaControlValue(ctrl.key)}
                              onChange={(event) => handleSchemaControlChange(ctrl.key, event.target.value)}
                              style={SCHEMA_CONTROL_INPUT_STYLE}
                            />
                          </div>
                        )}
                      </React.Fragment>
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
                      <React.Fragment key={ctrl.key}>
                        {ctrl.key.match(/_color\d*$/) ? (
                          <ColorInput
                            label={ctrl.label}
                            value={getSchemaControlValue(ctrl.key)}
                            onChange={(val) => handleSchemaControlChange(ctrl.key, val)}
                          />
                        ) : (
                          <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                              {ctrl.label}
                            </label>
                            <input
                              type="text"
                              value={getSchemaControlValue(ctrl.key)}
                              onChange={(event) => handleSchemaControlChange(ctrl.key, event.target.value)}
                              style={SCHEMA_CONTROL_INPUT_STYLE}
                            />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </details>
              )}

              <div style={{ gridColumn: '1 / -1' }}>
                <h4 style={{ margin: '8px 0', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text)' }}>
                  Off-State Behavior
                </h4>
              </div>

              <ColorInput
                label="Off Color"
                value={getOffStateValue(selectedBlade.params, 'off_color')}
                onChange={(val) => handleBladeFieldChange('off_color', val)}
              />

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


      </section>
    </div>
  );
};
