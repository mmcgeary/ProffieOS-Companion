const LIST_BEGIN_MARKERS = new Set(['---BEGIN_LIST---', 'BEGIN_LIST']);
const LIST_END_MARKERS = new Set(['---END_LIST---', 'END_LIST']);

const normalizeMediaValue = (value: string): string => {
  return value
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .toLowerCase();
};

export function parseMediaListing(lines: string[]): string[] {
  const collected: string[] = [];
  const seen = new Set<string>();
  const markerMode = lines.some((line) => LIST_BEGIN_MARKERS.has(line.trim().toUpperCase()));
  let capturing = !markerMode;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const upper = line.toUpperCase();
    if (LIST_BEGIN_MARKERS.has(upper)) {
      capturing = true;
      continue;
    }
    if (LIST_END_MARKERS.has(upper)) {
      if (markerMode) {
        break;
      }
      continue;
    }
    if (!capturing) {
      continue;
    }
    if (line.toLowerCase().startsWith('list_')) {
      continue;
    }

    if (!seen.has(line)) {
      seen.add(line);
      collected.push(line);
    }
  }

  return collected;
}

export function validateMediaReference(value: string, valid: string[]): 'valid' | 'missing' {
  const normalizedValue = normalizeMediaValue(value);
  if (!normalizedValue) {
    return 'missing';
  }

  const normalizedValid = new Set(
    valid
      .map((entry) => normalizeMediaValue(entry))
      .filter((entry) => entry.length > 0)
  );
  return normalizedValid.has(normalizedValue) ? 'valid' : 'missing';
}
