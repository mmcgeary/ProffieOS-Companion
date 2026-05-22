# Off-State Blade Behavior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose per-blade off-state controls in the companion app and wire them into preview style rendering while preserving canonical `bladeN_off_*` persistence.

**Architecture:** Add metadata-driven off-state helpers beside the existing style tuning metadata, then move preview style-string assembly into a focused helper so argument-position tests stay stable. Update PresetEditor to render always-visible off-state controls per blade and persist edits through existing `updateBladeParam` flow.

**Tech Stack:** React 19, TypeScript, Zustand, Vitest, Testing Library.

---

## File Structure (locked before implementation)

### Companion (`/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform`)

- Modify: `src/components/styleTuningConfig.ts`  
  Responsibility: define off-state defaults/metadata and conversion helpers (`off_mode` selector + rate clamp).
- Modify: `src/components/styleTuningConfig.test.ts`  
  Responsibility: assert off-state helper defaults and mode mapping behavior.
- Create: `src/components/styleStringBuilder.ts`  
  Responsibility: build preview style strings, including off-state argument positions (14/15/16).
- Create: `src/components/styleStringBuilder.test.ts`  
  Responsibility: enforce style-string argument order and off-state wiring contract.
- Modify: `src/components/PresetEditor.tsx`  
  Responsibility: render per-blade off-state controls and consume shared style-string builder.
- Modify: `src/components/presetUiIntegration.test.tsx`  
  Responsibility: validate off-state controls render and update per-blade state.

---

### Task 1: Add off-state metadata + helper utilities

**Files:**
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/components/styleTuningConfig.ts`
- Test: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/components/styleTuningConfig.test.ts`

- [x] **Step 1: Write failing helper tests for off-state defaults and mode mapping**

```ts
// styleTuningConfig.test.ts
import {
  getOffModeSelectorValue,
  getOffStateDefault,
  getOffStateRateMsValue,
  getOffStateValue,
} from './styleTuningConfig';

it('returns off-state defaults when values are missing', () => {
  expect(getOffStateDefault('off_color')).toBe('Black');
  expect(getOffStateDefault('off_mode')).toBe('pulse');
  expect(getOffStateDefault('off_rate_ms')).toBe('1200');
  expect(getOffStateValue({}, 'off_color')).toBe('Black');
});

it('maps off_mode to firmware selector values', () => {
  expect(getOffModeSelectorValue('pulse')).toBe('1');
  expect(getOffModeSelectorValue('random')).toBe('2');
  expect(getOffModeSelectorValue('invalid')).toBe('1');
});

it('clamps off_rate_ms to firmware bounds', () => {
  expect(getOffStateRateMsValue({ off_rate_ms: '5' })).toBe('10');
  expect(getOffStateRateMsValue({ off_rate_ms: '1200' })).toBe('1200');
  expect(getOffStateRateMsValue({ off_rate_ms: '999999' })).toBe('60000');
});
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
npm test -- src/components/styleTuningConfig.test.ts
```

Expected: FAIL with missing exports (`getOffStateDefault`, `getOffModeSelectorValue`, etc.).

- [x] **Step 3: Implement off-state metadata + helpers in styleTuningConfig**

```ts
// styleTuningConfig.ts
const OFF_STATE_BOUNDS = {
  off_rate_ms: { min: 10, max: 60000 },
} as const;

export const OFF_MODE_OPTIONS = [
  { value: 'pulse', label: 'Pulse' },
  { value: 'random', label: 'Random' },
] as const;

export type OffStateKey = 'off_color' | 'off_mode' | 'off_rate_ms';

const OFF_STATE_DEFAULTS: Record<OffStateKey, string> = {
  off_color: 'Black',
  off_mode: 'pulse',
  off_rate_ms: '1200',
};

export const getOffStateDefault = (key: OffStateKey): string => OFF_STATE_DEFAULTS[key];

export const getOffStateValue = (
  params: Record<string, string> | undefined,
  key: OffStateKey,
): string => {
  const value = params?.[key];
  return value !== undefined && value !== '' ? value : getOffStateDefault(key);
};

export const getOffModeSelectorValue = (mode: string | undefined): string =>
  (mode ?? '').trim().toLowerCase() === 'random' ? '2' : '1';

export const getOffStateRateMsValue = (params: Record<string, string> | undefined): string => {
  const raw = getOffStateValue(params, 'off_rate_ms');
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return OFF_STATE_DEFAULTS.off_rate_ms;
  const clamped = Math.min(OFF_STATE_BOUNDS.off_rate_ms.max, Math.max(OFF_STATE_BOUNDS.off_rate_ms.min, parsed));
  return String(clamped);
};
```

