import { describe, expect, it } from 'vitest';
import { BUTTON_ACTIONS, BUTTON_SLOTS, getButtonSlotAction } from './buttonMappingConfig';

const EXPECTED_BUTTON_SLOTS = [
  { id: 0, label: 'Power Click' },
  { id: 1, label: 'Power Long Click' },
  { id: 2, label: 'Power Hold' },
  { id: 3, label: 'Power Long Hold' },
  { id: 4, label: 'Power Double Click' },
  { id: 5, label: 'Aux Click' },
  { id: 6, label: 'Aux Long Click' },
  { id: 7, label: 'Aux Hold' },
  { id: 8, label: 'Aux Long Hold' },
  { id: 9, label: 'Aux Double Click' },
  { id: 10, label: 'Power + Aux Hold' },
  { id: 11, label: 'Aux + Power Hold' },
  { id: 12, label: 'Power + Aux Click' },
  { id: 13, label: 'Aux2 Click' },
  { id: 14, label: 'Aux2 Long Click' },
  { id: 15, label: 'Aux2 Hold' },
  { id: 16, label: 'Aux2 Long Hold' },
  { id: 17, label: 'Aux2 Double Click' },
  { id: 18, label: 'Power + Aux2 Hold' },
  { id: 19, label: 'Aux2 + Power Hold' },
  { id: 20, label: 'Aux + Aux2 Hold' },
  { id: 21, label: 'Aux2 + Aux Hold' },
  { id: 22, label: 'All Buttons Hold' },
  { id: 23, label: 'Power Medium Hold' },
  { id: 24, label: 'Power Double Hold' },
  { id: 25, label: 'Power Triple Click' },
  { id: 26, label: 'Power Triple Hold' },
  { id: 27, label: 'Aux Double Hold' },
  { id: 28, label: 'Aux Triple Click' },
  { id: 29, label: 'Aux2 Double Hold' },
  { id: 30, label: 'Power Mod Clash' },
  { id: 31, label: 'Power Mod Stab' },
  { id: 32, label: 'Power Mod Swing' },
  { id: 33, label: 'Power Mod Twist' },
] as const;

const EXPECTED_ACTIONS = [
  'none',
  'on',
  'off',
  'blast',
  'clash',
  'lockup',
  'drag',
  'melt',
  'lightning_block',
  'force',
  'stab',
  'color_change',
  'next_preset',
  'prev_preset',
  'volume_up',
  'volume_down',
  'track_player',
  'battery_level',
  'quote',
  'enter_color_change',
  'exit_color_change',
  'on_or_volume_up',
  'next_preset_or_volume_down',
  'prev_preset_if_not_volume_menu',
  'activate_muted',
  'toggle_volume_menu',
  'toggle_battle_mode',
  'toggle_multi_blast',
  'force_or_color_change',
  'lockup_or_drag',
] as const;

describe('buttonMappingConfig', () => {
  it('matches firmware slot table with complete ids and labels', () => {
    expect(BUTTON_SLOTS).toEqual(EXPECTED_BUTTON_SLOTS);
  });

  it('matches firmware action_name_table for INI parser actions', () => {
    expect(BUTTON_ACTIONS).toEqual(EXPECTED_ACTIONS);
  });

  it('defaults missing or unknown slot values to none', () => {
    expect(getButtonSlotAction(undefined, 0)).toBe('none');
    expect(getButtonSlotAction({}, 9)).toBe('none');
    expect(getButtonSlotAction({ slot_9: 'invalid_action' }, 9)).toBe('none');
  });

  it('returns valid saved action values', () => {
    expect(getButtonSlotAction({ slot_9: 'blast' }, 9)).toBe('blast');
    expect(getButtonSlotAction({ slot_4: 'enter_color_change' }, 4)).toBe('enter_color_change');
  });

  it('accepts valid action values case-insensitively', () => {
    expect(getButtonSlotAction({ slot_9: 'BLAST' }, 9)).toBe('blast');
    expect(getButtonSlotAction({ slot_4: 'EnTeR_CoLoR_ChAnGe' }, 4)).toBe('enter_color_change');
  });
});
