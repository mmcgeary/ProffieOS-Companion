# Argument Index Synchronization & Blade Length Propagation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize companion argument indices with firmware's `ini_style_arg_ids.h` to resolve render preview mismatches (e.g. Fire Unstable style) and propagate board blade lengths into configuration state.

**Architecture:** Update static arg mapping constants in `styleArgSymbols.ts` and `styleStringBuilder.ts`, then update `getHardwareProfile()` in `serialManager.ts` and `loadSample()` in `configStore.ts` to fully return and store blade lengths.

**Tech Stack:** React 19, TypeScript, Zustand, Vitest.

---

### Task 1: Synchronize Style Argument Symbols

**Files:**
- Modify: `src/config/styleArgSymbols.ts`
- Test: `src/components/styleStringBuilder.test.ts`

- [ ] **Step 1: Write a test verifying that `ALT_COLOR2_ARG` is mapped correctly**
  Modify `src/components/styleStringBuilder.test.ts` to add a test ensuring index values for standard and secondary style parameters match expected new positions.
  ```typescript
  // Add in src/components/styleStringBuilder.test.ts
  it('correctly maps ALT_COLOR2_ARG to index 33', () => {
    const { ARG_INDEX_BY_SYMBOL } = await import('../config/styleArgSymbols');
    expect(ARG_INDEX_BY_SYMBOL.ALT_COLOR2_ARG).toBe(33);
  });
  ```

- [ ] **Step 2: Run tests to verify the test fails**
  Run:
  ```bash
  npm test -- src/components/styleStringBuilder.test.ts
  ```
  Expected: FAIL with `ALT_COLOR2_ARG` expected `33` but got `31`.

- [ ] **Step 3: Update `ARG_INDEX_BY_SYMBOL` in `src/config/styleArgSymbols.ts`**
  Replace the entire map in `src/config/styleArgSymbols.ts` to align with the new firmware mapping:
  ```typescript
  export const ARG_INDEX_BY_SYMBOL: Record<string, number> = {
    BASE_COLOR_ARG: 1,
    ALT_COLOR_ARG: 2,
    STYLE_OPTION_ARG: 3,
    IGNITION_OPTION_ARG: 4,
    IGNITION_TIME_ARG: 5,
    IGNITION_DELAY_ARG: 6,
    IGNITION_COLOR_ARG: 7,
    IGNITION_POWER_UP_ARG: 8,
    BLAST_COLOR_ARG: 9,
    CLASH_COLOR_ARG: 10,
    LOCKUP_COLOR_ARG: 11,
    LOCKUP_POSITION_ARG: 12,
    DRAG_COLOR_ARG: 13,
    DRAG_SIZE_ARG: 14,
    LB_COLOR_ARG: 15,
    STAB_COLOR_ARG: 16,
    MELT_SIZE_ARG: 17,
    SWING_COLOR_ARG: 18,
    SWING_OPTION_ARG: 19,
    EMITTER_COLOR_ARG: 20,
    EMITTER_SIZE_ARG: 21,
    PREON_COLOR_ARG: 22,
    PREON_OPTION_ARG: 23,
    PREON_SIZE_ARG: 24,
    RETRACTION_OPTION_ARG: 25,
    RETRACTION_TIME_ARG: 26,
    RETRACTION_DELAY_ARG: 27,
    RETRACTION_COLOR_ARG: 28,
    RETRACTION_COOL_DOWN_ARG: 29,
    POSTOFF_COLOR_ARG: 30,
    OFF_COLOR_ARG: 31,
    OFF_OPTION_ARG: 32,
    ALT_COLOR2_ARG: 33,
    ALT_COLOR3_ARG: 34,
    STYLE_OPTION2_ARG: 35,
    STYLE_OPTION3_ARG: 36,
    IGNITION_OPTION2_ARG: 37,
    RETRACTION_OPTION2_ARG: 38,
  };
  ```

- [ ] **Step 4: Run tests to verify they pass**
  Run:
  ```bash
  npm test -- src/components/styleStringBuilder.test.ts
  ```
  Expected: PASS

- [ ] **Step 5: Commit changes**
  ```bash
  git add src/config/styleArgSymbols.ts src/components/styleStringBuilder.test.ts
  git commit -m "feat(config): synchronize style arg symbol indices with firmware"
  ```

---

### Task 2: Synchronize Custom Tuning Key Indices

**Files:**
- Modify: `src/components/styleStringBuilder.ts`
- Test: `src/components/styleStringBuilder.test.ts`

