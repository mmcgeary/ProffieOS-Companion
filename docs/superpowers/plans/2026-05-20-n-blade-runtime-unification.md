# N-Blade Runtime Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver explicit blade-in/blade-out editing and true N-blade preset control across firmware + companion so flash-time hardware topology stays fixed while runtime behavior is fully app/INI programmable.

**Architecture:** Introduce a canonical per-blade preset schema in firmware and companion, add explicit bank serial commands for blade-in/out, then refactor companion state/UI around shared global/buttons + bank-specific presets. Keep one coordinated protocol contract and validate with host tests, app tests, and on-device matrix checks.

**Tech Stack:** ProffieOS C++ (headers + host test binaries), React + TypeScript, Zustand, Vitest, WebSerial.

---

## File Structure (locked before implementation)

### Firmware (`/Users/matthew.mcgeary/Copilot_workspace/ProffieOS`)

- Modify: `props/runtime_config.h`  
  Responsibility: canonical N-blade runtime structs and defaults.
- Modify: `props/ini_loader.h`  
  Responsibility: parse per-blade preset keys and shared bank/global/button data.
- Modify: `props/preset_builder.h`  
  Responsibility: emit one style line per blade from per-blade preset data.
- Modify: `props/style_registry.h`  
  Responsibility: style builders that consume per-blade style config objects.
- Modify: `props/saber_ini_config.h`  
  Responsibility: explicit bank read/write protocol, startup bank loading, blade-detect switching.
- Modify: `props/style_registry_tests.cpp`  
  Responsibility: host-level regression tests for parser/build contract and bank behavior.
- Modify: `config/mhs4_ini.h`, `config/mining_ini.h`  
  Responsibility: ensure schema + bank behavior align with representative hardware profiles.

### Companion (`/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform`)

- Create: `src/config/types.ts`  
  Responsibility: normalized config document types (`hardwareProfile`, `shared`, `banks`, `presets`, `blades`).
- Create: `src/config/normalizeConfig.ts`  
  Responsibility: convert parsed INI sections into normalized model and back.
- Create: `src/config/mediaCatalog.ts`  
  Responsibility: list parsing/validation for fonts and tracks.
- Modify: `src/parser/iniParser.ts`  
  Responsibility: preserve section parsing, add helpers used by normalization layer.
- Modify: `src/serial/serialManager.ts`  
  Responsibility: `getHardwareProfile`, `readIniBank`, `writeIniBank`, `listFonts`, `listTracks`.
- Modify: `src/state/configStore.ts`  
  Responsibility: normalized state, active bank/preset/blade index, reorder/delete/media validation.
- Modify: `src/components/PresetEditor.tsx`  
  Responsibility: bank switcher, drag-drop list, delete, per-blade full controls, SD media selectors.
- Delete: `src/components/StyleTuning.tsx`  
  Responsibility: removed; controls merged into PresetEditor.
- Modify: `src/App.tsx`  
  Responsibility: remove Tuning tab and wire new preset workspace behavior.
- Create: `src/components/PresetList.tsx`  
  Responsibility: drag-drop + delete interactions.
- Modify/Test: `src/parser/iniParser.test.ts`, `src/serial/serialManager.test.ts`, `src/state/configStore.test.ts`  
  Responsibility: regression coverage for new schema/protocol/store behavior.
- Create: `src/config/normalizeConfig.test.ts`, `src/config/mediaCatalog.test.ts`  
  Responsibility: deterministic conversion and media validation tests.
- Update fixtures: `src/parser/fixtures/mhs4_ini.ini`, `src/parser/fixtures/mining.ini`, `src/parser/fixtures/blade_out_mhs4.ini`, `src/parser/fixtures/blade_out_mining.ini`.

---

### Task 1: Firmware N-blade runtime schema

**Files:**
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props/runtime_config.h`
- Test: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props/style_registry_tests.cpp`

- [x] **Step 1: Write the failing test for per-blade runtime defaults**

