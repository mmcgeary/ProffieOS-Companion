# Blade-Detect Bank Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose editable `blade_in` and `blade_out` preset banks in the Presets tab whenever blade-detect is enabled on the connected board.

**Architecture:** Keep the existing dual-bank document model and save pipeline unchanged. Add a Presets-tab-only bank selector in `PresetEditor` that binds to `activeBank`/`setActiveBank`, and gate selector visibility on `doc.hardwareProfile.hasBladeDetect`. Validate behavior with UI integration tests that cover visibility, switching, and bank-isolated edits.

**Tech Stack:** React 19, TypeScript, Zustand, Vitest, Testing Library.

---

## File Structure (locked before implementation)

- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/src/components/PresetEditor.tsx`  
  Responsibility: render blade-detect-gated bank selector and wire it to store bank selection.
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/src/components/presetUiIntegration.test.tsx`  
  Responsibility: verify selector visibility, selector-driven bank switching, and no cross-bank mutation when editing.

---

### Task 1: Add bank-selector UI for blade-detect configs

**Files:**
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/src/components/presetUiIntegration.test.tsx`
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/src/components/PresetEditor.tsx`
- Test: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/src/components/presetUiIntegration.test.tsx`

- [ ] **Step 1: Write failing UI integration tests for selector visibility + switching**

```tsx
// presetUiIntegration.test.tsx
it('shows Config Bank selector when blade-detect is enabled and switches active bank', () => {
  render(<PresetEditor />);

  const selector = screen.getByLabelText('Config Bank') as HTMLSelectElement;
  expect(selector.value).toBe('blade_in');
  expect(screen.getByRole('button', { name: 'Blue' })).toBeTruthy();

  fireEvent.change(selector, { target: { value: 'blade_out' } });

  const state = useConfigStore.getState();
  expect(state.activeBank).toBe('blade_out');
  expect(screen.getByRole('button', { name: 'OutPreset' })).toBeTruthy();
});

it('hides Config Bank selector when blade-detect is disabled', () => {
  const doc = makeDoc(2);
  doc.hardwareProfile.hasBladeDetect = false;
  useConfigStore.setState({
    sections: parseIni(buildBladeInIni(doc)),
    doc,
    activeBank: 'blade_in',
    activePresetIndex: 0,
    activeBladeIndex: 0,
  });

  render(<PresetEditor />);

  expect(screen.queryByLabelText('Config Bank')).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion
npm test -- src/components/presetUiIntegration.test.tsx
```

Expected: FAIL with missing `Config Bank` selector.

- [ ] **Step 3: Implement minimal selector UI and state wiring in PresetEditor**

```tsx
// PresetEditor.tsx (imports)
import type { ConfigBank, PresetConfig } from '../config/types';
```

```tsx
// PresetEditor.tsx (store selectors)
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
```

```tsx
// PresetEditor.tsx (helpers near other derived values)
const showBankSelector = Boolean(doc?.hardwareProfile.hasBladeDetect);
const handleBankChange = (value: string) => {
  if (value === 'blade_in' || value === 'blade_out') {
    setActiveBank(value as ConfigBank);
  }
};
```

```tsx
// PresetEditor.tsx (render near top of right-side section)
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
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion
npm test -- src/components/presetUiIntegration.test.tsx
```

Expected: PASS for selector visibility/switching tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion
git add src/components/PresetEditor.tsx src/components/presetUiIntegration.test.tsx
git commit -m "feat(ui): expose blade-detect preset bank selector"
```

---

### Task 2: Prove bank edits remain isolated after selector-driven switching

**Files:**
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/src/components/presetUiIntegration.test.tsx`
- Test: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/src/components/presetUiIntegration.test.tsx`

- [ ] **Step 1: Write failing integration test for cross-bank isolation**

```tsx
// presetUiIntegration.test.tsx
it('edits only the selected bank after switching Config Bank', () => {
  render(<PresetEditor />);

  const selector = screen.getByLabelText('Config Bank');
  fireEvent.change(selector, { target: { value: 'blade_out' } });

  const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
  fireEvent.change(nameInput, { target: { value: 'Out Edited' } });

  fireEvent.change(selector, { target: { value: 'blade_in' } });

  const state = useConfigStore.getState();
  expect(state.doc?.banks.blade_out.presets[0]?.name).toBe('Out Edited');
  expect(state.doc?.banks.blade_in.presets[0]?.name).toBe('Blue');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion
npm test -- src/components/presetUiIntegration.test.tsx -t "edits only the selected bank after switching Config Bank"
```

Expected: FAIL if bank selector or selected-bank binding is incomplete.

- [ ] **Step 3: Apply minimal fix if needed**

```tsx
// PresetEditor.tsx
// Ensure all preset reads/writes continue to resolve from:
const presets = doc ? doc.banks[activeBank].presets : fallbackPresets;
// and all field writes continue through updateParam/updateBladeParam after setActiveBank updates sections.
```

- [ ] **Step 4: Run focused and related tests**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion
npm test -- src/components/presetUiIntegration.test.tsx src/state/configStore.test.ts
```

Expected: PASS, including existing `setActiveBank('blade_out')` store behavior tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion
git add src/components/presetUiIntegration.test.tsx src/components/PresetEditor.tsx
git commit -m "test(ui): lock bank-isolated editing via selector"
```

---

## Self-Review Checklist (completed)

1. **Spec coverage:**  
   - Selector shown only for blade-detect: Task 1 steps 1-4.  
   - Presets-tab-only switcher: Task 1 step 3.  
   - Independent bank edits: Task 2 steps 1-4.
2. **Placeholder scan:** No TBD/TODO placeholders in task instructions.
3. **Type consistency:** `Config Bank` selector values match store `ConfigBank` values (`blade_in`, `blade_out`).
