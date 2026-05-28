#include <vector>
#include <stdint.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <cstdlib>
#include <iostream>
#include <string.h>
#include <emscripten.h>

// 1. Core Mocks & Macros
#define interrupts() do {} while(0)
#define noInterrupts() do {} while(0)
#define NELEM(X) (sizeof(X)/sizeof((X)[0]))
#define SCOPED_PROFILER() do { } while(0)
#define NUM_BLADES 1
const int maxLedsPerStrip = 1024;

#define PROFFIE_TEST
#define COMMON_FUSE_H
#define StyleAllocator class StyleFactory*
#define HEX 16
#define ENABLE_AUDIO

template<class T, class U> struct is_same_type { static const bool value = false; };
template<class T> struct is_same_type<T, T> { static const bool value = true; };

struct V3 { V3(float v) { x=y=z=v; } float x, y, z; };
struct MockFuse {
  float angle1() { return 0.0; }
  float angle2() { return 0.0; }
  float swing_speed() { return 0.0; }
  float swing_accel() { return 0.0; }
  float twist_accel() { return 0.0; }
  V3 gyro() { return V3(0.0); }
};
MockFuse fusor;

char* itoa(int value, char* str, int radix) {
  if (radix == 16) sprintf(str, "%x", value);
  else sprintf(str, "%d", value);
  return str;
}

uint32_t micros_ = 0;
uint32_t micros() { return micros_; }
uint32_t millis() { return micros_ / 1000; }

uint32_t xorshift32() {
  static uint32_t state = 1;
  uint32_t x = state;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  state = x;
  return x;
}

int random(int x) { 
  if (x <= 0) return 0;
  return xorshift32() % x; 
}

struct MockDynamicMixer {
  int32_t last_sample() const { 
    return (int32_t)(4000.0f * sinf(micros_ * 0.000005f * 2.0f * M_PI));
  }
  int32_t last_sum() const { 
    // Combine a 1 Hz pulse with high-frequency noise to accurately simulate chaotic audio hum
    float base = 12000.0f + 2000.0f * sinf(micros_ * 0.000002f * 2.0f * M_PI);
    float noise = (xorshift32() % 2000) - 1000.0f;
    return (int32_t)(base + noise);
  }
  int32_t audio_volume() const { return 100000; }
};
MockDynamicMixer dynamic_mixer;

class Looper { public: static void DoHFLoop() {} };

struct MockBatteryMonitor {
  float battery() { return 4.2; }
  float battery_percent() { return 100.0; }
};
MockBatteryMonitor battery_monitor;

// 2. Concrete Printer
#include "../../../ProffieOS/common/common.h"
#include "../../../ProffieOS/common/math.h"
#include "../../../ProffieOS/common/range.h"
#include "../../../ProffieOS/common/sin_table.h"
#include "../../../ProffieOS/common/stdout.h"

class WASMPrinter : public Print {
public:
  size_t write(uint8_t c) override {
    putchar(c);
    return 1;
  }
  size_t write(const uint8_t *buffer, size_t size) override {
    for (size_t i = 0; i < size; i++) putchar(buffer[i]);
    return size;
  }
};

WASMPrinter wasm_printer;
Print* default_output = &wasm_printer;
Print* stdout_output = &wasm_printer;
ConsoleHelper STDOUT;

#include "../../../ProffieOS/common/monitoring.h"
Monitoring monitor;

#include "../../../ProffieOS/common/color.h"
#include "../../../ProffieOS/blades/blade_base.h"
#include "../../../ProffieOS/blades/blade_wrapper.h"

#include "../../../ProffieOS/common/malloc_helper.h"
#include "../../../ProffieOS/common/onceperblade.h"
#include "../../../ProffieOS/common/preset.h"
#include "../../../ProffieOS/common/blade_config.h"
#include "../../../ProffieOS/common/command_parser.h"
#include "../../../ProffieOS/common/arg_parser.h"

// Persistent ArgParser state
static char g_persistent_style_str[4096] = {0};
static ArgParser* g_current_ap = nullptr;
ArgParserInterface* CurrentArgParser = nullptr;

class WASMBlade : public BladeBase {
public:
  uint8_t* output_buffer;
  int num_leds_val;

  WASMBlade(uint8_t* buf, int n) : output_buffer(buf), num_leds_val(n) {}

  int num_leds() const override { return num_leds_val; }
  int GetBladeNumber() const override { return 0; }
  Color8::Byteorder get_byteorder() const override { return Color8::RGB; }
  bool is_powered() const override { return true; }
  bool is_on() const override { return true; }
  void set(int led, Color16 c) override {
    if (led >= 0 && led < num_leds_val && output_buffer) {
      output_buffer[led * 3 + 0] = c.r >> 8;
      output_buffer[led * 3 + 1] = c.g >> 8;
      output_buffer[led * 3 + 2] = c.b >> 8;
    }
  }
  void set_overdrive(int led, Color16 c) override { set(led, c); }
  void allow_disable() override {}
  void Activate(int blade_number) override {}
  void Deactivate() override {}
  void SetStyle(BladeStyle* style) override { current_style_ = style; }
  BladeStyle* UnSetStyle() override { return current_style_; }
  BladeStyle* current_style() const override { return current_style_; }
protected:
  BladeStyle *current_style_ = nullptr;
};

