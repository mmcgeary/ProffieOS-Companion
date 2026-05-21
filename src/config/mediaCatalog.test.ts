import { describe, expect, it } from 'vitest';

import { parseMediaListing, validateMediaReference } from './mediaCatalog';

describe('mediaCatalog', () => {
  it('parses media listing lines into a trimmed array', () => {
    expect(
      parseMediaListing([
        '',
        '---BEGIN_LIST---',
        'Kestis',
        '  Vader  ',
        '---END_LIST---',
      ])
    ).toEqual(['Kestis', 'Vader']);
  });

  it('returns valid when value exists in media list', () => {
    expect(validateMediaReference('Kestis/', ['Kestis', 'Vader'])).toBe('valid');
  });

  it('returns missing when value is not present', () => {
    expect(validateMediaReference('Kenobi', ['Kestis', 'Vader'])).toBe('missing');
  });
});
