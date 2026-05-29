const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

const GESTURE_FLAG_BITS = {
  twist_on: 1 << 0,
  twist_off: 1 << 1,
  stab_on: 1 << 2,
  swing_on: 1 << 3,
  thrust_on: 1 << 4,
  force_push: 1 << 5,
  melt: 1 << 6,
} as const;

export type GlobalGestureKey = keyof typeof GESTURE_FLAG_BITS;

export function getGlobalParamValue(
  params: Record<string, string>,
  targetKey: string
): string | undefined {
  const normalizedKey = targetKey.toLowerCase();
  const found = Object.entries(params).find(
    ([key]) => key.toLowerCase() === normalizedKey
  );
  return found?.[1];
}

export function getGestureEnabled(
  params: Record<string, string>,
  key: GlobalGestureKey
): boolean {
  const explicitValue = getGlobalParamValue(params, key);
  if (explicitValue !== undefined) {
    return TRUE_VALUES.has(explicitValue.trim().toLowerCase());
  }

  const legacyFlags = getGlobalParamValue(params, 'gestureflags');
  if (!legacyFlags) return false;

  const parsed = Number.parseInt(legacyFlags, 10);
  if (!Number.isFinite(parsed)) return false;

  return (parsed & GESTURE_FLAG_BITS[key]) !== 0;
}
