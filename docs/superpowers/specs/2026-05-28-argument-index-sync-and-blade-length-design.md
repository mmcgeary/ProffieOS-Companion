# Design Spec: Argument Index Synchronization & Blade Length Propagation

## Goal
Resolve style rendering mismatches (specifically for Fire Unstable style preview) and incorrect blade length defaults in the ProffieOS-Companion app.

## Proposed Changes

### 1. Argument Index Synchronization
Align all argument symbols and tuning key indices in the companion app to match the updated C++ firmware indices in `styles/ini_style_arg_ids.h`.

* **File**: `src/config/styleArgSymbols.ts`
  Update `ARG_INDEX_BY_SYMBOL` map.
* **File**: `src/components/styleStringBuilder.ts`
  Update `ARG_INDEX_BY_TUNING_KEY` map.

### 2. Blade Length Propagation
Propagate blade lengths parsed from the board profile down into the application config state model.

* **File**: `src/serial/serialManager.ts`
  Update `getHardwareProfile()` to return the parsed `bladeLengths` array in the `HardwareProfile` object.
* **File**: `src/state/configStore.ts`
  Update the `loadSample()` action to properly copy and store `boardProfile.bladeLengths` in the hardware profile state when connected.

## Testing & Verification Plan
* Run ESLint in `ProffieOS-Companion` to ensure no syntax/type warnings or errors are introduced.
* Run Vitest suite in `ProffieOS-Companion` to ensure 100% of unit and integration tests continue to pass.
