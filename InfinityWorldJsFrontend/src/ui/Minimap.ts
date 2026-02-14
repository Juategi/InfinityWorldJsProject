import { Vector3 } from '@babylonjs/core'
import type { Game } from '../game/Game'
import { WORLD_CONFIG } from '../config/world'

const MIN_CELL_SIZE = 3
const MAX_CELL_SIZE = 16
const DEFAULT_CELL_SIZE = 8
const UPDATE_INTERVAL = 100 // ms (~10 FPS)
const GRID_COLOR = '#444'
const BG_COLOR = 'rgba(20, 20, 30, 0.75)'
const ORIGIN_COLOR = '#ffd700'
const LERP_SPEED = 0.08

// Parcel colors
const COLOR_OWN = '#5a8a35'
const COLOR_OTHER = '#8a3535'
const COLOR_PURCHASABLE = '#35608a'
const COLOR_SYSTEM = '#d4a837'  // golden for system parcels
const COLOR_REMOTE_OWNED = 'rgba(138, 53, 53, 0.45)' // dimmed version for distant parcels

const STORAGE_KEY = 'minimap-zoom'

// Remote data fetching
const REMOTE_RADIUS = 30          // parcels radius to fetch from backend
const FETCH_THRESHOLD = 5          // parcel distance moved before re-fetching
const FETCH_COOLDOWN = 2000        // ms between fetches
const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

interface MinimapParcel {
  x: number
  y: number
  ownerId: string | null
}

export class Minimap {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private game: Game
  private baseSize: number
  private size: number
  private timerId: number | null = null
  private visible = true
  private coordsEl: HTMLElement
  private container: HTMLElement
  private cellSize: number
  private expanded = false

  // Navigation state
  private dragging = false
  private lerpTarget: Vector3 | null = null

  // Remote parcel cache
  private remoteCache: Map<string, MinimapParcel> = new Map()
  private lastFetchX = Infinity
  private lastFetchZ = Infinity
  private lastFetchTime = 0
  private fetching = false

