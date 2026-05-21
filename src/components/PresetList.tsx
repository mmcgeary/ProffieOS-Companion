import React from 'react';

type PresetListItem = {
  name: string;
};

interface PresetListProps {
  presets: PresetListItem[];
  activePresetIndex: number;
  onSelectPreset: (index: number) => void;
  onAddPreset: () => void;
  onDeletePreset: (index: number) => void;
  onReorderPreset: (from: number, to: number) => void;
}

export const PresetList: React.FC<PresetListProps> = ({
  presets,
  activePresetIndex,
  onSelectPreset,
  onAddPreset,
  onDeletePreset,
  onReorderPreset,
}) => {
  const [dragSourceIndex, setDragSourceIndex] = React.useState<number | null>(null);
  const canDeletePreset = presets.length > 1;

  const handleDragStart = (index: number) => (event: React.DragEvent<HTMLButtonElement>) => {
    setDragSourceIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragEnd = () => {
    setDragSourceIndex(null);
  };

  const handleDrop = (targetIndex: number) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const fromTransfer = Number.parseInt(event.dataTransfer.getData('text/plain'), 10);
    const from = Number.isNaN(fromTransfer) ? dragSourceIndex : fromTransfer;
    if (from !== null && from !== targetIndex) {
      onReorderPreset(from, targetIndex);
    }
    setDragSourceIndex(null);
  };

  return (
    <aside style={{ borderRight: '1px solid var(--border)', paddingRight: '32px' }}>
      <h3
        style={{
          margin: '0 0 16px 0',
          fontSize: '13px',
          fontWeight: 600,
          textTransform: 'uppercase',
          color: 'var(--text)',
          letterSpacing: '0.05em',
        }}
      >
        Preset List
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {presets.map((preset, index) => (
          <div
            key={`${preset.name}-${index}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop(index)}
            style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr auto',
              gap: '8px',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '8px',
              background: activePresetIndex === index ? 'var(--accent-bg)' : 'transparent',
              border: activePresetIndex === index ? '1px solid var(--accent)' : '1px solid transparent',
            }}
          >
            <button
              type="button"
              aria-label="Drag preset"
              draggable
              onDragStart={handleDragStart(index)}
              onDragEnd={handleDragEnd}
              style={{
                width: '24px',
                height: '24px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'var(--bg)',
                color: 'var(--text)',
                cursor: 'grab',
                lineHeight: 1,
              }}
            >
              ⋮⋮
            </button>

            <button
              type="button"
              onClick={() => onSelectPreset(index)}
              style={{
                textAlign: 'left',
                padding: '10px',
                border: 'none',
                borderRadius: '6px',
                background: 'transparent',
                color: activePresetIndex === index ? 'var(--accent)' : 'var(--text-h)',
                cursor: 'pointer',
                fontWeight: activePresetIndex === index ? 600 : 400,
              }}
            >
              {preset.name || `Preset ${index + 1}`}
            </button>

            <button
              type="button"
              disabled={!canDeletePreset}
              onClick={(event) => {
                event.stopPropagation();
                onDeletePreset(index);
              }}
              style={{
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'var(--bg)',
                color: 'var(--text)',
                cursor: canDeletePreset ? 'pointer' : 'not-allowed',
                opacity: canDeletePreset ? 1 : 0.5,
                padding: '6px 10px',
                fontSize: '12px',
              }}
            >
              Delete
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onAddPreset}
          style={{
            marginTop: '8px',
            padding: '10px',
            borderRadius: '8px',
            border: '1px dashed var(--border)',
            background: 'transparent',
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          + Add Preset
        </button>
      </div>
    </aside>
  );
};
