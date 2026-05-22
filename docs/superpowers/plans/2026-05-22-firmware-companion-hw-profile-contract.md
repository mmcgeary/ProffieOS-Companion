# Firmware-Companion HW Profile Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make firmware and companion use a single explicit hardware-profile protocol so blade-detect preset banks are always exposed/editable on compatible firmware.

**Architecture:** Add a formal `GET_HW_PROFILE` response contract in firmware and parse it strictly in companion. Keep blade state (`blade_detect`) separate from capability (`has_blade_detect`) and fail fast on incompatible firmware instead of silently degrading. Also stop repeated missing-INI retry spam in firmware loop behavior.

**Tech Stack:** C++ (ProffieOS prop runtime + host tests), TypeScript (React/Zustand companion), Vitest, Make.

---

## File Structure (locked before implementation)

- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props/saber_ini_config.h`  
  Responsibility: define and emit hardware-profile command contract; suppress repeated missing-INI retry spam.
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props/style_registry_tests.cpp`  
  Responsibility: host-level regression tests for command constants/profile-line contract and retry suppression policy.
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/src/serial/serialManager.ts`  
  Responsibility: strict parser alignment with firmware contract and explicit incompatibility signaling.
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/src/serial/serialManager.test.ts`  
  Responsibility: parser regression coverage for contract line, capability semantics, and unsupported-profile rejection.

---

### Task 1: Add firmware contract helpers and retry-policy tests (RED first)

**Files:**
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props/style_registry_tests.cpp`
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props/saber_ini_config.h`
- Test: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props/style_registry_tests.cpp`

- [x] **Step 1: Write failing firmware host tests for contract constants and profile line format**

```cpp
static void TestHardwareProfileCommandContract() {
  CHECK(strcmp(kGetHardwareProfileCmd, "GET_HW_PROFILE") == 0);

  char line[160];
  BuildHardwareProfileLine(1, 2, true, false, line, sizeof(line));
  CHECK(strcmp(line, "HW_PROFILE num_blades=1 num_buttons=2 has_blade_detect=1 blade_detect=0") == 0);

  BuildHardwareProfileLine(3, 1, false, false, line, sizeof(line));
  CHECK(strcmp(line, "HW_PROFILE num_blades=3 num_buttons=1 has_blade_detect=0 blade_detect=0") == 0);
}

static void TestIniLoadRetryPolicySupportsDisabledSentinel() {
  CHECK(!ShouldAttemptIniLoad(false, false, true, 7000, kIniLoadRetryDisabled));
  CHECK(ShouldAttemptIniLoad(true, false, true, 7000, kIniLoadRetryDisabled));
}
```

- [x] **Step 2: Run firmware host tests to verify RED**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props
make test
```

Expected: FAIL with undefined symbols for new contract helpers/constants/sentinel.

- [x] **Step 3: Implement minimal firmware helpers/constants to satisfy tests**

```cpp
inline constexpr const char kGetHardwareProfileCmd[] = "GET_HW_PROFILE";
inline constexpr uint32_t kIniLoadRetryDisabled = UINT32_MAX;

inline int NormalizeHardwareCountForProfile(int value) {
  return value > 0 ? value : 1;
}

inline void BuildHardwareProfileLine(int num_blades,
                                     int num_buttons,
                                     bool has_blade_detect,
                                     bool blade_detected,
                                     char* out,
                                     size_t out_size) {
  if (!out || out_size == 0) return;
  snprintf(out,
           out_size,
           "HW_PROFILE num_blades=%d num_buttons=%d has_blade_detect=%d blade_detect=%d",
           NormalizeHardwareCountForProfile(num_blades),
           NormalizeHardwareCountForProfile(num_buttons),
           has_blade_detect ? 1 : 0,
           blade_detected ? 1 : 0);
}

inline bool ShouldAttemptIniLoad(bool force,
                                 bool ini_loaded,
                                 bool has_runtime_config,
                                 uint32_t now_ms,
                                 uint32_t next_attempt_ms) {
  if (!has_runtime_config) return false;
  if (force) return true;
  if (ini_loaded) return false;
  if (next_attempt_ms == kIniLoadRetryDisabled) return false;
  return static_cast<int32_t>(now_ms - next_attempt_ms) >= 0;
}
```