  constructor(game: Game) {
    this.game = game

    this.baseSize = window.innerWidth < 768 ? 160 : 200
    this.size = this.baseSize

    this.canvas = document.getElementById('minimap-canvas') as HTMLCanvasElement
    this.ctx = this.canvas.getContext('2d')!
    this.coordsEl = document.getElementById('minimap-coords')!
    this.container = document.getElementById('minimap-container')!

    // Restore zoom preference
    const stored = localStorage.getItem(STORAGE_KEY)
    this.cellSize = stored ? Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, Number(stored))) : DEFAULT_CELL_SIZE

    this.applySize()

    // Listen for game mode changes
    document.addEventListener('gameModeChange', ((e: CustomEvent) => {
      if (e.detail.mode === 'edit') {
        this.hide()
      } else {
        this.show()
      }
    }) as EventListener)

    // Handle window resize
    window.addEventListener('resize', () => {
      this.baseSize = window.innerWidth < 768 ? 160 : 200
      if (!this.expanded) {
        this.size = this.baseSize
        this.applySize()
      }
    })

    this.setupInteraction()
    this.setupZoomButtons()
  }

  private applySize(): void {
    this.canvas.width = this.size
    this.canvas.height = this.size
  }

  start(): void {
    this.render()
    this.timerId = window.setInterval(() => this.render(), UPDATE_INTERVAL)
  }

  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }

  show(): void {
    this.visible = true
    this.container.style.display = ''
  }

  hide(): void {
    this.visible = false
    this.container.style.display = 'none'
  }

  private setZoom(cellSize: number): void {
    this.cellSize = Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, cellSize))
    localStorage.setItem(STORAGE_KEY, String(this.cellSize))
  }

  private toggleExpand(): void {
    this.expanded = !this.expanded
    if (this.expanded) {
      const vw = window.innerWidth
      const vh = window.innerHeight
      this.size = Math.min(vw, vh) * 0.6
      this.container.classList.add('expanded')
    } else {
      this.size = this.baseSize
      this.container.classList.remove('expanded')
    }
    this.applySize()
  }

  /** Convert canvas pixel position to world coordinates */
  private canvasToWorld(canvasX: number, canvasY: number): Vector3 {
    const camera = this.game.getCamera()
    const target = camera.target
    const parcelSize = WORLD_CONFIG.PARCEL_SIZE
    const centerPx = this.size / 2

    const dxParcels = (canvasX - centerPx) / this.cellSize
    const dzParcels = (canvasY - centerPx) / this.cellSize

    const worldX = target.x + dxParcels * parcelSize
    const worldZ = target.z + dzParcels * parcelSize

    return new Vector3(worldX, 0, worldZ)
  }

  private navigateTo(worldPos: Vector3): void {
    this.lerpTarget = worldPos
  }

  private setupInteraction(): void {
    const canvas = this.canvas

    canvas.addEventListener('pointerdown', (e) => {
      e.stopPropagation()
      e.preventDefault()
      this.dragging = true
      const pos = this.canvasToWorld(e.offsetX, e.offsetY)
      this.navigateTo(pos)
    })

    canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging) return
      e.stopPropagation()
      e.preventDefault()
      const pos = this.canvasToWorld(e.offsetX, e.offsetY)
      this.navigateTo(pos)
    })

    const endDrag = (e: PointerEvent) => {
      if (!this.dragging) return
      e.stopPropagation()
      this.dragging = false
    }

    canvas.addEventListener('pointerup', endDrag)
    canvas.addEventListener('pointerleave', endDrag)
    canvas.addEventListener('pointercancel', endDrag)

    // Zoom with mouse wheel
    canvas.addEventListener('wheel', (e) => {
      e.stopPropagation()
      e.preventDefault()
      const delta = e.deltaY > 0 ? -1 : 1
      this.setZoom(this.cellSize + delta)
    }, { passive: false })

    // Double-click to toggle expanded mode
    canvas.addEventListener('dblclick', (e) => {
      e.stopPropagation()
      e.preventDefault()
      this.toggleExpand()
    })

    // Block touch events from reaching 3D scene
    canvas.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false })
    canvas.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: false })
    canvas.addEventListener('touchend', (e) => e.stopPropagation())
  }

  private setupZoomButtons(): void {
    const btnZoomIn = document.getElementById('minimap-zoom-in')
    const btnZoomOut = document.getElementById('minimap-zoom-out')
    const btnExpand = document.getElementById('minimap-expand')

    btnZoomIn?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.setZoom(this.cellSize + 2)
    })

    btnZoomOut?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.setZoom(this.cellSize - 2)
    })

    btnExpand?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.toggleExpand()
    })
  }

  private async fetchRemoteParcels(cx: number, cz: number): Promise<void> {
    if (this.fetching) return
    const now = Date.now()
    if (now - this.lastFetchTime < FETCH_COOLDOWN) return

    this.fetching = true
    this.lastFetchTime = now
    try {
      const res = await fetch(`${API_BASE}/parcels?x=${cx}&y=${cz}&radius=${REMOTE_RADIUS}`)
      if (!res.ok) return
      const data = await res.json()
      const parcels: { x: number; y: number; owner_id: string | null }[] = data.parcels || []

      this.remoteCache.clear()
      for (const p of parcels) {
        this.remoteCache.set(`${p.x},${p.y}`, { x: p.x, y: p.y, ownerId: p.owner_id })
      }
      this.lastFetchX = cx
      this.lastFetchZ = cz
    } catch {
      // silently ignore network errors
    } finally {
      this.fetching = false
    }
  }

  private render(): void {
    if (!this.visible) return

    // Animate camera lerp
    if (this.lerpTarget) {
      const camera = this.game.getCamera()
      const t = camera.target
      t.x += (this.lerpTarget.x - t.x) * LERP_SPEED
      t.z += (this.lerpTarget.z - t.z) * LERP_SPEED

      const dist = Math.abs(this.lerpTarget.x - t.x) + Math.abs(this.lerpTarget.z - t.z)
      if (dist < 1 && !this.dragging) {
        this.lerpTarget = null
      }
    }

    const ctx = this.ctx
    const size = this.size
    const cellSize = this.cellSize

    // Clear
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(0, 0, size, size)

    // Camera position → parcel coordinates
    const camera = this.game.getCamera()
    const target = camera.target
    const parcelSize = WORLD_CONFIG.PARCEL_SIZE
    const camParcelX = Math.floor(target.x / parcelSize)
    const camParcelZ = Math.floor(target.z / parcelSize)

    const halfCells = Math.floor(size / (2 * cellSize))
    const centerPx = size / 2

    // Trigger remote fetch when camera moves far enough
    const fetchDist = Math.abs(camParcelX - this.lastFetchX) + Math.abs(camParcelZ - this.lastFetchZ)
    if (fetchDist >= FETCH_THRESHOLD || this.lastFetchX === Infinity) {
      this.fetchRemoteParcels(camParcelX, camParcelZ)
    }

    // Get loaded parcels data
    const pm = this.game.getParcelManager()
    const loadedParcels = pm.getLoadedParcels()

    // Build set of locally-loaded parcel keys to avoid duplicates
    const localKeys = new Set<string>()
    for (const [key] of loadedParcels) {
      localKeys.add(key)
    }

    // Draw remote parcels first (dimmed, behind local)
    for (const [, rp] of this.remoteCache) {
      const key = `${rp.x},${rp.y}`
      if (localKeys.has(key)) continue // skip if locally loaded

      const dx = rp.x - camParcelX
      const dz = rp.y - camParcelZ
      if (Math.abs(dx) > halfCells || Math.abs(dz) > halfCells) continue

      const px = centerPx + dx * cellSize - cellSize / 2
      const py = centerPx + dz * cellSize - cellSize / 2

      if (rp.ownerId) {
        if (rp.ownerId === WORLD_CONFIG.SYSTEM_PLAYER_ID) {
          ctx.fillStyle = COLOR_SYSTEM
        } else {
          const isOwn = pm.getLocalPlayerId() === rp.ownerId
          ctx.fillStyle = isOwn ? COLOR_OWN : COLOR_REMOTE_OWNED
        }
      } else {
        continue
      }

      ctx.fillRect(px, py, cellSize - 1, cellSize - 1)
    }

    // Draw local parcels (full color, on top)
    for (const [, loaded] of loadedParcels) {
      const p = loaded.parcel
      const dx = p.x - camParcelX
      const dz = p.y - camParcelZ

      if (Math.abs(dx) > halfCells || Math.abs(dz) > halfCells) continue

      const px = centerPx + dx * cellSize - cellSize / 2
      const py = centerPx + dz * cellSize - cellSize / 2

      if (p.ownerId) {
        if (p.ownerId === WORLD_CONFIG.SYSTEM_PLAYER_ID) {
          ctx.fillStyle = COLOR_SYSTEM
        } else {
          const isOwn = pm.getLocalPlayerId() === p.ownerId
          ctx.fillStyle = isOwn ? COLOR_OWN : COLOR_OTHER
        }
      } else if (loaded.buyIcon) {
        ctx.fillStyle = COLOR_PURCHASABLE
      } else {
        continue
      }

      ctx.fillRect(px, py, cellSize - 1, cellSize - 1)
    }

    // Draw grid lines (skip if cells too small)
    if (cellSize >= 5) {
      ctx.strokeStyle = GRID_COLOR
      ctx.lineWidth = 0.5
      for (let i = -halfCells; i <= halfCells; i++) {
        const offset = centerPx + i * cellSize
        ctx.beginPath()
        ctx.moveTo(offset, 0)
        ctx.lineTo(offset, size)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, offset)
        ctx.lineTo(size, offset)
        ctx.stroke()
      }
    }

    // Draw origin marker (0,0)
    const originDx = 0 - camParcelX
    const originDz = 0 - camParcelZ
    if (Math.abs(originDx) <= halfCells && Math.abs(originDz) <= halfCells) {
      const ox = centerPx + originDx * cellSize
      const oz = centerPx + originDz * cellSize
      ctx.fillStyle = ORIGIN_COLOR
      ctx.beginPath()
      ctx.arc(ox, oz, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw camera position indicator (center dot)
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(centerPx, centerPx, 2, 0, Math.PI * 2)
    ctx.fill()

    // Draw viewport rectangle
    const viewRadius = camera.radius / parcelSize
    const vpHalf = viewRadius * cellSize * 0.5
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.lineWidth = 1
    ctx.strokeRect(centerPx - vpHalf, centerPx - vpHalf, vpHalf * 2, vpHalf * 2)

    // Legend in expanded mode
    if (this.expanded) {
      this.drawLegend(ctx, size)
    }

    // Update coordinates display
    this.coordsEl.textContent = `Pos: (${camParcelX}, ${camParcelZ})`
  }

  private drawLegend(ctx: CanvasRenderingContext2D, size: number): void {
    const x = 8
    let y = size - 50
    const sq = 8

    const items: [string, string][] = [
      [COLOR_OWN, 'Propia'],
      [COLOR_OTHER, 'Otro'],
      [COLOR_PURCHASABLE, 'Comprable'],
    ]

    ctx.font = '10px sans-serif'
    for (const [color, label] of items) {
      ctx.fillStyle = color
      ctx.fillRect(x, y, sq, sq)
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.fillText(label, x + sq + 4, y + sq - 1)
      y += 14
    }
  }

  /** Navigate camera to a specific parcel coordinate */
  navigateToParcel(px: number, py: number): void {
    const parcelSize = WORLD_CONFIG.PARCEL_SIZE
    const worldX = px * parcelSize + parcelSize / 2
    const worldZ = py * parcelSize + parcelSize / 2
    this.navigateTo(new Vector3(worldX, 0, worldZ))
  }

  dispose(): void {
    this.stop()
  }
}
