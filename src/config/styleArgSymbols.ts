/**
 * Companion-side arg symbol mapping aligned to the current INI style-string
 * contract (legacy arg slots consumed by firmware parser templates).
 *
 * Symbols not listed here are not currently representable in the preview
 * style-string and should not be surfaced as editable schema controls.
 */
export const ARG_INDEX_BY_SYMBOL: Record<string, number> = {
  BASE_COLOR_ARG: 1,
  ALT_COLOR_ARG: 2,
  STYLE_OPTION_ARG: 3,
  IGNITION_OPTION_ARG: 4,
  BLAST_COLOR_ARG: 5,
  CLASH_COLOR_ARG: 6,
  LOCKUP_COLOR_ARG: 7,
  LB_COLOR_ARG: 8,
  DRAG_COLOR_ARG: 9,
  STAB_COLOR_ARG: 10,
  EMITTER_COLOR_ARG: 11,
  IGNITION_TIME_ARG: 12,
  RETRACTION_TIME_ARG: 13,
  OFF_COLOR_ARG: 14,
  OFF_OPTION_ARG: 15,
};

export const SUPPORTED_SCHEMA_ARG_SYMBOLS = new Set(Object.keys(ARG_INDEX_BY_SYMBOL));