```cpp
static void TestNBladeRuntimeDefaults() {
  RuntimeConfig cfg;
  cfg.SetDefaults();
  CHECK(cfg.num_blades >= 1);
  CHECK(strcmp(cfg.presets[0].blades[0].style_name, "standard") == 0);
}
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS
g++ -std=c++17 -O0 props/style_registry_tests.cpp -o /tmp/style_registry_tests && /tmp/style_registry_tests
```

Expected: compile/test failure due missing `num_blades` and `presets[].blades[]`.

- [x] **Step 3: Write minimal runtime schema implementation**

```cpp
// runtime_config.h
#ifndef INI_MAX_BLADES
#define INI_MAX_BLADES 8
#endif

struct IniBladeStyle {
  char style_name[INI_MAX_STYLE_NAME_LEN];
  char base_color[20];
  char alt_color[20];
  char blast_color[20];
  char clash_color[20];
  char lockup_color[20];
  char drag_color[20];
  char lb_color[20];
  char stab_color[20];
  char swing_color[20];
  char emitter_color[20];
  char preon_color[20];
  char off_color[20];
  uint16_t ignition_time;
  uint16_t retraction_time;
  uint16_t flicker_depth;
  uint16_t flicker_speed;
  uint16_t stripe_width;
  uint16_t stripe_speed;
  uint16_t motion_gain;
  uint16_t noise_mix;
  uint16_t base_contrast;
  uint16_t pulse_rate;
  uint16_t pulse_depth;
  uint16_t strobe_freq;
  uint16_t strobe_ms;
  uint16_t drift_rate;
  uint16_t warm_shift;
  uint16_t jitter_amount;
  uint16_t spark_mix;
  uint16_t heat_rand;
  uint16_t fire_cooling;
  uint16_t rainbow_speed;

  void SetDefaults() {
    strcpy(style_name, "standard");
    strcpy(base_color, "0,0,65535");
    strcpy(alt_color, "0,65535,65535");
    ignition_time = 300;
    retraction_time = 200;
    flicker_depth = 12000;
    flicker_speed = 1000;
  }
};

struct IniPreset {
  char font[INI_MAX_FONT_PATH_LEN];
  char track[INI_MAX_TRACK_PATH_LEN];
  char name[INI_MAX_KEY_LEN];
  uint8_t blade_count;
  IniBladeStyle blades[INI_MAX_BLADES];
  void SetDefaults() { blade_count = 1; blades[0].SetDefaults(); }
};

struct RuntimeConfig {
  IniGlobalConfig global;
  uint8_t num_blades;
  IniPreset presets[INI_MAX_PRESETS];
  IniAction action_map_on[INI_MAX_SLOTS];
  IniAction action_map_off[INI_MAX_SLOTS];
  bool loaded;
  void SetDefaults() { num_blades = 1; presets[0].SetDefaults(); }
};
```

- [x] **Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS
g++ -std=c++17 -O0 props/style_registry_tests.cpp -o /tmp/style_registry_tests && /tmp/style_registry_tests
```

Expected: PASS for `TestNBladeRuntimeDefaults`.

- [x] **Step 5: Commit**

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS
git add props/runtime_config.h props/style_registry_tests.cpp
git commit -m "feat(ini): add canonical n-blade runtime preset schema"
```

---

### Task 2: Firmware parser + style builder for per-blade keys

**Files:**
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props/ini_loader.h`
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props/style_registry.h`
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props/preset_builder.h`
- Test: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props/style_registry_tests.cpp`

- [x] **Step 1: Write failing parser test for `bladeN_*` keys**

```cpp
static void TestParsePerBladePresetKeys() {
  IniPreset p;
  p.SetDefaults();
  IniLoader::ParsePreset("blade1_style", "standard", &p);
  IniLoader::ParsePreset("blade2_style", "pulse", &p);
  IniLoader::ParsePreset("blade2_flicker_depth", "9000", &p);
  CHECK(strcmp(p.blades[0].style_name, "standard") == 0);
  CHECK(strcmp(p.blades[1].style_name, "pulse") == 0);
  CHECK(p.blades[1].flicker_depth == 9000);
}
```

