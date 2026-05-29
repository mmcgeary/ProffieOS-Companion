import { describe, expect, it } from 'vitest';
import { ARG_INDEX_BY_SYMBOL } from './styleArgSymbols';

describe('styleArgSymbols', () => {
  it('correctly registers selectable layer argument symbols (slots 65 to 74)', () => {
    expect(ARG_INDEX_BY_SYMBOL['CLASH_MODE_ARG']).toBe(65);
    expect(ARG_INDEX_BY_SYMBOL['BLAST_MODE_ARG']).toBe(66);
    expect(ARG_INDEX_BY_SYMBOL['LOCKUP_MODE_ARG']).toBe(67);
    expect(ARG_INDEX_BY_SYMBOL['IGNITION_MODE_ARG']).toBe(68);
    expect(ARG_INDEX_BY_SYMBOL['RETRACTION_MODE_ARG']).toBe(69);
    expect(ARG_INDEX_BY_SYMBOL['CLASH_WIDTH_ARG']).toBe(70);
    expect(ARG_INDEX_BY_SYMBOL['BLAST_SIZE_ARG']).toBe(71);
    expect(ARG_INDEX_BY_SYMBOL['BLAST_SPEED_ARG']).toBe(72);
    expect(ARG_INDEX_BY_SYMBOL['SPARK_COLOR_ARG']).toBe(73);
    expect(ARG_INDEX_BY_SYMBOL['SPARK_SIZE_ARG']).toBe(74);
  });
});
