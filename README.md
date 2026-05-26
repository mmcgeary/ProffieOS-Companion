# ProffieOS Companion App

A professional, web-based GUI for configuring ProffieOS 8.x+ post-flash settings. This application eliminates manual editing of `saber_config.ini` by providing a clean interface for preset management, global settings, and real-time style visualization.

## Features

- **Real-time Style Preview**: Uses a WebAssembly-compiled ProffieOS style engine for pixel-perfect, high-fidelity rendering of your blade styles on an HTML5 canvas.
- **Bidirectional Serial Sync**: Read and write `saber_config.ini` directly from/to your Proffieboard via WebSerial.
- **Preset Management**: Easily add, remove, and modify presets, including sound fonts, tracks, and colors.
- **Style Tuning**: Interactive sliders for real-time adjustment of style arguments (flicker speed, depth, etc.).
- **Button Mapping**: Visual interface for configuring button actions for both 'On' and 'Off' states.
- **Global Settings**: Configure volume, clash thresholds, and gesture flags without re-flashing.

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

1. Ensure [Emscripten](https://emscripten.org/) is installed.
2. Run `make` in `src/engine/`.
3. Copy the resulting `style_engine.js` and `style_engine.wasm` to `public/engine/`.

## Style System and Schema

The Companion app uses a **schema-driven** approach to blade style editing.
A generated style schema (`src/config/generatedStyleSchema.ts`) defines:

- **Shared core parameters** — keys common to all styles (colors, ignition/retraction
  timing, effect sizes, animation variants). These produce the `bladeN_<key>` INI keys.
- **Style-specific parameters** — additional knobs exposed by individual styles,
  written as `bladeN_param.<name>` in the INI file.

### How It Works

1. The schema is generated from the firmware style templates by
   `props/tools/generate_style_schema.py`.
2. The Companion reads the schema at build time and renders editor controls
   for each parameter automatically.
3. When you change a value in the UI, the Companion writes the correct
   `bladeN_<key>` or `bladeN_param.<name>` key to the INI section.
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
- `blade1_<key>` — sets a shared core parameter (e.g. `base_color`,
  `ignition_time`).
- `blade1_param.<name>` — sets a style-specific named parameter.

See `props/saber_styles_reference.md` in the firmware repo for the full
parameter reference.

## License

This project is licensed under the same terms as ProffieOS.
