import React, { useEffect, useRef } from 'react';
import { useProffieEngine } from '../engine/useProffieEngine';

interface BladeCanvasProps {
  styleString: string;
  numLeds: number;
}

export const BladeCanvas: React.FC<BladeCanvasProps> = ({ styleString, numLeds }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { render, engine, triggerEffect, error, isReady } = useProffieEngine();
  const requestRef = useRef<number>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log('BladeCanvas effect started. Engine:', !!engine, 'Ready:', isReady);

    const animate = (time: number) => {
      // Clear canvas
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!isReady || !engine || !render) {
          // Loading state
          ctx.fillStyle = '#111';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#444';
          ctx.font = '10px monospace';
          ctx.fillText(error ? `WASM ERROR: ${error}` : 'INITIALIZING WASM...', 10, 15);
      } else {
        // Try to get pixels from WASM
        const pixels = render(styleString, time, numLeds);
        
        if (pixels && pixels.length >= numLeds * 3) {
          const ledWidth = canvas.width / numLeds;
          for (let i = 0; i < numLeds; i++) {
            const r = pixels[i * 3 + 0];
            const g = pixels[i * 3 + 1];
            const b = pixels[i * 3 + 2];
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(i * ledWidth, 0, ledWidth, canvas.height);
          }
        } else {
          // If WASM returns nothing (NULL/Parse Fail), show a faint pulse as debug
          const val = Math.floor(60 + 60 * Math.sin(time / 500));
          ctx.fillStyle = `rgb(${val}, 0, 0)`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [styleString, numLeds, engine, render, error, isReady]);

  return (
    <div className="blade-container" style={{ width: '100%', padding: '10px 0' }}>
      {error && <div style={{ color: 'red', fontSize: '12px', marginBottom: '5px' }}>{error}</div>}
      <canvas 
        ref={canvasRef} 
        width={numLeds} 
        height={30} 
        style={{ 
          width: `${Math.min(100, Math.max(5, (numLeds / 144) * 100))}%`, 
          height: '30px', 
          backgroundColor: '#000', 
          borderRadius: '15px', 
          boxShadow: '0 0 15px rgba(255,255,255,0.1)',
          display: 'block',
          marginBottom: '16px',
          imageRendering: 'pixelated'
        }} 
      />
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button 
          onClick={() => triggerEffect?.('clash')}
          style={buttonStyle}
        >Clash</button>
        <button 
          onClick={() => triggerEffect?.('blast')}
          style={buttonStyle}
        >Blast</button>
        <button 
          onClick={() => triggerEffect?.('stab')}
          style={buttonStyle}
        >Stab</button>
        <button 
          onPointerDown={() => triggerEffect?.('lockup', true)}
          onPointerUp={() => triggerEffect?.('lockup', false)}
          onPointerLeave={() => triggerEffect?.('lockup', false)}
          style={buttonStyle}
        >Lockup</button>
        <button 
          onPointerDown={() => triggerEffect?.('drag', true)}
          onPointerUp={() => triggerEffect?.('drag', false)}
          onPointerLeave={() => triggerEffect?.('drag', false)}
          style={buttonStyle}
        >Drag</button>
        <button 
          onPointerDown={() => triggerEffect?.('melt', true)}
          onPointerUp={() => triggerEffect?.('melt', false)}
          onPointerLeave={() => triggerEffect?.('melt', false)}
          style={buttonStyle}
        >Melt</button>
        <button 
          onPointerDown={() => triggerEffect?.('lightning_block', true)}
          onPointerUp={() => triggerEffect?.('lightning_block', false)}
          onPointerLeave={() => triggerEffect?.('lightning_block', false)}
          style={buttonStyle}
        >Lightning</button>
      </div>
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  padding: '6px 12px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 600,
  userSelect: 'none',
  transition: 'opacity 0.2s',
};
