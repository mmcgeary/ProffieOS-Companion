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

## License

This project is licensed under the same terms as ProffieOS.