- [x] **Step 2: Run test to verify it fails**

Run same host command as Task 1.  
Expected: failing assertions or compile errors for missing parser support.

- [x] **Step 3: Implement `bladeN_*` parser path**

```cpp
// ini_loader.h
static bool ParseBladeKey(const char* key, int* blade_idx, const char** field) {
  if (strncasecmp(key, "blade", 5) != 0) return false;
  const char* p = key + 5;
  int idx = atoi(p);
  while (*p >= '0' && *p <= '9') p++;
  if (*p != '_' || idx < 1 || idx > INI_MAX_BLADES) return false;
  *blade_idx = idx - 1;
  *field = p + 1;
  return true;
}
```

- [x] **Step 4: Implement per-blade style string builders**

```cpp
// style_registry.h
static int BuildMainStyle(const IniBladeStyle* b, char* buf, int buf_size) {
  return BuildIniStyleWithBladeArgs("ini_standard", b, buf, buf_size);
}
```

```cpp
// preset_builder.h
for (int bi = 0; bi < p->blade_count && bi < INI_NUM_BLADES; bi++) {
  int len = BuildBladeStyle(&p->blades[bi], style_buf, sizeof(style_buf));
  if (len > 0) { f.print("style="); f.print(style_buf); f.print("\n"); }
}
```

- [x] **Step 5: Run tests to verify pass**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS
g++ -std=c++17 -O0 props/style_registry_tests.cpp -o /tmp/style_registry_tests && /tmp/style_registry_tests
```

Expected: per-blade parser + style-line emission tests pass.

- [x] **Step 6: Commit**

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS
git add props/ini_loader.h props/style_registry.h props/preset_builder.h props/style_registry_tests.cpp
git commit -m "feat(ini): parse and build per-blade preset style data"
```

---

### Task 3: Firmware bank protocol + blade-detect activation

**Files:**
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props/saber_ini_config.h`
- Test: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS/props/style_registry_tests.cpp` (bank behavior unit coverage where possible)

- [x] **Step 1: Write failing test/spec assertions for bank command handling**

```cpp
static void TestBankCommandNamesStable() {
  CHECK(strcmp(kReadIniBankCmd, "READ_INI_BANK") == 0);
  CHECK(strcmp(kWriteIniBankCmd, "WRITE_INI_BANK") == 0);
}
```

- [x] **Step 2: Run host test to verify failure**

Run host command.  
Expected: missing command constants or behavior scaffolding.

- [x] **Step 3: Implement explicit bank read/write commands**

```cpp
if (!strcmp(cmd, "READ_INI_BANK")) {
  const char* target = arg ? arg : "blade_in";
  const char* file = !strcmp(target, "blade_out") ? INI_BLADE_OUT_FILE : INI_CONFIG_FILE;
  // emit BEGIN/END markers with selected file
}

if (!strcmp(cmd, "WRITE_INI_BANK")) {
  const char* target = arg ? arg : "blade_in";
  stream_target_file_ = !strcmp(target, "blade_out") ? INI_BLADE_OUT_FILE : INI_CONFIG_FILE;
  // READY_FOR_INI + stream handling
}
```

- [x] **Step 4: Fix startup/load/switch path**

```cpp
void Setup() override {
  PropBase::Setup();
  // init both configs
  LoadIniConfig();
  LoadBladeOutConfig();
  SelectActiveConfigForBladeState();
  ApplyGlobalConfig();
}
```

- [x] **Step 5: Run test + compile sanity**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS
g++ -std=c++17 -O0 props/style_registry_tests.cpp -o /tmp/style_registry_tests && /tmp/style_registry_tests
```

Expected: host tests pass and bank command symbols compile.

- [x] **Step 6: Commit**

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS
git add props/saber_ini_config.h props/style_registry_tests.cpp
git commit -m "feat(ini): add explicit bank protocol and fix blade-detect bank activation"
```

