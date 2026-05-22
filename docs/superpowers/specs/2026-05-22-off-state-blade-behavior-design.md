# Off-State Blade Behavior Exposure Design

**Date:** 2026-05-22  
**Scope:** `ProffieOS-Companion` (`n-blade-platform`)  
**Status:** Approved for planning

## 1. Problem Statement

Off-state blade behavior exists in the firmware/style contract (`off_color`, `off_mode`, `off_rate_ms`) and is present in canonical INI fixtures, but companion UI controls do not expose it in the Presets workflow. Users cannot reliably inspect or edit these values from the app even though they are part of the runtime style model.

## 2. Goals and Non-Goals

### Goals

1. Expose off-state controls per blade and per preset in the Preset editor.
2. Keep off-state controls aligned with firmware argument semantics and bounds.
3. Include off-state values in preview style-string argument wiring.
4. Preserve canonical `bladeN_off_*` serialization behavior.

### Non-Goals

1. No firmware parser/contract changes.
2. No redesign of overall Preset editor layout.
3. No style-library refactor beyond targeted metadata/helper additions needed for off-state fields.

## 3. Design

### 3.1 Metadata-Driven Off-State Controls

Add reusable off-state metadata and helpers in companion style configuration utilities so controls are defined once and rendered consistently:

- `off_color`
- `off_mode` (`pulse` or `random`)
- `off_rate_ms` (10-60000)

The implementation will keep off-state behavior separate from style-scoped tuning sliders while using the same metadata-driven pattern for consistency and maintainability.

### 3.2 Preset Editor UX

In `PresetEditor`, render off-state controls for the currently selected blade:

1. **Off Color** input.
2. **Off Mode** select (`pulse`, `random`).
3. **Off Rate (ms)** numeric/range-capable control with firmware-aligned bounds.

These controls are always visible regardless of selected base style.

### 3.3 Preview Style-String Wiring

Update style-string assembly to include off-state arguments at firmware-aligned positions:

- Arg 14: off color
- Arg 15: off mode selector (`pulse -> 1`, `random -> 2`)
- Arg 16: off rate (ms)

Existing tuning argument positions (17+) remain unchanged.

### 3.4 Data Flow, Defaults, and Validation

- Persist values via existing blade params and normalized document flow (`bladeN_off_*`).
- Defaults when unset:
  - `off_color = Black`
  - `off_mode = pulse`
  - `off_rate_ms = 1200`
- Clamp off rate to `10-60000` for preview wiring.
- Invalid/unknown mode falls back to `pulse` in preview mapping.

## 4. Testing Strategy

### 4.1 Unit Coverage

- Extend style config tests to cover:
  - off-state defaults
  - off-mode selector mapping (`pulse/random`)
  - off-rate clamping behavior

### 4.2 Integration Coverage

- Extend preset UI integration tests to verify:
  - off-state controls render in per-blade editor
  - control updates modify blade params in store

### 4.3 Preview Contract Coverage

- Add/extend tests to confirm style-string output contains off-state args in slots 14/15/16 with expected transformed values.

## 5. Risks and Mitigations

1. **Arg-position drift risk**  
   Mitigate with explicit preview position assertions against expected index mapping.

2. **Mode-value mismatch risk**  
   Mitigate with dedicated mapping helper and tests for supported modes.

3. **Behavior inconsistency between edit and render paths**  
   Mitigate by using shared off-state helpers for both displayed values and rendered style-string conversion.

## 6. Success Criteria

1. Off-state controls are editable for each blade in each preset.
2. Saved config retains canonical `bladeN_off_color`, `bladeN_off_mode`, and `bladeN_off_rate_ms`.
3. Preview style string includes and honors off-state values.
4. Added tests enforce behavior and mapping stability.