static WASMBlade g_wasm_blade(nullptr, 1024);
static Preset dummy_presets_val[] = { { "WASM", "track1.wav", nullptr, "WASM" } };
static BladeConfig dummy_config_val = { 0, &g_wasm_blade, dummy_presets_val, 1, "wasm" };
BladeConfig* current_config = &dummy_config_val;

// 3. Include Styles & Functions
#include "../../../ProffieOS/styles/blade_style.h"
#include "../../../ProffieOS/styles/rgb.h"
#include "../../../ProffieOS/styles/rgb_arg.h"
#include "../../../ProffieOS/styles/charging.h"
#include "../../../ProffieOS/styles/fire.h"
#include "../../../ProffieOS/styles/sparkle.h"
#include "../../../ProffieOS/styles/gradient.h"
#include "../../../ProffieOS/styles/random_flicker.h"
#include "../../../ProffieOS/styles/random_per_led_flicker.h"
#include "../../../ProffieOS/styles/audio_flicker.h"
#include "../../../ProffieOS/styles/brown_noise_flicker.h"
#include "../../../ProffieOS/styles/hump_flicker.h"
#include "../../../ProffieOS/styles/rainbow.h"
#include "../../../ProffieOS/styles/color_cycle.h"
#include "../../../ProffieOS/styles/cylon.h"
#include "../../../ProffieOS/styles/ignition_delay.h"
#include "../../../ProffieOS/styles/retraction_delay.h"
#include "../../../ProffieOS/styles/pulsing.h"
#include "../../../ProffieOS/styles/blinking.h"
#include "../../../ProffieOS/styles/on_spark.h"
#include "../../../ProffieOS/styles/rgb_cycle.h"
#include "../../../ProffieOS/styles/clash.h"
#include "../../../ProffieOS/styles/lockup.h"
#include "../../../ProffieOS/styles/blast.h"
#include "../../../ProffieOS/styles/strobe.h"
#include "../../../ProffieOS/styles/inout_helper.h"
#include "../../../ProffieOS/styles/inout_sparktip.h"
#include "../../../ProffieOS/styles/colors.h"
#include "../../../ProffieOS/styles/layers.h"
#include "../../../ProffieOS/styles/mix.h"
#include "../../../ProffieOS/styles/style_ptr.h"
#include "../../../ProffieOS/styles/stripes.h"
#include "../../../ProffieOS/styles/random_blink.h"
#include "../../../ProffieOS/styles/sequence.h"
#include "../../../ProffieOS/styles/rotate_color.h"
#include "../../../ProffieOS/styles/transition_effect.h"
#include "../../../ProffieOS/styles/transition_loop.h"
#include "../../../ProffieOS/styles/color_select.h"
#include "../../../ProffieOS/styles/remap.h"
#include "../../../ProffieOS/styles/edit_mode.h"

// Functions
#include "../../../ProffieOS/functions/svf.h"
#include "../../../ProffieOS/functions/int.h"
#include "../../../ProffieOS/functions/int_arg.h"
#include "../../../ProffieOS/functions/sin.h"
#include "../../../ProffieOS/functions/scale.h"
#include "../../../ProffieOS/functions/bump.h"
#include "../../../ProffieOS/functions/smoothstep.h"
#include "../../../ProffieOS/functions/swing_speed.h"
#include "../../../ProffieOS/functions/sound_level.h"
#include "../../../ProffieOS/functions/blade_angle.h"
#include "../../../ProffieOS/functions/variation.h"
#include "../../../ProffieOS/functions/twist_angle.h"
#include "../../../ProffieOS/functions/layer_functions.h"
#include "../../../ProffieOS/functions/islessthan.h"
#include "../../../ProffieOS/functions/mult.h"
#include "../../../ProffieOS/functions/wavlen.h"
#include "../../../ProffieOS/functions/effect_position.h"
#include "../../../ProffieOS/functions/sum.h"
#include "../../../ProffieOS/functions/ramp.h"
#include "../../../ProffieOS/functions/center_dist.h"
#include "../../../ProffieOS/functions/hold_peak.h"
#include "../../../ProffieOS/functions/clash_impact.h"
#include "../../../ProffieOS/functions/effect_increment.h"
#include "../../../ProffieOS/functions/clamp.h"

// Transitions
#include "../../../ProffieOS/transitions/base.h"
#include "../../../ProffieOS/transitions/instant.h"
#include "../../../ProffieOS/transitions/fade.h"
#include "../../../ProffieOS/transitions/join.h"
#include "../../../ProffieOS/transitions/concat.h"
#include "../../../ProffieOS/transitions/delay.h"
#include "../../../ProffieOS/transitions/wipe.h"
#include "../../../ProffieOS/transitions/boing.h"
#include "../../../ProffieOS/transitions/random.h"
#include "../../../ProffieOS/transitions/colorcycle.h"
#include "../../../ProffieOS/transitions/wave.h"
#include "../../../ProffieOS/transitions/extend.h"
#include "../../../ProffieOS/transitions/loop.h"

