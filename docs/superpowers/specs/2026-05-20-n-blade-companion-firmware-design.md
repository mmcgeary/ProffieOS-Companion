# N-Blade Companion + Firmware Design

**Date:** 2026-05-20  
**Scope:** `ProffieOS` + `ProffieOS-Companion`  
**Status:** Approved for planning

## 1. Problem Statement

Current companion/firmware behavior is not aligned with release goals:

1. Style tuning is split between Presets and a separate Tuning tab.
2. Companion supports add-preset, but not remove or reorder.
3. Companion does not support explicit blade-in/blade-out bank editing.
4. Companion font/track fields are free text instead of SD-backed choices.
5. Firmware blade-detect bank behavior is only partially wired.
6. Current preset schema is effectively one main style + one accent style, not true N-blade.

The target state is:

- Flash-time config defines physical topology only.
- Runtime INI/app controls all non-physical behavior.
- Companion is the primary editor for full runtime behavior.

## 2. Design Decisions

1. **No backward compatibility layer in this cycle.**  
   The new N-blade schema becomes canonical.
2. **Blade banks are explicit.**  
   Companion edits both `blade_in` and `blade_out` banks.
3. **Global + button mappings are shared across banks.**  
   Presets are bank-specific.
4. **Tuning tab is removed.**  
   Full tuning controls live inside Presets, per blade, per preset.
5. **Media selection is SD-backed only.**  
   Font/track values must come from board-reported entries.
6. **Preset list supports drag-drop reorder + delete.**

## 3. Target Architecture

## 3.1 Companion Data Model

Move from flat section editing to a normalized model:

- `hardwareProfile` (read-only, from firmware): blade count, button count, blade-detect/display/BT capability flags.
- `global` (shared)
- `buttonsOn` / `buttonsOff` (shared)
- `banks.blade_in.presets[]`
- `banks.blade_out.presets[]`

Each preset contains:

- identity/media fields (`name`, `font`, `track`)
- `blades[]` where each index has full style+tuning fields (style name + style params)

## 3.2 Firmware Runtime Model

Replace single-main-plus-accent preset representation with true per-blade arrays:

- per preset: blade style configs for `1..INI_NUM_BLADES`
- parser and generator paths consume/emit the same canonical per-blade structure

`PresetBuilder` emits one `style=` line per physical blade index.

## 4. INI Schema

Canonical preset schema is per blade:

```ini
[preset1]
name=...
font=...
track=...

blade1_style=standard
blade1_base_color=...
blade1_alt_color=...
...

blade2_style=pulse
blade2_base_color=...
blade2_pulse_rate=...
...
```

Shared sections remain:

- `[global]`
- `[buttons_on]`
- `[buttons_off]`

Bank files:

- `saber_config.ini` -> blade-in bank
- `blade_out.ini` -> blade-out bank

## 5. Serial Protocol

Add/standardize commands for companion:

1. `GET_HW_PROFILE`
2. `READ_INI_BANK blade_in|blade_out`
3. `WRITE_INI_BANK blade_in|blade_out`
4. Existing `list_fonts`
5. Existing `list_tracks`

Protocol behavior:

- bank read returns `---BEGIN_INI--- ... ---END_INI---`
- bank write uses `READY_FOR_INI` -> streamed lines -> `SAVE_OK|SAVE_FAIL`
- save-triggered reboot path remains supported by companion reconnect/resync flow

## 6. Blade Detect Behavior

Firmware must:

1. Load both banks at startup.
2. Select active bank from blade detect state.
3. Apply active bank globals and preset set on state changes.
4. Ensure no-blade state uses `blade_out` bank when present.

This closes the current partial wiring where blade-out structures exist but are not fully activated through runtime flow.

## 7. Companion UX

## 7.1 Tabs

- Keep: `Presets`, `Global`, `Buttons`
- Remove: `Tuning`

## 7.2 Presets Workspace

1. Bank switcher: `Blade Inserted` / `No Blade`
2. Preset list:
   - drag-and-drop reorder
   - per-row delete action
3. Preset editor:
   - identity/media fields
   - dynamic blade sub-editors (`Blade 1..N`)
   - full tuning controls per blade

## 7.3 Media Inputs

- `font`: select from SD font directories
- `track`: select from:
  - `/tracks/*.wav`
  - `/<selected_font>/tracks/*.wav`

If current value is missing:

- show explicit missing state
- block save until corrected

## 8. Validation and Quality Gates

## 8.1 Firmware

- unit coverage for:
  - per-blade schema parsing
  - preset builder style-line emission for `INI_NUM_BLADES`
  - blade bank load/select behavior

## 8.2 Companion

- tests for:
  - drag-drop reorder and delete behavior
  - bank switching with shared global/buttons
  - per-blade preset editing
  - SD media picker behavior and missing-value save blocking

## 8.3 Device

Run matrix over representative flash-time hardware profiles (different blade/button/display/BT combinations) to validate runtime behavior is fully app/INI-driven within physical constraints.

## 9. Non-Goals

1. Preserving old legacy schema in saved output.
2. Keeping old Tuning-tab workflow.
3. Free-text media path entry.

## 10. Risks and Mitigations

1. **Schema migration risk:**  
   Mitigate with explicit fixture updates and firmware parser tests before device trials.
2. **Protocol drift between app/firmware:**  
   Mitigate with command-contract tests and integration tests against real serial transcript fixtures.
3. **Large UX surface change:**  
   Mitigate with staged UI rollout in one workspace (Presets) and strict regression tests.