---

### Task 4: Companion normalized config model

**Files:**
- Create: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/config/types.ts`
- Create: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/config/normalizeConfig.ts`
- Create/Test: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/config/normalizeConfig.test.ts`
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/parser/iniParser.ts`

- [x] **Step 1: Write failing normalization tests**

```ts
it('builds shared + banked model from blade_in and blade_out INI inputs', () => {
  const doc = normalizeConfig({ bladeInIni, bladeOutIni, hwProfile: { numBlades: 3, numButtons: 2 } })
  expect(doc.shared.global.num_buttons).toBe('2')
  expect(doc.banks.blade_in.presets[0].blades).toHaveLength(3)
  expect(doc.banks.blade_out.presets[0].blades).toHaveLength(3)
})
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
npm test -- src/config/normalizeConfig.test.ts
```

Expected: FAIL because normalization module does not exist.

- [x] **Step 3: Implement normalized types + conversion**

```ts
export interface BladeStyleConfig { style: string; params: Record<string, string> }
export interface PresetConfig { name: string; font: string; track: string; blades: BladeStyleConfig[] }
export interface ConfigDocument {
  hardwareProfile: { numBlades: number; numButtons: number; hasBladeDetect: boolean }
  shared: { global: Record<string, string>; buttonsOn: Record<string, string>; buttonsOff: Record<string, string> }
  banks: { blade_in: { presets: PresetConfig[] }; blade_out: { presets: PresetConfig[] } }
}
```

- [x] **Step 4: Run tests to verify pass**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
npm test -- src/config/normalizeConfig.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
git add src/config/types.ts src/config/normalizeConfig.ts src/config/normalizeConfig.test.ts src/parser/iniParser.ts
git commit -m "feat(companion): add normalized n-blade banked config model"
```

---

### Task 5: Companion serial protocol extensions

**Files:**
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/serial/serialManager.ts`
- Modify/Test: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/serial/serialManager.test.ts`
- Create/Test: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/config/mediaCatalog.ts`
- Create/Test: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/config/mediaCatalog.test.ts`

- [x] **Step 1: Write failing tests for bank and media commands**

```ts
it('sends READ_INI_BANK blade_out and parses ini payload', async () => {
  // expect first write: "READ_INI_BANK blade_out\n"
})
it('collects list_fonts output into array', async () => {
  // expect ["Kestis", "Vader"]
})
```

- [x] **Step 2: Run tests to verify failure**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
npm test -- src/serial/serialManager.test.ts src/config/mediaCatalog.test.ts
```

Expected: FAIL for missing methods/commands.

- [x] **Step 3: Implement serial methods**

```ts
readIniBank(bank: 'blade_in' | 'blade_out'): Promise<string>
writeIniBank(bank: 'blade_in' | 'blade_out', content: string): Promise<boolean>
getHardwareProfile(): Promise<HardwareProfile>
listFonts(): Promise<string[]>
listTracks(font: string): Promise<string[]>
```

- [x] **Step 4: Implement media parsing/validation helpers**

```ts
export function validateMediaReference(value: string, valid: string[]): 'valid' | 'missing'
```

- [x] **Step 5: Run tests to verify pass**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
npm test -- src/serial/serialManager.test.ts src/config/mediaCatalog.test.ts
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
git add src/serial/serialManager.ts src/serial/serialManager.test.ts src/config/mediaCatalog.ts src/config/mediaCatalog.test.ts
git commit -m "feat(companion): add bank protocol and sd media listing support"
```

---

### Task 6: Companion store refactor for bank/preset/blade operations

**Files:**
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/state/configStore.ts`
- Modify/Test: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/state/configStore.test.ts`

- [x] **Step 1: Write failing store tests**

```ts
it('reorders presets in active bank', () => {
  reorderPreset(0, 2)
  expect(getState().doc.banks.blade_in.presets[2].name).toBe('First')
})
it('deletes active preset and updates active index safely', () => {
  deletePreset(1)
  expect(getState().activePresetIndex).toBe(0)
})
it('blocks save when media is missing', async () => {
  await saveToBoard()
  expect(getState().error).toContain('missing')
})
```

- [x] **Step 2: Run tests to verify failure**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
npm test -- src/state/configStore.test.ts
```

