import { describe, expect, it } from 'vitest';
import { buildStyleString } from './styleStringBuilder';

describe('styleStringBuilder', () => {
  it('emits off-state defaults at args 31/32/29', () => {
    const style = buildStyleString({
      style: 'standard',
      params: { base_color: 'Blue', alt_color: 'Cyan' },
    });
    const tokens = style.split(' ');
    expect(tokens[31]).toBe('0,0,0');
    expect(tokens[32]).toBe('1');
    expect(tokens[29]).toBe('1200');
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
    expect(tokens[31]).toBe('65535,0,0');
    expect(tokens[32]).toBe('2');
    expect(tokens[29]).toBe('60000');
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
    expect(tokens[9]).toBe('0,65535,0'); // Green
  });

  it('styleParams override core params for the same key', () => {
    const style = buildStyleString({
      style: 'standard',
      params: { base_color: 'Blue', alt_color: 'Cyan', blast_color: 'White' },
      styleParams: { blast_color: 'Red' },
    });
    const tokens = style.split(' ');
    expect(tokens[9]).toBe('65535,0,0'); // Red from styleParams wins
  });

  it('stab_color at arg16 and ignition_time at arg5 coexist without collision', () => {
    const style = buildStyleString({
      style: 'audio_flicker',
      params: {
        base_color: 'Blue',
        alt_color: 'Cyan',
        stab_color: 'Red',
        ignition_time: '500',
      },
    });
    const tokens = style.split(' ');
    expect(tokens[16]).toBe('65535,0,0'); // stab_color at arg16
    expect(tokens[5]).toBe('500'); // ignition_time stays at arg5
    // Verify other non-colliding canonical positions
    expect(tokens[26]).not.toBe('500'); // retraction_time separate
    expect(tokens[31]).toBe('0,0,0'); // off_color default
    expect(tokens[32]).toBe('1'); // off_option default
  });

  it('handles undefined styleParams gracefully', () => {
    const style = buildStyleString({
      style: 'standard',
      params: { base_color: 'Blue', alt_color: 'Cyan' },
    });
    const tokens = style.split(' ');
    expect(tokens[0]).toBe('ini_standard');
    expect(tokens[1]).toBe('0,0,65535'); // Blue
  });

  it('uses schema parser token and maps style-specific params for hump_flicker', () => {
    const style = buildStyleString({
      style: 'hump_flicker',
      params: { base_color: 'Magenta', alt_color: 'White' },
      styleParams: { hump_amount: '77' },
    });
    const tokens = style.split(' ');
    expect(tokens[0]).toBe('hump_flicker');
    expect(tokens[3]).toBe('77');
    expect(tokens[1]).toBe('65535,0,65535');
  });

  it('correctly maps ALT_COLOR2_ARG to index 33', async () => {
    const { ARG_INDEX_BY_SYMBOL } = await import('../config/styleArgSymbols');
    expect(ARG_INDEX_BY_SYMBOL.ALT_COLOR2_ARG).toBe(33);
  });
});
