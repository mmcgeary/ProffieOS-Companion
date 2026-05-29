# ProffieOS Companion App

A professional, web-based GUI for configuring ProffieOS 8.x+ post-flash settings. This application eliminates manual editing of `saber_config.ini` by providing a clean interface for preset management, global settings, and real-time style visualization.

## Features

- **Real-time Style Preview**: Uses a WebAssembly-compiled ProffieOS style engine for pixel-perfect, high-fidelity rendering of your blade styles on an HTML5 canvas.
- **Bidirectional Serial Sync**: Read and write `saber_config.ini` directly from/to your Proffieboard via WebSerial.
- **Preset Management**: Easily add, remove, and modify presets, including sound fonts, tracks, and colors.
- **Style Tuning**: Interactive sliders for real-time adjustment of style arguments (flicker speed, depth, etc.).
- **Button Mapping**: Visual interface for configuring button actions for both 'On' and 'Off' states.
- **Global Settings**: Configure volume (0-3000 scale), clash thresholds, gesture toggles, overall blade dimming (0-100%), and hardware timeouts (idle off time, motion timeout, button click timings) dynamically without re-flashing.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **State Management**: Zustand
- **Styling**: Vanilla CSS + Lucide React Icons
- **Serial Communication**: WebSerial API
- **Engine**: ProffieOS C++ style logic compiled to WebAssembly (Emscripten)

## Prerequisites

- **Browser**: Chrome, Edge, or Opera (any browser supporting the WebSerial API).
- **ProffieOS**: Requires ProffieOS 8.0 or later with the `SaberIniConfig` prop enabled.

## Getting Started

### Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

### Building the Style Engine (Optional)

The WebAssembly engine is located in `src/engine`. If you modify the C++ bridge:

1. Ensure [Emscripten](https://emscripten.org/) is installed and `emcc` is on your `PATH`.
2. Run:
   ```bash
   npm run build:engine
   ```
   This compiles `src/engine/style_bridge.cpp` and updates `public/engine/style_engine.js` + `public/engine/style_engine.wasm`.

## Style System and Schema

The Companion app uses a **schema-driven** approach to blade style editing.
A generated style schema (`src/config/generatedStyleSchema.ts`) defines:

- **Shared core parameters** — keys common to all styles (colors, ignition/retraction
  timing, effect sizes, animation variants). Some of these are hardcoded in the
  firmware parser as `bladeN_<key>`; the rest must use `bladeN_param.<name>`.
  See `props/saber_styles_reference.md` in the firmware repo for which is which.
- **Style-specific parameters** — additional knobs exposed by individual styles,
  written as `bladeN_param.<name>` in the INI file.

### How It Works

1. The schema is generated from the firmware style templates by
   `props/tools/generate_style_schema.py` (in the **firmware** repo).
2. The Companion reads the schema at build time and renders editor controls
   for each parameter automatically.
3. When you change a value in the UI, the Companion writes the correct
   `bladeN_<key>` (for hardcoded keys) or `bladeN_param.<name>` (for
   schema params) key to the INI section.
4. The firmware INI loader reads the same keys and feeds them into the C++
   style template engine.

### INI Key Format

```ini
[preset1]
font = bank/font1
blade1_style = standard
blade1_base_color = dodgerblue
blade1_ignition_time = 300
blade1_param.style_option = 2
```

- `blade1_style` — selects the style template.
- `blade1_<key>` — sets a hardcoded core parameter (e.g. `base_color`,
  `ignition_time`). Only keys recognised by the firmware parser work here.
- `blade1_param.<name>` — sets a schema-defined named parameter. Required for
  keys not hardcoded in the parser (e.g. `style_option`, `preon_size`).

See `props/saber_styles_reference.md` in the firmware repo for the full
parameter reference.

## Global Settings & Timeouts

The Companion App allows you to configure deep hardware settings that previously required a re-flash in ProffieOS:

- **Volume**: A precise `0-3000` scale.
- **Blade Dimming**: Overall brightness scaling from `0-100%`.
- **Timeouts**: Configure deep sleep `idle_off_time`, gesture `motion_timeout`, and button click timings dynamically.

These are written to the `[global]` block of your `saber_config.ini`.

## License

This project is licensed under the same terms as ProffieOS.