Expected: FAIL for missing actions and validation.

- [x] **Step 3: Implement store actions and state**

```ts
activeBank: 'blade_in' | 'blade_out'
activeBladeIndex: number
reorderPreset(from: number, to: number): void
deletePreset(index: number): void
updateBladeParam(presetIndex: number, bladeIndex: number, key: string, value: string): void
```

- [x] **Step 4: Implement save flow for both banks**

```ts
await serialManager.writeIniBank('blade_in', buildBladeInIni(doc))
await serialManager.writeIniBank('blade_out', buildBladeOutIni(doc))
```

- [x] **Step 5: Run tests to verify pass**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
npm test -- src/state/configStore.test.ts
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
git add src/state/configStore.ts src/state/configStore.test.ts
git commit -m "feat(companion): support banked n-blade preset operations and save validation"
```

---

### Task 7: Presets UI unification (remove Tuning tab, add full editor controls)

**Files:**
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/App.tsx`
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/components/PresetEditor.tsx`
- Delete: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/components/StyleTuning.tsx`
- Create: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/components/PresetList.tsx`

- [ ] **Step 1: Write failing UI/store integration tests for tab and list behavior**

```ts
import { render, screen } from '@testing-library/react'
import App from '../App'

it('does not render Tuning tab', () => {
  render(<App />)
  expect(screen.queryByText('Tuning')).toBeNull()
})

it('renders drag handles and delete action for presets', () => {
  render(<PresetEditor />)
  expect(screen.getAllByLabelText('Drag preset')).not.toHaveLength(0)
  expect(screen.getAllByText('Delete')).not.toHaveLength(0)
})

