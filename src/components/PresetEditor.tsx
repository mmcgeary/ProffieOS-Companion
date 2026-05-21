import React from 'react';
import { Music, Palette, Sliders, Type } from 'lucide-react';
import type { PresetConfig } from '../config/types';
import { serialManager } from '../serial/serialManager';
import { useConfigStore } from '../state/configStore';
import { BladeCanvas } from './BladeCanvas';
import { PresetList } from './PresetList';
import { STYLE_TUNING_ARGS, getStyleTuningValue, type StyleTuningKey } from './styleTuningConfig';

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

const COLORS: Record<string, string> = {
  Red: '65535,0,0',
  Green: '0,65535,0',
  Blue: '0,0,65535',
  White: '65535,65535,65535',
  Black: '0,0,0',
  Cyan: '0,65535,65535',
  Magenta: '65535,0,65535',
  Yellow: '65535,65535,0',
  Orange: '65535,42405,0',
  IceBlue: '38550,38550,65535',
  FireOrange: '65535,25700,0',
};

const ARG_INDEX_BY_TUNING_KEY: Partial<Record<StyleTuningKey, number>> = {
  flicker_depth: 17,
  flicker_speed: 18,
  stripe_width: 19,
  stripe_speed: 20,
  motion_gain: 21,
  noise_mix: 22,
  base_contrast: 23,
  drift_rate: 24,
  warm_shift: 25,
  jitter_amount: 26,
  spark_mix: 27,
  heat_rand: 28,
  fire_cooling: 29,
  rainbow_speed: 30,
};

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const resolveColor = (value: string): string => COLORS[value] || value;

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

const buildStyleString = (blade: PresetConfig['blades'][number]): string => {
  const args = new Array(31).fill('~');
  args[0] = `ini_${blade.style || 'standard'}`;
  args[1] = resolveColor(blade.params.base_color || 'Blue');
  args[2] = resolveColor(blade.params.alt_color || 'Cyan');
  args[5] = resolveColor(blade.params.blast_color || 'White');
  args[6] = resolveColor(blade.params.clash_color || 'White');
  args[7] = resolveColor(blade.params.lockup_color || 'White');
  args[12] = getStyleTuningValue(blade.params, 'ignition_time');
  args[13] = getStyleTuningValue(blade.params, 'retraction_time');

  Object.entries(ARG_INDEX_BY_TUNING_KEY).forEach(([key, index]) => {
    if (index === undefined) return;
    args[index] = getStyleTuningValue(blade.params, key as StyleTuningKey);
  });

  return args.join(' ');
};

export const PresetEditor: React.FC = () => {
  const {
    sections,
    doc,
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

  React.useEffect(() => {
    if (activeBladeIndex !== selectedBladeIndex) {
      setActiveBladeIndex(selectedBladeIndex);
    }
  }, [activeBladeIndex, selectedBladeIndex, setActiveBladeIndex]);

  React.useEffect(() => {
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
  }, []);

  React.useEffect(() => {
    const font = activePreset?.font?.trim();
    if (!font) {
      setSdTrackOptions([]);
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
  }, [activePreset?.font]);

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
  }, [activePreset?.font, presets, sdFontOptions]);

  const trackOptions = React.useMemo(() => {
    const values = new Set<string>();
    if (activePreset?.track) values.add(activePreset.track);
    sdTrackOptions.forEach((track) => {
      if (track) values.add(track);
    });
    return Array.from(values);
  }, [activePreset?.track, sdTrackOptions]);

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

  const refreshSectionsFromDoc = () => {
    setActiveBank(activeBank);
  };

  const styleString = buildStyleString(selectedBlade);

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
        onAddPreset={() => {
          addPreset();
          refreshSectionsFromDoc();
        }}
        onDeletePreset={(index) => {
          deletePreset(index);
          refreshSectionsFromDoc();
        }}
        onReorderPreset={(from, to) => {
          reorderPreset(from, to);
          refreshSectionsFromDoc();
        }}
      />

      <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
            {STYLE_TUNING_ARGS.map((arg) => {
              const value = getStyleTuningValue(selectedBlade.params, arg.key);
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