#include "../../../ProffieOS/styles/legacy_styles.h"
#include "../../../ProffieOS/styles/responsive_styles.h"
#include "../../../ProffieOS/styles/style_parser.h"

#include "../../../ProffieOS/common/saber_base.h"

// 4. Implement missing SaberBase static members
SaberBase::LockupType SaberBase::lockup_ = SaberBase::LOCKUP_NONE;
uint32_t SaberBase::current_variation_ = 0;
SaberBase::ColorChangeMode SaberBase::color_change_mode_ = SaberBase::COLOR_CHANGE_MODE_NONE;
float SaberBase::sound_length = 0.0;
int SaberBase::sound_number = -1;
uint32_t SaberBase::last_motion_request_ = 0;
float SaberBase::clash_strength_ = 0.0;

// Re-defining these here to ensure they are visible to the bridge
CommandParser* parsers = NULL;
SaberBase* saberbases = NULL;

extern "C" void __cxa_pure_virtual() {
  printf("!!! WASM PURE VIRTUAL FUNCTION CALL !!!\n");
  abort();
}

static uint8_t* g_rgb_buffer = nullptr;
static BladeStyle* g_current_style = nullptr;
static char g_last_style_string[4096] = {0};
static float g_start_time = -1.0f;

extern "C" {

EMSCRIPTEN_KEEPALIVE
uint8_t* render_style(const char* styleString, float time_ms, int numLeds) {
  if (!styleString) return nullptr;
  if (numLeds > 1024) numLeds = 1024;
  
  if (!g_rgb_buffer) {
      g_rgb_buffer = (uint8_t*)malloc(1024 * 3);
      g_wasm_blade.output_buffer = g_rgb_buffer;
  }

  // Ensure blade is powered on for rendering
  if (SaberBase::OnBlades().off()) {
      SaberBase::TurnOn();
      printf("[WASM] Blade Power: ON\n");
  }

  if (g_start_time < 0) g_start_time = time_ms;
  micros_ = (uint32_t)((time_ms - g_start_time) * 1000.0f);

  if (strcmp(styleString, g_last_style_string) != 0) {
    printf("[WASM] Marker 1: Parsing new style\n");
    if (g_current_style) {
      g_wasm_blade.SetStyle(nullptr);
      delete g_current_style;
      g_current_style = nullptr;
    }
    if (g_current_ap) {
      delete g_current_ap;
      g_current_ap = nullptr;
      CurrentArgParser = nullptr;
    }
    
    // Reset start time to keep micros_ manageable for new style
    g_start_time = time_ms;
    micros_ = 0;

    // Setup persistent ArgParser with guaranteed null termination
    memset(g_persistent_style_str, 0, sizeof(g_persistent_style_str));
    strncpy(g_persistent_style_str, styleString, sizeof(g_persistent_style_str)-1);
    
    // Manual skip of the first word (style name)
    const char* args_ptr = g_persistent_style_str;
    while (*args_ptr && *args_ptr != ' ' && *args_ptr != '\t') args_ptr++;
    while (*args_ptr && (*args_ptr == ' ' || *args_ptr == '\t')) args_ptr++;

    g_current_ap = new ArgParser(args_ptr);
    CurrentArgParser = g_current_ap;

    printf("[WASM] Marker 2: Parsing args\n");
    NamedStyle* ns = style_parser.FindStyle(g_persistent_style_str);
    if (ns) {
      printf("[WASM] Marker 3: Found %s, making style...\n", ns->name);
      g_current_style = ns->style_allocator->make();
      if (g_current_style) {
        printf("[WASM] Marker 4: Success, activating...\n");
        g_current_style->activate();
        g_wasm_blade.SetStyle(g_current_style);
        printf("[WASM] Marker 4.5: Activate complete\n");
      } else {
        printf("[WASM] Marker 3 ERROR: Allocator failed\n");
      }
    } else {
      printf("[WASM] Marker 3 ERROR: Style NOT FOUND\n");
    }
    
    memset(g_last_style_string, 0, sizeof(g_last_style_string));
    strncpy(g_last_style_string, styleString, sizeof(g_last_style_string)-1);
  }

  if (g_current_style) {
    g_wasm_blade.num_leds_val = numLeds;
    // Set CurrentArgParser again just in case run() needs it
    CurrentArgParser = g_current_ap;
    
    // Only log Marker 5 once per style change or occasionally to avoid spam
    static char g_logged_style[4096] = {0};
    if (strcmp(styleString, g_logged_style) != 0) {
        printf("[WASM] Marker 5: Calling first run()\n");
        g_current_style->run(&g_wasm_blade);
        printf("[WASM] Marker 6: First run complete\n");
        strncpy(g_logged_style, styleString, sizeof(g_logged_style)-1);
    } else {
        g_current_style->run(&g_wasm_blade);
    }
  } else {
    memset(g_rgb_buffer, 0, numLeds * 3);
  }

  return g_rgb_buffer;
}

}
