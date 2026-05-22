# Blade-Detect Bank Selector Design

**Date:** 2026-05-22  
**Scope:** `ProffieOS-Companion`  
**Status:** Approved for planning

## 1. Problem Statement

In blade-detect configurations, companion currently loads both preset banks (`blade_in` and `blade_out`) but only exposes `blade_in` for editing in the UI. Users need to configure both banks regardless of the saber's current physical blade state.

## 2. Goals and Non-Goals

### Goals

1. Expose explicit bank selection for presets when blade-detect is supported.
2. Allow editing of `blade_in` and `blade_out` presets independently from app state.
3. Preserve existing load/save semantics (both banks loaded, both banks written on save).

### Non-Goals

1. No app-wide bank mode across non-preset tabs.
2. No change to shared-section behavior (`global`, `buttons_on`, `buttons_off`).
3. No automatic mirroring between `blade_in` and `blade_out`.

## 3. Design

### 3.1 Visibility and Gating

Render a bank selector in the Presets tab only when `doc.hardwareProfile.hasBladeDetect === true`.

- If blade-detect is not reported, hide the selector.
- Bank editing remains available through existing state for load/save, but not user-selectable in UI when blade-detect is false.

### 3.2 Presets-Tab Bank Selection UX

Add a compact "Config Bank" selector to `PresetEditor`:

1. `blade_in`
2. `blade_out`

Behavior:

- Selector binds to store `activeBank`.
- Changing selection calls `setActiveBank(...)`.
- Preset list, active preset, active blade editor, and preview all rebind to the selected bank immediately.
- Existing clamping logic for active preset/blade indices remains authoritative.

### 3.3 Data Flow and Persistence

Do not alter serialization architecture:

- `loadFromBoard` still reads both banks.
- Normalized document continues storing both banks independently.
- `saveToBoard` still writes both banks and re-syncs from board.

Bank switching only changes which in-memory bank is currently edited; data remains bank-isolated.

## 4. Error Handling and Edge Cases

1. If no config is loaded, existing "No configuration loaded" behavior remains unchanged.
2. If blade-detect is true but one bank has fewer presets, switching banks clamps active indices safely.
3. If bank data is missing/blank and fallback doc is loaded, selector behavior follows `hasBladeDetect` from hardware profile.

## 5. Testing Strategy

1. Add preset UI integration coverage for selector visibility:
   - visible when `hasBladeDetect` is true
   - hidden when `hasBladeDetect` is false
2. Add behavior coverage for bank switching:
   - selector change updates `activeBank`
   - displayed preset content reflects selected bank
   - edits apply only to selected bank
3. Keep existing bank-isolation save/load tests green.

## 6. Success Criteria

1. Users can switch between `blade_in` and `blade_out` from the Presets tab when blade-detect is enabled.
2. Each bank can be edited independently regardless of current blade state.
3. Save continues to persist both banks correctly with no regression in shared/global sections.
