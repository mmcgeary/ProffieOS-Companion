EMCC ?= $(shell command -v emcc)
CFLAGS=-O3 -s WASM=1 -s EXPORTED_RUNTIME_METHODS='["cwrap", "HEAPU8", "getValue", "setValue"]' -s EXPORTED_FUNCTIONS='["_render_style", "_malloc", "_free"]' -s ALLOW_MEMORY_GROWTH=1 -s MODULARIZE=1 -s EXPORT_NAME='createProffieEngine' -s STACK_SIZE=8388608 -s INITIAL_MEMORY=33554432 -s ASSERTIONS=1 -fno-exceptions
AFTER=-idirafter ../../../ProffieOS/.worktrees/construction-alpha-readiness/common -idirafter ../../../ProffieOS/.worktrees/construction-alpha-readiness/styles -idirafter ../../../ProffieOS/.worktrees/construction-alpha-readiness/blades -idirafter ../../../ProffieOS/.worktrees/construction-alpha-readiness/functions -idirafter ../../../ProffieOS/.worktrees/construction-alpha-readiness/transitions

ifeq ($(EMCC),)
$(error emcc not found in PATH. Run `source <emsdk>/emsdk_env.sh` or set EMCC=/full/path/to/emcc)
endif

all: style_engine.js

style_engine.js: style_bridge.cpp
	$(EMCC) $(CFLAGS) $(AFTER) style_bridge.cpp -o style_engine.js

clean:
	rm -f style_engine.js style_engine.wasm
