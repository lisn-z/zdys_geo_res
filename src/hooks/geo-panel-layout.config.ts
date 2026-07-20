export type GeoLayoutMode =
  | 'large'
  | 'medium'
  | 'small'

export type GeoPanelSide =
  | 'left'
  | 'right'

export interface GeoPanelSizeRule {
  default: number
  min: number
  max: number
}

export interface GeoPanelModeConfig {
  left: GeoPanelSizeRule
  right: GeoPanelSizeRule
}

export interface GeoUltraLargePanelRule {
  ratio: number
  min: number
  max: number
  resizeMax: number
}

export interface GeoPanelLayoutConfig {
  breakpoints: {
    large: number
    medium: number
    ultraLarge: number
  }

  modes: Record<
    GeoLayoutMode,
    GeoPanelModeConfig
  >

  ultraLarge: {
    left: GeoUltraLargePanelRule
    right: GeoUltraLargePanelRule
  }
}

/**
 * 所有课件共用的面板配置。
 *
 * 后续修改默认宽度、最小宽度、最大宽度和断点，
 * 只需要改这个文件。
 */
export const GEO_PANEL_LAYOUT_CONFIG:
  GeoPanelLayoutConfig = {
  breakpoints: {
    large: 1440,
    medium: 820,
    ultraLarge: 2200,
  },

  modes: {
    large: {
      left: {
        default: 360,
        min: 300,
        max: 520,
      },

      right: {
        default: 420,
        min: 340,
        max: 580,
      },
    },

    /*
     * 平板 / 中屏：
     * 默认宽度主动收窄，避免覆盖过多 3D 主场景。
     * min / max 同时也是 Hook 的真实拖拽边界。
     */
    medium: {
      left: {
        default: 260,
        min: 220,
        max: 420,
      },

      right: {
        default: 270,
        min: 240,
        max: 460,
      },
    },

    /*
     * 手机 / 小屏：
     * 保留可拖拽，但默认更紧凑。
     */
    small: {
      left: {
        default: 230,
        min: 200,
        max: 340,
      },

      right: {
        default: 250,
        min: 210,
        max: 360,
      },
    },
  },

  ultraLarge: {
    left: {
      ratio: 0.22,
      min: 420,
      max: 640,
      resizeMax: 820,
    },

    right: {
      ratio: 0.25,
      min: 500,
      max: 760,
      resizeMax: 900,
    },
  },
}