it('renders Blade 1..N editors from hardware profile', () => {
  render(<PresetEditor />)
  expect(screen.getByRole('tab', { name: 'Blade 1' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Blade 2' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
npm test -- src/state/configStore.test.ts src/components/styleTuningConfig.test.ts
```

Expected: FAIL for outdated tab assumptions and missing new interactions.

- [ ] **Step 3: Remove Tuning tab and wire Presets-only tuning**

```tsx
const tabs = [
  { id: 'presets', label: 'Presets', component: <PresetEditor /> },
  { id: 'global', label: 'Global', component: <GlobalSettings /> },
  { id: 'buttons', label: 'Buttons', component: <ButtonMapping /> },
]
```

- [ ] **Step 4: Implement drag-drop reorder + delete UI**

```tsx
// Preset row actions
<button onClick={() => deletePreset(i)}>Delete</button>
// drag handlers call reorderPreset(from, to)
```

- [ ] **Step 5: Implement per-blade full controls and SD selectors**

```tsx
<select
  value={preset.font}
  onChange={(e) => updatePresetMedia(activePresetIndex, { font: e.target.value })}
>
  {fontOptions.map(f => <option key={f} value={f}>{f}</option>)}
</select>
```

- [ ] **Step 6: Run full app test and build**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
npm test
npm run build
```

Expected: tests pass, build succeeds.

- [ ] **Step 7: Commit**

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
git add src/App.tsx src/components/PresetEditor.tsx src/components/PresetList.tsx src/components/StyleTuning.tsx
git commit -m "feat(ui): unify presets tuning and add banked n-blade preset management"
```

---

### Task 8: Fixture/schema updates and release verification

**Files:**
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/parser/fixtures/mhs4_ini.ini`
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/parser/fixtures/mining.ini`
- Create: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/parser/fixtures/blade_out_mhs4.ini`
- Modify/Test: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/src/parser/iniParser.test.ts`

- [ ] **Step 1: Write failing fixture contract tests for new schema**

```ts
it('roundtrips blade_in and blade_out fixtures with per-blade keys', () => {
  const parsed = parseIni(loadFixture('mining.ini'))
  expect(parsed.find(s => s.name === 'preset1')?.params.blade1_style).toBeDefined()
  expect(parsed.find(s => s.name === 'preset1')?.params.blade2_style).toBeDefined()
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
npm test -- src/parser/iniParser.test.ts
```

Expected: FAIL until fixtures + parser expectations are updated.

- [ ] **Step 3: Update fixtures and parser expectations**

```ini
[preset1]
blade1_style=standard
blade2_style=pulse
```

- [ ] **Step 4: Run final verification suite (companion + firmware host tests)**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
npm test
npm run build

cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS
g++ -std=c++17 -O0 props/style_registry_tests.cpp -o /tmp/style_registry_tests && /tmp/style_registry_tests
```

Expected: all commands succeed.

- [ ] **Step 5: Commit**

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
git add src/parser/fixtures src/parser/iniParser.test.ts
git commit -m "test(parser): update fixtures for canonical n-blade schema"
```

---

### Task 9: Device matrix gate

**Files:**
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS/config/mhs4_ini.h`
- Modify: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS/config/mining_ini.h`
- Create: `/Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform/docs/validation/2026-05-20-n-blade-device-matrix.md`

- [ ] **Step 1: Flash representative physical profiles**

Run:

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS
PORT_MHS4=/dev/tty.usbmodemMHS4
PORT_MINING=/dev/tty.usbmodemMINING

arduino-cli compile --fqbn "proffieboard:stm32l4:ProffieboardV2-L433CC:usb=cdc,dosfs=sdspi,speed=80,opt=os" --build-property "compiler.cpp.extra_flags=-DCONFIG_FILE=config/mhs4_ini.h" ProffieOS.ino
arduino-cli upload -p "$PORT_MHS4" --fqbn "proffieboard:stm32l4:ProffieboardV2-L433CC:usb=cdc,dosfs=sdspi,speed=80,opt=os" ProffieOS.ino

arduino-cli compile --fqbn "proffieboard:stm32l4:ProffieboardV2-L433CC:usb=cdc,dosfs=sdspi,speed=80,opt=os" --build-property "compiler.cpp.extra_flags=-DCONFIG_FILE=config/mining_ini.h" ProffieOS.ino
arduino-cli upload -p "$PORT_MINING" --fqbn "proffieboard:stm32l4:ProffieboardV2-L433CC:usb=cdc,dosfs=sdspi,speed=80,opt=os" ProffieOS.ino
```

Expected: each board boots and reports `SaberIni: LOAD_OK`.

- [ ] **Step 2: Validate companion flows per profile**

Checklist:

```text
connect -> read blade_in -> edit -> save -> reboot -> reconnect
switch to blade_out bank -> edit -> save -> reboot -> reconnect
verify drag/drop order and delete reflected in regenerated presets
verify font/track selectors only show SD-backed entries
verify missing media blocks save
```

- [ ] **Step 3: Record pass/fail evidence**

Capture:

```text
- firmware commit SHA
- companion commit SHA
- profile used
- before/after INI snapshots for blade_in and blade_out
- serial logs for save + reboot + reload
```

- [ ] **Step 4: Commit test notes**

```bash
cd /Users/matthew.mcgeary/Copilot_workspace/ProffieOS-Companion/.worktrees/n-blade-platform
git add docs/validation/2026-05-20-n-blade-device-matrix.md
git commit -m "test: record n-blade runtime validation matrix"
```

---

## Self-Review (completed)

1. **Spec coverage:**  
   All approved sections are covered:
   - data model + schema -> Tasks 1, 2, 4
   - protocol + blade detect -> Tasks 3, 5
   - presets UX + tuning unification + reorder/delete + SD pickers -> Tasks 6, 7
   - validation matrix -> Tasks 8, 9
2. **Placeholder scan:**  
   No TODO/TBD markers or unresolved placeholders remain.
3. **Type consistency:**  
   Plan consistently uses shared/global/buttons + banked presets + per-blade style arrays.
