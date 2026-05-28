// Manually maintained schema — original generator script no longer exists.
// Ground truth: ProffieOS/styles/ini_style_arg_ids.h and ini_custom_styles.h
export const generatedStyleSchema = {
  "version": 2,
  "cores": {
    "main": {
      "core_type": "main",
      "description": "Primary blade style core"
    }
  },
  "sharedCore": {
    "main": {
      "params": [
        {
          "key": "base_color",
          "arg_symbol": "BASE_COLOR_ARG"
        },
        {
          "key": "alt_color",
          "arg_symbol": "ALT_COLOR_ARG"
        },
        {
          "key": "blast_color",
          "arg_symbol": "BLAST_COLOR_ARG"
        },
        {
          "key": "clash_color",
          "arg_symbol": "CLASH_COLOR_ARG"
        },
        {
          "key": "lockup_color",
          "arg_symbol": "LOCKUP_COLOR_ARG"
        },
        {
          "key": "drag_color",
          "arg_symbol": "DRAG_COLOR_ARG"
        },
        {
          "key": "lb_color",
          "arg_symbol": "LB_COLOR_ARG"
        },
        {
          "key": "stab_color",
          "arg_symbol": "STAB_COLOR_ARG"
        },
        {
          "key": "ignition_time",
          "arg_symbol": "IGNITION_TIME_ARG"
        },
        {
          "key": "retraction_time",
          "arg_symbol": "RETRACTION_TIME_ARG"
        },
        {
          "key": "off_color",
          "arg_symbol": "OFF_COLOR_ARG"
        },
        {
          "key": "off_option",
          "arg_symbol": "OFF_OPTION_ARG"
        },
        {
          "key": "lockup_fade",
          "arg_symbol": "LOCKUP_FADE_ARG"
        },
        {
          "key": "clash_fade",
          "arg_symbol": "CLASH_FADE_ARG"
        },
        {
          "key": "lockup_size",
          "arg_symbol": "LOCKUP_SIZE_ARG"
        },
        {
          "key": "melt_base",
          "arg_symbol": "MELT_BASE_ARG"
        },
        {
          "key": "melt_alt",
          "arg_symbol": "MELT_ALT_ARG"
        }
      ]
    },
    "secondary": {
      "params": [
        {
          "key": "alt_color2",
          "arg_symbol": "ALT_COLOR2_ARG"
        },
        {
          "key": "alt_color3",
          "arg_symbol": "ALT_COLOR3_ARG"
        }
      ]
    }
  },
  "styles": [
    {
      "name": "audio_flicker",
      "core": "main",
      "parser_name": "audio_flicker",
      "params": [
        {
          "key": "flicker_depth",
          "arg_symbol": "FLICKER_DEPTH_ARG"
        },
        {
          "key": "flicker_speed",
          "arg_symbol": "FLICKER_SPEED_ARG"
        }
      ]
    },
    {
      "name": "hump_flicker",
      "core": "main",
      "parser_name": "hump_flicker",
      "params": [
        {
          "key": "hump_amount",
          "arg_symbol": "HUMP_WIDTH_ARG"
        }
      ]
    },
    {
      "name": "pulsing_stripes",
      "core": "main",
      "parser_name": "pulsing_stripes",
      "params": [
        {
          "key": "stripe_width",
          "arg_symbol": "STRIPE_WIDTH_ARG"
        },
        {
          "key": "stripe_speed",
          "arg_symbol": "STRIPE_SPEED_ARG"
        },
        {
          "key": "pulse_rate",
          "arg_symbol": "PULSE_SPEED_ARG"
        }
      ]
    },
    {
      "name": "energy",
      "core": "main",
      "parser_name": "energy",
      "include_secondary": true
    },
    {
      "name": "fire_unstable",
      "core": "main",
      "parser_name": "fire_unstable",
      "include_secondary": true
    },
    {
      "name": "plasma_blade",
      "core": "main",
      "parser_name": "plasma_blade",
      "include_secondary": true
    },
    {
      "name": "rainbow_blade",
      "core": "main",
      "parser_name": "rainbow_blade"
    },
    {
      "name": "energy_blade",
      "core": "main",
      "parser_name": "energy_blade",
      "include_secondary": true,
      "params": [
        {
          "key": "stripe_width",
          "arg_symbol": "STRIPE_WIDTH_ARG"
        },
        {
          "key": "stripe_speed",
          "arg_symbol": "STRIPE_SPEED_ARG"
        }
      ]
    },
    {
      "name": "lava_blade",
      "core": "main",
      "parser_name": "lava_blade",
      "include_secondary": true,
      "params": [
        {
          "key": "pulse_rate",
          "arg_symbol": "PULSE_SPEED_ARG"
        }
      ]
    },
    {
      "name": "sparkle_blade",
      "core": "main",
      "parser_name": "sparkle_blade"
    },
    {
      "name": "fire_blade",
      "core": "main",
      "parser_name": "fire_blade"
    },
    {
      "name": "pulse_accent",
      "core": "main",
      "parser_name": "pulse",
      "params": [
        {
          "key": "pulse_rate",
          "arg_symbol": "STYLE_OPTION_ARG"
        },
        {
          "key": "inout_pulse_rate",
          "arg_symbol": "STYLE_OPTION2_ARG"
        },
        {
          "key": "fade_ms",
          "arg_symbol": "IGNITION_OPTION2_ARG"
        }
      ]
    },
    {
      "name": "blink_accent",
      "core": "main",
      "parser_name": "blink",
      "params": [
        {
          "key": "blink_ms",
          "arg_symbol": "STYLE_OPTION_ARG"
        },
        {
          "key": "blink_duty",
          "arg_symbol": "IGNITION_OPTION_ARG"
        },
        {
          "key": "inout_blink_ms",
          "arg_symbol": "STYLE_OPTION2_ARG"
        },
        {
          "key": "inout_blink_duty",
          "arg_symbol": "STYLE_OPTION3_ARG"
        },
        {
          "key": "fade_ms",
          "arg_symbol": "IGNITION_OPTION2_ARG"
        }
      ]
    },
    {
      "name": "random_blink_accent",
      "core": "main",
      "parser_name": "randomblink",
      "params": [
        {
          "key": "blink_rate",
          "arg_symbol": "STYLE_OPTION_ARG"
        },
        {
          "key": "inout_blink_rate",
          "arg_symbol": "STYLE_OPTION2_ARG"
        },
        {
          "key": "fade_ms",
          "arg_symbol": "IGNITION_OPTION2_ARG"
        }
      ]
    },
    {
      "name": "color_cycle_accent",
      "core": "main",
      "parser_name": "cycle",
      "params": [
        {
          "key": "segment_size",
          "arg_symbol": "STYLE_OPTION_ARG"
        },
        {
          "key": "off_rpm",
          "arg_symbol": "IGNITION_OPTION_ARG"
        },
        {
          "key": "fade_ms",
          "arg_symbol": "STYLE_OPTION2_ARG"
        }
      ]
    },
    {
      "name": "film_blade",
      "core": "main",
      "parser_name": "film_blade"
    }
  ]
} as const;
