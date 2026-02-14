export type QualityLevel = 'low' | 'medium' | 'high'

export interface QualityConfig {
  shadowsEnabled: boolean
  shadowMapSize: number
  fogEnabled: boolean
  decorationDensityMultiplier: number
  maxFps: number
  loadRadius: number
  detailRadius: number
}

const QUALITY_CONFIGS: Record<QualityLevel, QualityConfig> = {
  low: {
    shadowsEnabled: false,
    shadowMapSize: 512,
    fogEnabled: true,
    decorationDensityMultiplier: 0.4,
    maxFps: 30,
    loadRadius: 3,
    detailRadius: 1,
  },
  medium: {
    shadowsEnabled: true,
    shadowMapSize: 1024,
    fogEnabled: true,
    decorationDensityMultiplier: 0.7,
    maxFps: 60,
    loadRadius: 4,
    detailRadius: 2,
  },
  high: {
    shadowsEnabled: true,
    shadowMapSize: 2048,
    fogEnabled: true,
    decorationDensityMultiplier: 1.0,
    maxFps: 0, // unlimited
    loadRadius: 5,
    detailRadius: 3,
  },
}

const STORAGE_KEY = 'iw_quality'

class QualityManager {
  private level: QualityLevel
  private listeners: Array<(config: QualityConfig) => void> = []

  constructor() {
    this.level = (localStorage.getItem(STORAGE_KEY) as QualityLevel) || 'medium'
  }

  getLevel(): QualityLevel {
    return this.level
  }

  getConfig(): QualityConfig {
    return QUALITY_CONFIGS[this.level]
  }

  setLevel(level: QualityLevel): void {
    this.level = level
    localStorage.setItem(STORAGE_KEY, level)
    for (const listener of this.listeners) {
      listener(this.getConfig())
    }
  }

  onChange(listener: (config: QualityConfig) => void): void {
    this.listeners.push(listener)
  }
}

export const quality = new QualityManager()