- [x] **Step 4: Run tests to verify pass**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
npm test -- src/components/styleTuningConfig.test.ts
```

Expected: PASS for the new off-state helper coverage.

- [x] **Step 5: Commit**

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
git add src/components/styleTuningConfig.ts src/components/styleTuningConfig.test.ts
git commit -m "feat(ui): add off-state metadata helpers"
```

---

### Task 2: Wire off-state values into preview style-string builder

**Files:**
- Create: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/components/styleStringBuilder.ts`
- Test: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/components/styleStringBuilder.test.ts`
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/components/PresetEditor.tsx`

- [x] **Step 1: Write failing builder tests for off-state arg positions (14/15/16)**

```ts
// styleStringBuilder.test.ts
import { describe, expect, it } from 'vitest';
import { buildStyleString } from './styleStringBuilder';

describe('styleStringBuilder', () => {
  it('emits off-state defaults at args 14/15/16', () => {
    const style = buildStyleString({
      style: 'standard',
      params: { base_color: 'Blue', alt_color: 'Cyan' },
    });
    const tokens = style.split(' ');
    expect(tokens[14]).toBe('0,0,0');
    expect(tokens[15]).toBe('1');
    expect(tokens[16]).toBe('1200');
  });

  it('emits explicit off-state values and clamps off_rate_ms', () => {
    const style = buildStyleString({
      style: 'standard',
      params: {
        base_color: 'Blue',
        alt_color: 'Cyan',
        off_color: 'Red',
        off_mode: 'random',
        off_rate_ms: '65000',
      },
    });
    const tokens = style.split(' ');
    expect(tokens[14]).toBe('65535,0,0');
    expect(tokens[15]).toBe('2');
    expect(tokens[16]).toBe('60000');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
npm test -- src/components/styleStringBuilder.test.ts
```

Expected: FAIL because `styleStringBuilder.ts` does not exist.

- [x] **Step 3: Implement shared style-string builder**

```ts
// styleStringBuilder.ts
import type { PresetConfig } from '../config/types';
import {
  getOffModeSelectorValue,
  getOffStateRateMsValue,
  getOffStateValue,
  getStyleTuningValue,
  type StyleTuningKey,
} from './styleTuningConfig';

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

const resolveColor = (value: string): string => COLORS[value] || value;

export const buildStyleString = (blade: PresetConfig['blades'][number]): string => {
  const args = new Array(31).fill('~');
  args[0] = `ini_${blade.style || 'standard'}`;
  args[1] = resolveColor(blade.params.base_color || 'Blue');
  args[2] = resolveColor(blade.params.alt_color || 'Cyan');
  args[5] = resolveColor(blade.params.blast_color || 'White');
  args[6] = resolveColor(blade.params.clash_color || 'White');
  args[7] = resolveColor(blade.params.lockup_color || 'White');
  args[12] = getStyleTuningValue(blade.params, 'ignition_time');
  args[13] = getStyleTuningValue(blade.params, 'retraction_time');
  args[14] = resolveColor(getOffStateValue(blade.params, 'off_color'));
  args[15] = getOffModeSelectorValue(getOffStateValue(blade.params, 'off_mode'));
  args[16] = getOffStateRateMsValue(blade.params);

  Object.entries(ARG_INDEX_BY_TUNING_KEY).forEach(([key, index]) => {
    if (index === undefined) return;
    args[index] = getStyleTuningValue(blade.params, key as StyleTuningKey);
  });

  return args.join(' ');
};
```

- [x] **Step 4: Use shared builder in PresetEditor**

```ts
// PresetEditor.tsx (imports)
import { buildStyleString } from './styleStringBuilder';
```

```ts
// PresetEditor.tsx (remove local buildStyleString/COLORS/ARG_INDEX_BY_TUNING_KEY)
// keep call-site unchanged:
const styleString = buildStyleString(selectedBlade);
```

- [x] **Step 5: Run tests to verify pass**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
npm test -- src/components/styleStringBuilder.test.ts src/components/styleTuningConfig.test.ts
```

Expected: PASS with off-state preview arg mapping covered.

- [x] **Step 6: Commit**

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
git add src/components/styleStringBuilder.ts src/components/styleStringBuilder.test.ts src/components/PresetEditor.tsx
git commit -m "feat(ui): wire off-state args into preview style builder"
```

---

### Task 3: Expose per-blade off-state controls in PresetEditor

**Files:**
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/components/PresetEditor.tsx`
- Test: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/components/presetUiIntegration.test.tsx`

- [x] **Step 1: Write failing integration test for off-state controls + per-blade updates**

```tsx
// presetUiIntegration.test.tsx
it('renders off-state controls and updates selected blade off-state params', () => {
  render(<PresetEditor />);

  const offModeSelect = screen.getByLabelText('Off Mode');
  const offRateInput = screen.getByLabelText('Off Rate (ms)');
  expect(offModeSelect).toBeTruthy();
  expect(offRateInput).toBeTruthy();

  fireEvent.click(screen.getByRole('tab', { name: 'Blade 2' }));
  fireEvent.change(offModeSelect, { target: { value: 'random' } });
  fireEvent.change(offRateInput, { target: { value: '1800' } });

  const blade2 = useConfigStore.getState().doc?.banks.blade_in.presets[0].blades[1];
  expect(blade2?.params.off_mode).toBe('random');
  expect(blade2?.params.off_rate_ms).toBe('1800');
});
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
npm test -- src/components/presetUiIntegration.test.tsx
```

Expected: FAIL because off-state controls are not rendered/labeled yet.

- [x] **Step 3: Implement off-state controls in PresetEditor**

```tsx
// PresetEditor.tsx (imports)
import {
  OFF_MODE_OPTIONS,
  getOffStateValue,
  getStyleTuningValue,
  getVisibleStyleTuningArgs,
  type StyleTuningKey,
} from './styleTuningConfig';
```

```tsx
// PresetEditor.tsx (inside Per-Blade Style Controls block)
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
    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }}
  />
</div>

<div>
  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Off Mode</label>
  <select
    aria-label="Off Mode"
    value={getOffStateValue(selectedBlade.params, 'off_mode')}
    onChange={(event) => handleBladeFieldChange('off_mode', event.target.value)}
    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }}
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
    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)' }}
  />
</div>
```

- [x] **Step 4: Run integration + full companion gates**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
npm test -- src/components/presetUiIntegration.test.tsx src/components/styleStringBuilder.test.ts src/components/styleTuningConfig.test.ts
npm test
npm run lint
npm run build
```

Expected: all commands succeed.

- [x] **Step 5: Commit**

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
git add src/components/PresetEditor.tsx src/components/presetUiIntegration.test.tsx
git commit -m "feat(ui): expose per-blade off-state style controls"
```

---

## Self-Review (completed)

1. **Spec coverage:**  
   - Per-blade off-state editing -> Task 3  
   - Preview off-state wiring (args 14/15/16) -> Task 2  
   - Defaults + bounds + mode mapping -> Task 1 + Task 2  
   - Regression protection -> Tasks 1-3 tests
2. **Placeholder scan:**  
   No TODO/TBD placeholders or ambiguous "handle later" instructions remain.
3. **Type consistency:**  
   Off-state keys are consistently named `off_color`, `off_mode`, `off_rate_ms` across helper, builder, UI, and tests.
