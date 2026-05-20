import { useEffect, useState, useRef, useCallback } from 'react';

export const useProffieEngine = () => {
  const [engine, setEngine] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const renderRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('!!! INITIALIZING PROFFIE WASM ENGINE !!!');
    
    // @ts-ignore
    const create = window.createProffieEngine;

    if (!create) {
      console.error('CRITICAL: window.createProffieEngine is MISSING');
      setError('WASM glue failed to load');
      return;
    }

    const init = async () => {
      try {
        console.log('Fetching WASM binary...');
        const response = await fetch('/engine/style_engine.wasm');
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
          console.log('✓ render_style wrapper created');
          setTimeout(() => setIsReady(true), 250);
        } catch (e: any) {
          console.error('✗ Failed to wrap render_style:', e);
          setError(e.message);
        }
      } catch (e: any) {
        console.error('!!! WASM INIT ERROR !!!', e);
        setError(e.message);
      }
    };

    init();
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
    } catch (e: any) {
      if (Math.random() < 0.01) console.error('WASM Exception:', e.message);
      return null;
    }
  }, [engine, isReady]);

  return { engine, render, error, isReady };
};