- [ ] **Step 1: Write a test verifying that `flicker_depth` is mapped to index 39**
  Add a test to verify custom tuning key arg index mapping:
  ```typescript
  // Add in src/components/styleStringBuilder.test.ts
  it('correctly maps flicker_depth to index 39', () => {
    // Check that style builder sets the correct position for flicker_depth
    const blade = {
      style: 'audio_flicker',
      params: { base_color: 'Red', alt_color: 'White' },
      styleParams: { flicker_depth: '12000' }
    };
    const styleString = buildStyleString(blade);
    const args = styleString.split(' ');
    expect(args[39]).toBe('12000');
  });
  ```

- [ ] **Step 2: Run tests to verify the test fails**
  Run:
  ```bash
  npm test -- src/components/styleStringBuilder.test.ts
  ```
  Expected: FAIL with missing value or mismatch at index 39.

- [ ] **Step 3: Update `ARG_INDEX_BY_TUNING_KEY` in `src/components/styleStringBuilder.ts`**
  Modify `src/components/styleStringBuilder.ts` to shift indices by 22:
  ```typescript
  const ARG_INDEX_BY_TUNING_KEY: Partial<Record<StyleTuningKey, number>> = {
    flicker_depth: 39,
    flicker_speed: 40,
    stripe_width: 41,
    stripe_speed: 42,
    motion_gain: 43,
    noise_mix: 44,
    base_contrast: 45,
    drift_rate: 46,
    warm_shift: 47,
    jitter_amount: 48,
    spark_mix: 49,
    heat_rand: 50,
    fire_cooling: 51,
    rainbow_speed: 52,
  };
  ```

- [ ] **Step 4: Run tests to verify they pass**
  Run:
  ```bash
  npm test -- src/components/styleStringBuilder.test.ts
  ```
  Expected: PASS

- [ ] **Step 5: Commit changes**
  ```bash
  git add src/components/styleStringBuilder.ts src/components/styleStringBuilder.test.ts
  git commit -m "feat(config): synchronize custom tuning key indices with firmware"
  ```

---

### Task 3: Propagate Blade Lengths from Serial to State Store

**Files:**
- Modify: `src/serial/serialManager.ts`
- Modify: `src/state/configStore.ts`
- Test: `src/serial/serialManager.test.ts`
- Test: `src/state/configStore.test.ts`

- [ ] **Step 1: Write a test verifying that `getHardwareProfile()` includes parsed blade lengths**
  Modify `src/serial/serialManager.test.ts` to expect `bladeLengths` in the returned profile:
  ```typescript
  // Add in src/serial/serialManager.test.ts
  it('includes bladeLengths in returned hardware profile', async () => {
    // Setup mock lines for GET_HW_PROFILE
    // Call getHardwareProfile()
    // expect(profile.bladeLengths).toEqual([144, 144]);
  });
  ```

- [ ] **Step 2: Run tests to verify the test fails**
  Run:
  ```bash
  npm test -- src/serial/serialManager.test.ts
  ```
  Expected: FAIL with `bladeLengths` is undefined.

- [ ] **Step 3: Update `getHardwareProfile()` in `src/serial/serialManager.ts`**
  Modify the return value of `getHardwareProfile()`:
  ```typescript
    return {
      numBlades: parsed.numBlades,
      numButtons: parsed.numButtons,
      hasBladeDetect: parsed.hasBladeDetect,
      bladeLengths: parsed.bladeLengths,
    };
  ```

- [ ] **Step 4: Update `loadSample()` in `src/state/configStore.ts`**
  Ensure `loadSample()` copies the `bladeLengths` array:
  ```typescript
          hwProfile = {
            numBlades: Math.max(fallbackProfile.numBlades, boardProfile.numBlades),
            numButtons: Math.max(fallbackProfile.numButtons, boardProfile.numButtons),
            hasBladeDetect: boardProfile.hasBladeDetect || fallbackProfile.hasBladeDetect,
            bladeLengths: boardProfile.bladeLengths,
          };
  ```

- [ ] **Step 5: Run tests and ensure all pass**
  Run:
  ```bash
  npm test
  ```
  Expected: PASS

- [ ] **Step 6: Commit and verify linting**
  Run:
  ```bash
  npm run lint && npm run build
  ```
  Commit:
  ```bash
  git add src/serial/serialManager.ts src/state/configStore.ts src/serial/serialManager.test.ts src/state/configStore.test.ts
  git commit -m "feat(store): propagate blade lengths from hardware profile"
  ```