- [x] **Step 4: Run firmware host tests to verify GREEN**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props
make test
```

Expected: PASS with new contract helper tests green.

- [x] **Step 5: Commit firmware helper/test changes**

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS
git add props/saber_ini_config.h props/style_registry_tests.cpp
git commit -m "feat(ini): define hw profile command contract helpers"
```

---

### Task 2: Wire firmware command handling and missing-INI retry suppression

**Files:**
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props/style_registry_tests.cpp`
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props/saber_ini_config.h`
- Test: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props/style_registry_tests.cpp`

- [x] **Step 1: Add failing test for explicit retry disable behavior after missing-file policy**

```cpp
static void TestIniLoadRetryPolicyKeepsTimedRecoveryWhenNotDisabled() {
  CHECK(!ShouldAttemptIniLoad(false, false, true, 3500, 4000));
  CHECK(ShouldAttemptIniLoad(false, false, true, 4000, 4000));
  CHECK(ShouldAttemptIniLoad(false, false, true, 4500, 4000));
}
```

- [x] **Step 2: Run firmware host tests to verify RED for policy expectations**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props
make test
```

Expected: FAIL if retry policy behavior changed incorrectly.

- [x] **Step 3: Implement command wiring and no-spam missing-INI behavior**

```cpp
if (!strcmp(cmd, kGetHardwareProfileCmd)) {
  char profile_line[160];
  const int num_blades = blade_in_config_ ? blade_in_config_->num_blades : 1;
  const int num_buttons = blade_in_config_ ? blade_in_config_->global.num_buttons : 1;
#ifdef BLADE_DETECT_PIN
  const bool has_blade_detect = true;
  const bool blade_detected = blade_detected_;
#else
  const bool has_blade_detect = false;
  const bool blade_detected = false;
#endif
  BuildHardwareProfileLine(
      num_blades, num_buttons, has_blade_detect, blade_detected, profile_line, sizeof(profile_line));
  STDOUT.println(profile_line);
  return true;
}
```

```cpp
if (!LSFS::Exists(INI_CONFIG_FILE)) {
  LOCK_SD(false);
  STDOUT.println("SaberIni: INI missing");
  ini_loaded_ = false;
  next_ini_load_attempt_ms_ = kIniLoadRetryDisabled;
  return;
}
```

- [x] **Step 4: Run firmware host tests to verify GREEN**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props
make test
```

Expected: PASS with contract/policy tests and existing prop tests.

- [x] **Step 5: Commit firmware command wiring**

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS
git add props/saber_ini_config.h props/style_registry_tests.cpp
git commit -m "fix(ini): add hw profile command and stop missing-ini spam loop"
```

---

### Task 3: Align companion parser to strict firmware contract (RED first)

**Files:**
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/src/serial/serialManager.test.ts`
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/src/serial/serialManager.ts`
- Test: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/src/serial/serialManager.test.ts`

- [x] **Step 1: Write failing parser tests for contract line and incompatibility rejection**

```ts
it('parses firmware HW_PROFILE contract line with blade_detect state token', async () => {
  const manager = new SerialManager();
  const writeMock = vi.fn().mockResolvedValue(undefined);
  attachWriter(manager, writeMock);

  const profilePromise = manager.getHardwareProfile();
  emitLine(manager, 'HW_PROFILE num_blades=1 num_buttons=1 has_blade_detect=1 blade_detect=0');
  await vi.advanceTimersByTimeAsync(250);

  await expect(profilePromise).resolves.toEqual({
    numBlades: 1,
    numButtons: 1,
    hasBladeDetect: true,
  });
});

it('treats has_blade_detect=0 as capability false', async () => {
  const manager = new SerialManager();
  const writeMock = vi.fn().mockResolvedValue(undefined);
  attachWriter(manager, writeMock);

  const profilePromise = manager.getHardwareProfile();
  emitLine(manager, 'num_blades=1');
  emitLine(manager, 'num_buttons=1');
  emitLine(manager, 'has_blade_detect=0');
  await vi.advanceTimersByTimeAsync(250);

  await expect(profilePromise).resolves.toEqual({
    numBlades: 1,
    numButtons: 1,
    hasBladeDetect: false,
  });
});

