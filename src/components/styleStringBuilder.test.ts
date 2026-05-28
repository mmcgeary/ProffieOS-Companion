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
    // hump_amount maps to HUMP_WIDTH_ARG (index 59) per firmware ini_style_arg_ids.h
    expect(tokens[59]).toBe('77');
    expect(tokens[1]).toBe('65535,0,65535');
  });

  it('correctly maps ALT_COLOR2_ARG to index 33', async () => {
    const { ARG_INDEX_BY_SYMBOL } = await import('../config/styleArgSymbols');
    expect(ARG_INDEX_BY_SYMBOL.ALT_COLOR2_ARG).toBe(33);
  });

  it('correctly maps flicker_depth to index 39 via schema FLICKER_DEPTH_ARG', () => {
    const blade = {
      style: 'audio_flicker',
      params: { base_color: 'Red', alt_color: 'White' },
      styleParams: { flicker_depth: '12000' }
    };
    const styleString = buildStyleString(blade);
    const args = styleString.split(' ');
    expect(args[39]).toBe('12000');
  });

  it('places pulsing_stripes params at correct extended arg positions', () => {
    const styleString = buildStyleString({
      style: 'pulsing_stripes',
      params: { base_color: 'Red' },
      styleParams: { stripe_width: '200', stripe_speed: '100', pulse_rate: '50' },
    });
    const args = styleString.split(' ');
    expect(args[41]).toBe('200'); // STRIPE_WIDTH_ARG
    expect(args[42]).toBe('100'); // STRIPE_SPEED_ARG
    expect(args[58]).toBe('50');  // PULSE_SPEED_ARG
  });

  it('places energy_blade stripe params at correct arg positions', () => {
    const styleString = buildStyleString({
      style: 'energy_blade',
      params: { base_color: 'Blue' },
      styleParams: { stripe_width: '150', stripe_speed: '75' },
    });
    const args = styleString.split(' ');
    expect(args[41]).toBe('150'); // STRIPE_WIDTH_ARG
    expect(args[42]).toBe('75');  // STRIPE_SPEED_ARG
  });

  it('places lava_blade pulse_rate at PULSE_SPEED_ARG (58)', () => {
    const styleString = buildStyleString({
      style: 'lava_blade',
      params: { base_color: 'Red' },
      styleParams: { pulse_rate: '30' },
    });
    const args = styleString.split(' ');
    expect(args[58]).toBe('30'); // PULSE_SPEED_ARG
  });

  it('places IniCoreWrapper extended effect params at positions 53–57', () => {
    const styleString = buildStyleString({
      style: 'audio_flicker',
      params: {
        base_color: 'Red',
        lockup_fade: '500',
        clash_fade: '300',
        lockup_size: '128',
        melt_base: 'Red',
        melt_alt: 'Yellow',
      },
      styleParams: {},
    });
    const args = styleString.split(' ');
    expect(args[53]).toBe('500');           // LOCKUP_FADE_ARG
    expect(args[54]).toBe('300');           // CLASH_FADE_ARG
    expect(args[55]).toBe('128');           // LOCKUP_SIZE_ARG
    expect(args[56]).toBe('65535,0,0');     // MELT_BASE_ARG (Red as R,G,B)
    expect(args[57]).toBe('65535,65535,0'); // MELT_ALT_ARG (Yellow as R,G,B)
  });

  it('maps extended arg symbols correctly in ARG_INDEX_BY_SYMBOL', async () => {
    const { ARG_INDEX_BY_SYMBOL } = await import('../config/styleArgSymbols');
    expect(ARG_INDEX_BY_SYMBOL.LOCKUP_FADE_ARG).toBe(53);
    expect(ARG_INDEX_BY_SYMBOL.CLASH_FADE_ARG).toBe(54);
    expect(ARG_INDEX_BY_SYMBOL.LOCKUP_SIZE_ARG).toBe(55);
    expect(ARG_INDEX_BY_SYMBOL.MELT_BASE_ARG).toBe(56);
    expect(ARG_INDEX_BY_SYMBOL.MELT_ALT_ARG).toBe(57);
    expect(ARG_INDEX_BY_SYMBOL.PULSE_SPEED_ARG).toBe(58);
    expect(ARG_INDEX_BY_SYMBOL.HUMP_WIDTH_ARG).toBe(59);
    expect(ARG_INDEX_BY_SYMBOL.STRIPE_WIDTH_ARG).toBe(41);
    expect(ARG_INDEX_BY_SYMBOL.STRIPE_SPEED_ARG).toBe(42);
  });
});
