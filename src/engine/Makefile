EMCC=/Users/mmcgeary/emsdk/upstream/emscripten/emcc
CFLAGS=-O3 -s WASM=1 -s EXPORTED_RUNTIME_METHODS='["cwrap", "HEAPU8", "getValue", "setValue"]' -s EXPORTED_FUNCTIONS='["_render_style", "_malloc", "_free"]' -s ALLOW_MEMORY_GROWTH=1 -s MODULARIZE=1 -s EXPORT_NAME='createProffieEngine' -s STACK_SIZE=8388608 -s INITIAL_MEMORY=33554432 -s ASSERTIONS=1 -fno-exceptions
AFTER=-idirafter ../../../ProffieOS/common -idirafter ../../../ProffieOS/styles -idirafter ../../../ProffieOS/blades -idirafter ../../../ProffieOS/functions -idirafter ../../../ProffieOS/transitions

all: style_engine.js

style_engine.js: style_bridge.cpp
	$(EMCC) $(CFLAGS) $(AFTER) style_bridge.cpp -o style_engine.js

clean:
	rm -f style_engine.js style_engine.wasm