it('rejects hardware profile reads with no recognized profile keys', async () => {
  const manager = new SerialManager();
  const writeMock = vi.fn().mockResolvedValue(undefined);
  attachWriter(manager, writeMock);

  const profilePromise = manager.getHardwareProfile();
  emitLine(manager, 'SaberIni: Loading...');
  emitLine(manager, 'SaberIni: INI missing');
  await vi.advanceTimersByTimeAsync(250);

  await expect(profilePromise).rejects.toThrow('Incompatible firmware: GET_HW_PROFILE returned no profile keys');
});
```

- [x] **Step 2: Run focused companion tests to verify RED**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion
npm test -- src/serial/serialManager.test.ts
```

Expected: FAIL on the new contract assertions.

- [x] **Step 3: Implement minimal parser contract alignment**

```ts
const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSY_VALUES = new Set(['0', 'false', 'no', 'off']);

const parseBoolean = (value: string): boolean | null => {
  const normalized = value.trim().toLowerCase();
  if (TRUTHY_VALUES.has(normalized)) return true;
  if (FALSY_VALUES.has(normalized)) return false;
  return null;
};
```

```ts
let matchedProfileToken = false;
// set matchedProfileToken = true when any num_blades/num_buttons/blade_detect/has_blade_detect key is recognized
```

```ts
if (HW_PROFILE_BLADE_DETECT_STATE_KEYS.has(key)) {
  matchedProfileToken = true;
  hasBladeDetect = true;
  return;
}

if (HW_PROFILE_BLADE_DETECT_CAPABILITY_KEYS.has(key)) {
  matchedProfileToken = true;
  const parsed = parseBoolean(value);
  if (parsed !== null) hasBladeDetect = parsed;
  return;
}
```

```ts
async getHardwareProfile(): Promise<HardwareProfile> {
  const lines = await this.collectCommandLines('GET_HW_PROFILE');
  const profile = parseHardwareProfile(lines);
  if (!profile._matchedProfileToken) {
    throw new Error('Incompatible firmware: GET_HW_PROFILE returned no profile keys');
  }
  return {
    numBlades: profile.numBlades,
    numButtons: profile.numButtons,
    hasBladeDetect: profile.hasBladeDetect,
  };
}
```

- [x] **Step 4: Run focused and related companion tests to verify GREEN**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion
npm test -- src/serial/serialManager.test.ts src/state/configStore.test.ts src/components/presetUiIntegration.test.tsx
```

Expected: PASS, including parser and bank-selector regressions.

- [x] **Step 5: Commit companion parser/test changes**

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion
git add src/serial/serialManager.ts src/serial/serialManager.test.ts
git commit -m "fix(serial): enforce hw profile protocol contract"
```

---

### Task 4: Cross-repo verification and release handoff notes

**Files:**
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/aidlc-docs/audit.md`
- Modify: `/Users/matthew.mcgeary/.copilot/session-state/b2e0b935-ba11-4e2a-90fd-51619f8964d8/plan.md`

- [x] **Step 1: Run firmware and companion verification suites**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props && make test
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion && npm test -- src/serial/serialManager.test.ts src/state/configStore.test.ts src/components/presetUiIntegration.test.tsx
```

Expected: PASS in both repositories.

- [x] **Step 2: Update workflow/session tracking artifacts**

```markdown
- Mark this protocol-fix plan task checkboxes complete.
- Append audit entries in `aidlc-docs/audit.md` for design approval, plan approval, and implementation completion.
- Update session `plan.md` milestones for firmware change, companion change, and verification completion.
```

- [ ] **Step 3: Commit tracking docs (if changed)**

```bash
cd /Users/matthew.mcgeary/Copilot_workspace
git -C ProffieOS --no-pager status --short
git -C ProffieOS-Companion --no-pager status --short
```

Expected: No uncommitted code changes before final handoff.

---

## Self-Review Checklist (completed)

1. **Spec coverage:**  
   - Shared protocol command and response contract: Tasks 1-2.  
   - Companion strict parsing and explicit incompatibility handling: Task 3.  
   - Missing-INI spam suppression: Task 2.  
   - End-to-end validation: Task 4.
2. **Placeholder scan:** No TBD/TODO placeholders in executable steps.
3. **Type consistency:** `has_blade_detect` (capability) and `blade_detect` (state) semantics are consistent across firmware/app tasks.
