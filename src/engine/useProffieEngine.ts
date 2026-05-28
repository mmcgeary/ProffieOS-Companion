import { useEffect, useState, useRef, useCallback } from 'react';

type RenderStyle = (styleString: string, timeMs: number, numLeds: number) => number;

interface ProffieEngineInstance {
  HEAPU8?: Uint8Array;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cwrap: (name: string, returnType: string | null, argTypes: readonly string[]) => (...args: any[]) => any;
}

interface CreateProffieEngineOptions {
  wasmBinary: ArrayBuffer;
  print: (text: string) => void;
  printErr: (text: string) => void;
}

type CreateProffieEngine = (options: CreateProffieEngineOptions) => Promise<ProffieEngineInstance>;

declare global {
  interface Window {
    createProffieEngine?: CreateProffieEngine;
  }
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return 'Unknown WASM error';
};

export const useProffieEngine = () => {
  const [engine, setEngine] = useState<ProffieEngineInstance | null>(null);
  const [error, setError] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.createProffieEngine ? null : 'WASM glue failed to load';
  });
  const renderRef = useRef<RenderStyle | null>(null);
  const [isReady, setIsReady] = useState(false);

  const triggerClashRef = useRef<() => void | null>(null);
  const triggerBlastRef = useRef<() => void | null>(null);
  const triggerStabRef = useRef<() => void | null>(null);
  const setLockupRef = useRef<(type: number) => void | null>(null);

  useEffect(() => {
    console.log('!!! INITIALIZING PROFFIE WASM ENGINE !!!');

    const create = window.createProffieEngine;

    if (!create) {
      console.error('CRITICAL: window.createProffieEngine is MISSING');
      return;
    }

    const init = async () => {
      try {
        console.log('Fetching WASM binary...');
        const response = await fetch(`/engine/style_engine.wasm?v=${Date.now()}`);
        if (!response.ok) throw new Error(`Failed to fetch WASM: ${response.status} ${response.statusText}`);
        const wasmBinary = await response.arrayBuffer();
        console.log('WASM binary fetched, size:', wasmBinary.byteLength);

        const instance = await create({
          wasmBinary,
          print: (text: string) => console.log('[WASM-STDOUT] ' + text),
          printErr: (text: string) => console.error('[WASM-STDERR] ' + text),
        });

        console.log('!!! PROFFIE WASM INSTANCE LOADED !!!');
        setEngine(instance);
        
        try {
          renderRef.current = instance.cwrap('render_style', 'number', ['string', 'number', 'number']);
          triggerClashRef.current = instance.cwrap('trigger_clash', null, []);
          triggerBlastRef.current = instance.cwrap('trigger_blast', null, []);
          triggerStabRef.current = instance.cwrap('trigger_stab', null, []);
          setLockupRef.current = instance.cwrap('set_lockup', null, ['number']);
          console.log('✓ WASM wrappers created');
          setError(null);
          setTimeout(() => setIsReady(true), 250);
        } catch (error: unknown) {
          console.error('✗ Failed to wrap functions:', error);
          setError(getErrorMessage(error));
        }
      } catch (error: unknown) {
        console.error('!!! WASM INIT ERROR !!!', error);
        setError(getErrorMessage(error));
      }
    };

    void init();
  }, []);

  const render = useCallback((styleString: string, timeMs: number, numLeds: number) => {
    if (!isReady || !renderRef.current || !engine || !styleString) return null;
    
    // HEAPU8 must be accessed fresh every frame in case of memory growth/detachment
    const heap = engine.HEAPU8;
    if (!heap) {
      if (Math.random() < 0.01) console.warn('WASM HEAPU8 missing');
      return null;
    }

    try {
      const ptr = renderRef.current(styleString, timeMs, numLeds);
      if (!ptr) {
        if (Math.random() < 0.01) console.error('WASM render_style returned NULL');
        return null;
      }
      
      // Use the actual underlying buffer from the fresh heap reference
      return new Uint8Array(heap.buffer, ptr, numLeds * 3);
    } catch (error: unknown) {
      if (Math.random() < 0.01) console.error('WASM Exception:', getErrorMessage(error));
      return null;
    }
  }, [engine, isReady]);

  const triggerEffect = useCallback((effectName: string, state?: boolean) => {
    if (!isReady) return;
    switch (effectName) {
      case 'clash':
        if (triggerClashRef.current) triggerClashRef.current();
        break;
      case 'blast':
        if (triggerBlastRef.current) triggerBlastRef.current();
        break;
      case 'stab':
        if (triggerStabRef.current) triggerStabRef.current();
        break;
      case 'lockup':
        if (setLockupRef.current) setLockupRef.current(state ? 1 : 0); // LOCKUP_NORMAL is 1, LOCKUP_NONE is 0
        break;
      case 'drag':
        if (setLockupRef.current) setLockupRef.current(state ? 2 : 0); // LOCKUP_DRAG is 2
        break;
      case 'melt':
        if (setLockupRef.current) setLockupRef.current(state ? 3 : 0); // LOCKUP_MELT is 3
        break;
      case 'lightning_block':
        if (setLockupRef.current) setLockupRef.current(state ? 4 : 0); // LOCKUP_LIGHTNING_BLOCK is 4
        break;
    }
  }, [isReady]);

  return { engine, render, triggerEffect, error, isReady };
};
