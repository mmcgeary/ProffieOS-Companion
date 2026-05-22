# Firmware-Companion Hardware Profile Contract Design

**Date:** 2026-05-22  
**Scope:** `ProffieOS` + `ProffieOS-Companion`  
**Status:** Approved for planning

## 1. Problem Statement

Blade-detect bank editing is not reliably exposed in the companion app because firmware and app currently do not share a guaranteed hardware-profile protocol. The app requests `GET_HW_PROFILE`, but firmware does not currently implement that command. As a result, the app can silently infer incorrect capability state and hide `blade_in`/`blade_out` management.

## 2. Decision

Adopt a strict shared protocol and require synchronized firmware/app versions:

1. Firmware implements `GET_HW_PROFILE`.
2. Firmware emits deterministic machine-readable profile keys.
3. Companion parser aligns exactly to that contract.
4. Companion treats missing/invalid profile responses as incompatibility, not as a silent fallback.

No backward compatibility path is included for firmware that lacks `GET_HW_PROFILE`.

## 3. Protocol Contract

### 3.1 Command

- Request: `GET_HW_PROFILE`

### 3.2 Response

Firmware emits one profile line containing key/value pairs:

- `num_blades=<positive_int>`
- `num_buttons=<positive_int>`
- `has_blade_detect=<0|1>` (capability)
- `blade_detect=<0|1>` (current state)

Example:

`HW_PROFILE num_blades=1 num_buttons=1 has_blade_detect=1 blade_detect=0`

### 3.3 Semantics

1. `has_blade_detect` controls whether blade-bank UI controls are available.
2. `blade_detect` represents current insertion state only.
3. Presence of `blade_detect` must not disable bank editing; state and capability are distinct.

## 4. Firmware Changes

1. Add `GET_HW_PROFILE` handling in `SaberIniConfig::Parse`.
2. Emit contract-compliant profile output from runtime config values.
3. Preserve existing bank read/write protocol behavior.
4. Stop repeated missing-INI console spam by disabling automatic retry after first confirmed missing-file event.

## 5. Companion Changes

1. Parse `has_blade_detect` as capability value (`0` or `1`).
2. Treat `blade_detect` as state signal (not capability false when value is `0`).
3. Require at least one recognized hardware-profile key from `GET_HW_PROFILE`; otherwise raise explicit incompatible-firmware error.
4. Keep bank selector gating on `doc.hardwareProfile.hasBladeDetect`.

## 6. Error Handling

1. If firmware does not emit profile keys for `GET_HW_PROFILE`, connection flow fails with a clear compatibility error.
2. If INI banks are missing, app still uses sample bootstrap, but only after valid hardware profile is received.
3. Save/readback keeps both banks and preserves capability state.

## 7. Testing Strategy

### Firmware

1. Add failing tests for hardware-profile line contract helpers/constants.
2. Add failing tests for missing-INI retry suppression behavior.
3. Implement minimal firmware changes until tests pass.

### Companion

1. Add failing parser tests for contract line parsing.
2. Add failing tests for incompatibility detection when no profile keys are returned.
3. Update parser/store logic until tests pass.

## 8. Success Criteria

1. On blade-detect firmware (`mhs4_ini.h`), companion always exposes editable `blade_in` and `blade_out` banks.
2. On incompatible firmware builds, app fails clearly instead of silently hiding blade-bank controls.
3. Firmware no longer emits repeated `SaberIni: Loading...` / `SaberIni: INI missing` spam loops.
