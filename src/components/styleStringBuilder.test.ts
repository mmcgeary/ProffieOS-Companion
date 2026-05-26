import { describe, expect, it } from 'vitest';
import { buildStyleString } from './styleStringBuilder';

describe('styleStringBuilder', () => {
  it('emits off-state defaults at args 14/15/16', () => {
    const style = buildStyleString({
      style: 'standard',
      params: { base_color: 'Blue', alt_color: 'Cyan' },
    });
    const tokens = style.split(' ');
    expect(tokens[14]).toBe('0,0,0');
    expect(tokens[15]).toBe('1');
    expect(tokens[16]).toBe('1200');
  });

  it('emits explicit off-state values and clamps off_rate_ms', () => {
    const style = buildStyleString({
      style: 'standard',
      params: {
        base_color: 'Blue',
        alt_color: 'Cyan',
        off_color: 'Red',
        off_mode: 'random',
        off_rate_ms: '65000',
      },
    });
    const tokens = style.split(' ');
    expect(tokens[14]).toBe('65535,0,0');
    expect(tokens[15]).toBe('2');
    expect(tokens[16]).toBe('60000');
  });

  it('places styleParams at schema-driven arg positions alongside core params', () => {
    const style = buildStyleString({
      style: 'standard',
      params: { base_color: 'Red', alt_color: 'Cyan' },
      styleParams: { blast_color: 'Green' },
    });
    const tokens = style.split(' ');
    // core params at their positions
    expect(tokens[1]).toBe('65535,0,0'); // Red
    expect(tokens[2]).toBe('0,65535,65535'); // Cyan
    // styleParams blast_color placed via schema arg_symbol lookup
    expect(tokens[5]).toBe('0,65535,0'); // Green
  });

  it('styleParams override core params for the same key', () => {
    const style = buildStyleString({
      style: 'standard',
      params: { base_color: 'Blue', alt_color: 'Cyan', blast_color: 'White' },
      styleParams: { blast_color: 'Red' },
    });
    const tokens = style.split(' ');
    expect(tokens[5]).toBe('65535,0,0'); // Red from styleParams wins
  });
});
