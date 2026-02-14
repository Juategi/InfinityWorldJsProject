import { Scene } from '@babylonjs/core/scene'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { ActionManager } from '@babylonjs/core/Actions/actionManager'
import { ExecuteCodeAction } from '@babylonjs/core/Actions/directActions'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { LinesMesh } from '@babylonjs/core/Meshes/linesMesh'
import { Animation } from '@babylonjs/core/Animations/animation'
import type { Parcel } from '../types'
import { WORLD_CONFIG, chebyshevDistance, MAX_BUY_DISTANCE, PARCEL_PRICE } from '../config/world'
import { getBiome, type BiomeType } from './BiomeGenerator'
import { generateDecorations } from './BiomeDecorator'
import { Building, findBuildingTypeByName } from './Building'

/** Base ground colors per biome */
const BIOME_COLORS: Record<BiomeType, { r: number; g: number; b: number }> = {
  prairie:  { r: 0.29, g: 0.48, b: 0.18 },  // #4a7a2e
  forest:   { r: 0.18, g: 0.35, b: 0.12 },  // #2d5a1e
  desert:   { r: 0.76, g: 0.65, b: 0.27 },  // #c2a645
  snow:     { r: 0.85, g: 0.91, b: 0.94 },  // #d8e8f0
  mountain: { r: 0.48, g: 0.48, b: 0.43 },  // #7a7a6e
  swamp:    { r: 0.23, g: 0.29, b: 0.16 },  // #3a4a28
}

/**
 * Get the biomes of a parcel's 4 neighbors (N, S, E, W).
 * Used for smooth biome transitions.
 */
function getNeighborBiomes(px: number, py: number): BiomeType[] {
  return [
    getBiome(px, py - 1), // North
    getBiome(px, py + 1), // South
    getBiome(px + 1, py), // East
    getBiome(px - 1, py), // West
  ]
}

/**
 * Blend the base biome color with neighbors that differ.
 * Returns a smoothly transitioned color at biome borders.
 * Self weight: 60%, each different neighbor: 10% of its biome color.
 */
function blendBiomeColor(biome: BiomeType, px: number, py: number): { r: number; g: number; b: number } {
  const self = BIOME_COLORS[biome]
  const neighbors = getNeighborBiomes(px, py)

  let r = self.r * 0.6
  let g = self.g * 0.6
  let b = self.b * 0.6

  for (const nb of neighbors) {
    const nc = BIOME_COLORS[nb]
    r += nc.r * 0.1
    g += nc.g * 0.1
    b += nc.b * 0.1
  }

  return { r, g, b }
}

/**
 * Compute the ground color for a parcel based on its biome, neighbors, and ownership.
 * Uses blended biome colors for smooth transitions at biome borders.
 */
function computeGroundColor(biome: BiomeType, px: number, py: number, isOwn: boolean, isOther: boolean, purchasable: boolean, isSystem: boolean): Color3 {
  if (isSystem) {
    // Golden/amber ground for system parcels
    return new Color3(0.54, 0.48, 0.21) // #8a7a35
  }

  const base = blendBiomeColor(biome, px, py)
  let r = base.r, g = base.g, b = base.b

  if (isOwn) {
    r *= 1.1
    g *= 1.2
    b *= 1.0
  } else if (isOther) {
    const gray = (r + g + b) / 3
    r = r * 0.5 + gray * 0.5
    g = g * 0.5 + gray * 0.5
    b = b * 0.5 + gray * 0.5
    r *= 0.8; g *= 0.8; b *= 0.8
  } else if (purchasable) {
    r *= 0.95
    g *= 1.0
    b *= 1.05
  } else {
    r *= 0.65
    g *= 0.65
    b *= 0.65
  }

  return new Color3(Math.min(r, 1), Math.min(g, 1), Math.min(b, 1))
}

export interface LoadedParcel {
  parcel: Parcel
  ground: Mesh
  border: LinesMesh
  editIcon: Mesh | null
  buyIcon: Mesh | null
  ownerLabel: Mesh | null
  priceLabel: Mesh | null
  decorations: Mesh[]
  /** Buildings placed on this parcel (read-only for other players' parcels).
   *  Key: server placedObject ID, Value: Building instance */
  buildings: Map<string, Building>
  /** True if this parcel is in the LOD (low-detail) zone */
  lowDetail: boolean
}

export class ParcelManager {
  private scene: Scene
  private loadedParcels: Map<string, LoadedParcel> = new Map()
  private currentParcelX: number = 0
  private currentParcelY: number = 0
  private prevParcelX: number = 0
  private prevParcelY: number = 0
  private onEditParcelCallback: ((parcel: Parcel) => void) | null = null
  private onBuyParcelCallback: ((parcel: Parcel) => void) | null = null

  /** Cache of parcel data (ownerId) from previous visits */
  private parcelDataCache: Map<string, { ownerId: string | null }> = new Map()

  /** Parcelas propiedad del jugador local (para calcular zona de compra) */
  private playerParcels: Parcel[] = []

  constructor(scene: Scene) {
    this.scene = scene
  }

  /** Establecer las parcelas del jugador para determinar zona de compra */
  setPlayerParcels(parcels: Parcel[]): void {
    this.playerParcels = parcels
  }

  /** Añadir una parcela recién comprada a la lista del jugador */
  addPlayerParcel(parcel: Parcel): void {
    this.playerParcels.push(parcel)
  }

  onEditParcel(callback: (parcel: Parcel) => void): void {
    this.onEditParcelCallback = callback
  }

  onBuyParcel(callback: (parcel: Parcel) => void): void {
    this.onBuyParcelCallback = callback
  }

  private getParcelKey(x: number, y: number): string {
    return `${x},${y}`
  }

  private worldToParcelCoords(worldX: number, worldZ: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX / WORLD_CONFIG.PARCEL_SIZE),
      y: Math.floor(worldZ / WORLD_CONFIG.PARCEL_SIZE),
    }
  }

  private parcelToWorldCoords(parcelX: number, parcelY: number): { x: number; z: number } {
    return {
      x: parcelX * WORLD_CONFIG.PARCEL_SIZE,
      z: parcelY * WORLD_CONFIG.PARCEL_SIZE,
    }
  }

  /**
   * Comprueba si una coordenada está dentro de la zona de compra del jugador.
   * - Si tiene parcelas: a ≤ MAX_BUY_DISTANCE de alguna propia
   * - Si no tiene: a ≤ MAX_BUY_DISTANCE del origen
   */
  private isPurchasable(px: number, py: number): boolean {
    if (this.playerParcels.length === 0) {
      return chebyshevDistance(px, py, 0, 0) <= MAX_BUY_DISTANCE
    }
    return this.playerParcels.some(
      p => chebyshevDistance(px, py, p.x, p.y) <= MAX_BUY_DISTANCE
    )
  }

  async updateFromCameraPosition(cameraTarget: Vector3): Promise<void> {
    const parcelCoords = this.worldToParcelCoords(cameraTarget.x, cameraTarget.z)

    if (parcelCoords.x === this.currentParcelX && parcelCoords.y === this.currentParcelY) {
      return
    }

    this.prevParcelX = this.currentParcelX
    this.prevParcelY = this.currentParcelY
    this.currentParcelX = parcelCoords.x
    this.currentParcelY = parcelCoords.y

    // Cache data of parcels about to be unloaded
    this.cacheUnloadingParcels(parcelCoords.x, parcelCoords.y)

    await this.loadParcelsAround(parcelCoords.x, parcelCoords.y)
    this.unloadDistantParcels(parcelCoords.x, parcelCoords.y)

    // Preload parcels in the movement direction (LOD only)
    const dx = parcelCoords.x - this.prevParcelX
    const dy = parcelCoords.y - this.prevParcelY
    if (dx !== 0 || dy !== 0) {
      this.preloadInDirection(parcelCoords.x, parcelCoords.y, Math.sign(dx), Math.sign(dy))
    }
  }

  /** Cache parcel ownership data before unloading */
  private cacheUnloadingParcels(centerX: number, centerY: number): void {
    const unloadRadius = WORLD_CONFIG.UNLOAD_RADIUS
    for (const [key, loaded] of this.loadedParcels) {
      const dist = chebyshevDistance(loaded.parcel.x, loaded.parcel.y, centerX, centerY)
      if (dist > unloadRadius) {
        this.parcelDataCache.set(key, { ownerId: loaded.parcel.ownerId })
      }
    }
    // Limit cache size
    if (this.parcelDataCache.size > 200) {
      const entries = [...this.parcelDataCache.entries()]
      this.parcelDataCache = new Map(entries.slice(-150))
    }
  }

  /** Preload 1 extra row of LOD parcels in the movement direction */
  private preloadInDirection(cx: number, cy: number, dx: number, dy: number): void {
    const loadR = WORLD_CONFIG.LOAD_RADIUS
    const preloadDist = loadR + 1

    if (dx !== 0) {
      const px = cx + dx * preloadDist
      for (let y = cy - loadR; y <= cy + loadR; y++) {
        const key = this.getParcelKey(px, y)
        if (!this.loadedParcels.has(key)) {
          this.loadParcel(px, y, true)
        }
      }
    }
    if (dy !== 0) {
      const py = cy + dy * preloadDist
      for (let x = cx - loadR; x <= cx + loadR; x++) {
        const key = this.getParcelKey(x, py)
        if (!this.loadedParcels.has(key)) {
          this.loadParcel(x, py, true)
        }
      }
    }
  }

  async loadParcelsAround(centerX: number, centerY: number): Promise<void> {
    const loadRadius = WORLD_CONFIG.LOAD_RADIUS
    const detailRadius = WORLD_CONFIG.DETAIL_RADIUS

    for (let x = centerX - loadRadius; x <= centerX + loadRadius; x++) {
      for (let y = centerY - loadRadius; y <= centerY + loadRadius; y++) {
        const dist = chebyshevDistance(x, y, centerX, centerY)
        const lowDetail = dist > detailRadius
        const key = this.getParcelKey(x, y)
        const existing = this.loadedParcels.get(key)

        if (!existing) {
          await this.loadParcel(x, y, lowDetail)
        } else if (existing.lowDetail && !lowDetail) {
          // Upgrade from LOD to full detail
          this.unloadParcel(key)
          await this.loadParcel(x, y, false)
        } else if (!existing.lowDetail && lowDetail) {
          // Downgrade from full to LOD
          this.unloadParcel(key)
          await this.loadParcel(x, y, true)
        }
      }
    }
  }

  private async loadParcel(parcelX: number, parcelY: number, lowDetail: boolean = false): Promise<void> {
    const key = this.getParcelKey(parcelX, parcelY)

    // Determine owner: check player parcels, then cache, then null
    const isOwn = this.playerParcels.some(p => p.x === parcelX && p.y === parcelY)
    const cached = this.parcelDataCache.get(key)
    const parcel: Parcel = {
      id: key,
      ownerId: isOwn ? this.localPlayerId : (cached?.ownerId ?? null),
      x: parcelX,
      y: parcelY,
    }

    this.createParcelMeshes(key, parcel, lowDetail)
  }

  /** Shared mesh creation for both local and server parcels */
  private createParcelMeshes(key: string, parcel: Parcel, lowDetail: boolean = false): void {
    const isSystem = parcel.ownerId === WORLD_CONFIG.SYSTEM_PLAYER_ID
    const isOwn = !isSystem && !!parcel.ownerId && this.isOwnParcel(parcel.ownerId)
    const isOther = !isSystem && !!parcel.ownerId && !isOwn
    const purchasable = !parcel.ownerId && !isSystem && this.isPurchasable(parcel.x, parcel.y)

    const worldCoords = this.parcelToWorldCoords(parcel.x, parcel.y)
    const size = WORLD_CONFIG.PARCEL_SIZE

    // Ground mesh (LOD: fewer subdivisions for distant parcels)
    const ground = MeshBuilder.CreateGround(
      `parcel_ground_${key}`,
      { width: size, height: size, subdivisions: lowDetail ? 1 : 2 },
      this.scene
    )
    ground.position.x = worldCoords.x + size / 2
    ground.position.z = worldCoords.z + size / 2

    const biome = getBiome(parcel.x, parcel.y)

    const material = new StandardMaterial(`parcel_material_${key}`, this.scene)
    material.diffuseColor = computeGroundColor(biome, parcel.x, parcel.y, isOwn, isOther, purchasable, isSystem)
    if (isSystem) {
      material.specularColor = new Color3(0.2, 0.18, 0.08)
    } else {
      material.specularColor = new Color3(0.1, 0.1, 0.1)
    }
    ground.material = material
    ground.isPickable = !lowDetail

    // Border
    const border = this.createParcelBorder(parcel.x, parcel.y, key, isOwn, purchasable, isOther, isSystem)

    // In LOD mode: skip icons, labels, and decorations
    let editIcon: Mesh | null = null
    let buyIcon: Mesh | null = null
    let ownerLabel: Mesh | null = null
    let priceLabel: Mesh | null = null
    let decorations: Mesh[] = []

    if (!lowDetail) {
      if (isSystem) {
        // System parcels: "Infinity World" label, no icons
        ownerLabel = this.createOwnerLabel(parcel.x, parcel.y, key, parcel.ownerId!)
      } else if (isOwn) {
        editIcon = this.createEditIcon(parcel.x, parcel.y, key, parcel)
      } else if (isOther) {
        ownerLabel = this.createOwnerLabel(parcel.x, parcel.y, key, parcel.ownerId!)
      } else if (purchasable) {
        buyIcon = this.createBuyIcon(parcel.x, parcel.y, key, parcel)
        priceLabel = this.createPriceLabel(parcel.x, parcel.y, key)
      }

      // Biome decorations (only on unowned non-system parcels)
      if (!parcel.ownerId && !isSystem) {
        const neighbors = getNeighborBiomes(parcel.x, parcel.y)
        decorations = generateDecorations(this.scene, parcel.x, parcel.y, biome, neighbors)
      }
    }

    this.loadedParcels.set(key, { parcel, ground, border, editIcon, buyIcon, ownerLabel, priceLabel, decorations, buildings: new Map(), lowDetail })
  }

  private createEditIcon(parcelX: number, parcelY: number, key: string, parcel: Parcel): Mesh {
    const worldCoords = this.parcelToWorldCoords(parcelX, parcelY)
    const size = WORLD_CONFIG.PARCEL_SIZE

    const icon = MeshBuilder.CreateBox(
      `parcel_edit_icon_${key}`,
      { size: 5 },
      this.scene
    )
    icon.position.x = worldCoords.x + size / 2
    icon.position.y = 10
    icon.position.z = worldCoords.z + size / 2

    const iconMaterial = new StandardMaterial(`edit_icon_material_${key}`, this.scene)
    iconMaterial.diffuseColor = new Color3(1, 0.6, 0)
    iconMaterial.emissiveColor = new Color3(0.3, 0.2, 0)
    icon.material = iconMaterial

    icon.isPickable = true
    icon.actionManager = new ActionManager(this.scene)
    icon.actionManager.registerAction(
      new ExecuteCodeAction(
        ActionManager.OnPickTrigger,
        () => {
          if (this.onEditParcelCallback) {
            this.onEditParcelCallback(parcel)
          }
        }
      )
    )

    return icon
  }

  private createBuyIcon(parcelX: number, parcelY: number, key: string, parcel: Parcel): Mesh {
    const worldCoords = this.parcelToWorldCoords(parcelX, parcelY)
    const size = WORLD_CONFIG.PARCEL_SIZE

    const icon = MeshBuilder.CreateSphere(
      `parcel_buy_icon_${key}`,
      { diameter: 4, segments: 8 },
      this.scene
    )
    icon.position.x = worldCoords.x + size / 2
    icon.position.y = 8
    icon.position.z = worldCoords.z + size / 2
    icon.scaling.y = 0.6

    const iconMaterial = new StandardMaterial(`buy_icon_material_${key}`, this.scene)
    iconMaterial.diffuseColor = new Color3(0.2, 0.8, 0.3)
    iconMaterial.emissiveColor = new Color3(0.05, 0.2, 0.05)
    icon.material = iconMaterial

    icon.isPickable = true
    icon.actionManager = new ActionManager(this.scene)
    icon.actionManager.registerAction(
      new ExecuteCodeAction(
        ActionManager.OnPickTrigger,
        () => {
          if (this.onBuyParcelCallback) {
            this.onBuyParcelCallback(parcel)
          }
        }
      )
    )

    return icon
  }

  /** Create a floating price label above a purchasable parcel */
  private createPriceLabel(parcelX: number, parcelY: number, key: string): Mesh {
    const worldCoords = this.parcelToWorldCoords(parcelX, parcelY)
    const size = WORLD_CONFIG.PARCEL_SIZE
    const price = PARCEL_PRICE

    const plane = MeshBuilder.CreatePlane(
      `parcel_price_${key}`,
      { width: 12, height: 4 },
      this.scene
    )
    plane.position.x = worldCoords.x + size / 2
    plane.position.y = 15
    plane.position.z = worldCoords.z + size / 2
    plane.billboardMode = 7

    const texture = new DynamicTexture(`price_tex_${key}`, { width: 192, height: 64 }, this.scene)
    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D
    ctx.clearRect(0, 0, 192, 64)
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.beginPath()
    ctx.roundRect(4, 4, 184, 56, 12)
    ctx.fill()
    // Coin icon (circle)
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.arc(32, 32, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#B8860B'
    ctx.font = 'bold 18px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('$', 32, 33)
    // Price text
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 22px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(String(price), 56, 33)
    texture.update()

    const mat = new StandardMaterial(`price_mat_${key}`, this.scene)
    mat.diffuseTexture = texture
    mat.emissiveColor = new Color3(1, 1, 1)
    mat.disableLighting = true
    mat.useAlphaFromDiffuseTexture = true
    mat.backFaceCulling = false
    plane.material = mat
    plane.isPickable = false

    return plane
  }

  /** Play a purchase animation on a parcel ground */
  animatePurchase(x: number, y: number): void {
    const key = this.getParcelKey(x, y)
    const loaded = this.loadedParcels.get(key)
    if (!loaded) return

    // Flash white and scale pulse
    const anim = new Animation(
      'purchaseAnim',
      'scaling',
      30,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    )
    anim.setKeys([
      { frame: 0, value: new Vector3(1, 1, 1) },
      { frame: 5, value: new Vector3(1.05, 1.05, 1.05) },
      { frame: 15, value: new Vector3(1, 1, 1) },
    ])
    loaded.ground.animations = [anim]
    this.scene.beginAnimation(loaded.ground, 0, 15, false)
  }

  private createParcelBorder(
    parcelX: number,
    parcelY: number,
    key: string,
    isOwn: boolean,
    purchasable: boolean,
    isOther: boolean = false,
    isSystem: boolean = false
  ): LinesMesh {
    const worldCoords = this.parcelToWorldCoords(parcelX, parcelY)
    const size = WORLD_CONFIG.PARCEL_SIZE
    const y = 0.05

    const points = [
      new Vector3(worldCoords.x, y, worldCoords.z),
      new Vector3(worldCoords.x + size, y, worldCoords.z),
      new Vector3(worldCoords.x + size, y, worldCoords.z + size),
      new Vector3(worldCoords.x, y, worldCoords.z + size),
      new Vector3(worldCoords.x, y, worldCoords.z),
    ]

    const border = MeshBuilder.CreateLines(
      `parcel_border_${key}`,
      { points },
      this.scene
    )

    // Ownership determines base border color
    let borderColor: Color3
    if (isSystem) {
      borderColor = new Color3(0.83, 0.66, 0.22) // Golden: #d4a837
    } else if (isOwn) {
      borderColor = new Color3(1, 0.3, 0.3)     // Red: own parcel
    } else if (isOther) {
      borderColor = new Color3(0.9, 0.6, 0.2)   // Orange: other player
    } else if (purchasable) {
      borderColor = new Color3(0.3, 0.6, 1)     // Blue: available to buy
    } else {
      borderColor = new Color3(0.3, 0.3, 0.3)   // Dark gray: out of range
    }

    if (isSystem) {
      // No biome tint for system parcels — pure golden
      border.color = borderColor
    } else {
      // Subtle biome tint on the border (30% biome, 70% ownership)
      const biome = getBiome(parcelX, parcelY)
      const bc = BIOME_COLORS[biome]
      border.color = new Color3(
        borderColor.r * 0.7 + bc.r * 0.3,
        borderColor.g * 0.7 + bc.g * 0.3,
        borderColor.b * 0.7 + bc.b * 0.3
      )
    }

    return border
  }

  /** Create a floating owner name label above a parcel */
  private createOwnerLabel(parcelX: number, parcelY: number, key: string, ownerId: string): Mesh {
    const worldCoords = this.parcelToWorldCoords(parcelX, parcelY)
    const size = WORLD_CONFIG.PARCEL_SIZE
    const isSystem = ownerId === WORLD_CONFIG.SYSTEM_PLAYER_ID

    const labelPlane = MeshBuilder.CreatePlane(
      `parcel_owner_label_${key}`,
      { width: 20, height: 5 },
      this.scene
    )
    labelPlane.position.x = worldCoords.x + size / 2
    labelPlane.position.y = 12
    labelPlane.position.z = worldCoords.z + size / 2
    labelPlane.billboardMode = 7 // Always face camera

    const texture = new DynamicTexture(`label_tex_${key}`, { width: 256, height: 64 }, this.scene)
    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D
    ctx.clearRect(0, 0, 256, 64)

    if (isSystem) {
      // Golden background for system parcels
      ctx.fillStyle = 'rgba(40, 30, 5, 0.7)'
      ctx.beginPath()
      ctx.roundRect(4, 4, 248, 56, 8)
      ctx.fill()
      ctx.font = 'bold 22px Arial'
      ctx.fillStyle = '#FFD700'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(WORLD_CONFIG.SYSTEM_PLAYER_NAME + ' World', 128, 32)
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.beginPath()
      ctx.roundRect(4, 4, 248, 56, 8)
      ctx.fill()
      ctx.font = 'bold 24px Arial'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(ownerId.slice(0, 16), 128, 32)
    }
    texture.update()

    const mat = new StandardMaterial(`label_mat_${key}`, this.scene)
    mat.diffuseTexture = texture
    mat.emissiveColor = new Color3(1, 1, 1)
    mat.disableLighting = true
    mat.useAlphaFromDiffuseTexture = true
    mat.backFaceCulling = false
    labelPlane.material = mat
    labelPlane.isPickable = false

    return labelPlane
  }

  private unloadDistantParcels(centerX: number, centerY: number): void {
    const radius = WORLD_CONFIG.UNLOAD_RADIUS

    for (const [key, loaded] of this.loadedParcels.entries()) {
      const distance = Math.max(
        Math.abs(loaded.parcel.x - centerX),
        Math.abs(loaded.parcel.y - centerY)
      )

      if (distance > radius) {
        this.unloadParcel(key)
      }
    }
  }

  private unloadParcel(key: string): void {
    const loaded = this.loadedParcels.get(key)
    if (loaded) {
      loaded.ground.dispose()
      loaded.border.dispose()
      if (loaded.editIcon) loaded.editIcon.dispose()
      if (loaded.buyIcon) loaded.buyIcon.dispose()
      if (loaded.ownerLabel) loaded.ownerLabel.dispose()
      if (loaded.priceLabel) loaded.priceLabel.dispose()
      for (const deco of loaded.decorations) deco.dispose()
      for (const bld of loaded.buildings.values()) bld.dispose()
      this.loadedParcels.delete(key)
    }
  }

  setVisible(visible: boolean): void {
    for (const loaded of this.loadedParcels.values()) {
      loaded.ground.setEnabled(visible)
      loaded.border.setEnabled(visible)
      if (loaded.editIcon) loaded.editIcon.setEnabled(visible)
      if (loaded.buyIcon) loaded.buyIcon.setEnabled(visible)
      if (loaded.ownerLabel) loaded.ownerLabel.setEnabled(visible)
      if (loaded.priceLabel) loaded.priceLabel.setEnabled(visible)
      for (const deco of loaded.decorations) deco.setEnabled(visible)
      for (const bld of loaded.buildings.values()) bld.rootNode.setEnabled(visible)
    }
  }

  getLoadedParcelsCount(): number {
    return this.loadedParcels.size
  }

  getLoadedParcels(): Map<string, LoadedParcel> {
    return this.loadedParcels
  }

  markParcelAsOwned(x: number, y: number, ownerId: string): void {
    const key = this.getParcelKey(x, y)
    const loaded = this.loadedParcels.get(key)
    if (!loaded) return

    loaded.parcel.ownerId = ownerId
    this.refreshParcelVisuals(key, loaded)

    // Animación de compra
    this.animatePurchase(x, y)

    // Añadir a parcelas del jugador si es propia
    if (this.isOwnParcel(ownerId)) {
      this.addPlayerParcel(loaded.parcel)
    }
  }

  getCurrentParcelCoords(): { x: number; y: number } {
    return { x: this.currentParcelX, y: this.currentParcelY }
  }

  /** Load or update a parcel from server data */
  loadParcelFromServer(data: { id: string; ownerId: string; x: number; y: number }): void {
    const key = this.getParcelKey(data.x, data.y)

    // If already loaded, update ownership
    const existing = this.loadedParcels.get(key)
    if (existing) {
      if (existing.parcel.ownerId !== (data.ownerId || null)) {
        existing.parcel.ownerId = data.ownerId || null
        this.refreshParcelVisuals(key, existing)
      }
      return
    }

    // Create new parcel
    const parcel: Parcel = {
      id: data.id,
      ownerId: data.ownerId || null,
      x: data.x,
      y: data.y,
    }

    this.createParcelMeshes(key, parcel)
  }

  /** Remove a parcel by its coordinate key (e.g. "0,0") */
  removeParcelByKey(key: string): void {
    this.unloadParcel(key)
  }

  /** Check if parcel key is already loaded */
  hasParcel(key: string): boolean {
    return this.loadedParcels.has(key)
  }

  /** Set the local player's ID so we can distinguish own parcels */
  private localPlayerId: string = 'player1'

  setLocalPlayerId(id: string): void {
    this.localPlayerId = id
  }

  getLocalPlayerId(): string {
    return this.localPlayerId
  }

  private isOwnParcel(ownerId: string): boolean {
    return ownerId === this.localPlayerId
  }

  /** Refresh visuals for a parcel (after ownership change) */
  private refreshParcelVisuals(key: string, loaded: LoadedParcel): void {
    const parcel = loaded.parcel
    const isSystem = parcel.ownerId === WORLD_CONFIG.SYSTEM_PLAYER_ID
    const isOwn = !isSystem && !!parcel.ownerId && this.isOwnParcel(parcel.ownerId)
    const isOther = !isSystem && !!parcel.ownerId && !isOwn
    const purchasable = !parcel.ownerId && !isSystem && this.isPurchasable(parcel.x, parcel.y)

    // Update ground color based on biome + ownership
    const biome = getBiome(parcel.x, parcel.y)
    const material = loaded.ground.material as StandardMaterial
    material.diffuseColor = computeGroundColor(biome, parcel.x, parcel.y, isOwn, isOther, purchasable, isSystem)

    // Update border
    loaded.border.dispose()
    loaded.border = this.createParcelBorder(parcel.x, parcel.y, key, isOwn, purchasable, isOther, isSystem)

    // Update icons and labels
    if (loaded.editIcon) { loaded.editIcon.dispose(); loaded.editIcon = null }
    if (loaded.buyIcon) { loaded.buyIcon.dispose(); loaded.buyIcon = null }
    if (loaded.ownerLabel) { loaded.ownerLabel.dispose(); loaded.ownerLabel = null }
    if (loaded.priceLabel) { loaded.priceLabel.dispose(); loaded.priceLabel = null }
    // Update decorations: remove when owned/system or in LOD mode
    for (const deco of loaded.decorations) deco.dispose()
    if (!loaded.lowDetail && !parcel.ownerId && !isSystem) {
      const neighbors = getNeighborBiomes(parcel.x, parcel.y)
      loaded.decorations = generateDecorations(this.scene, parcel.x, parcel.y, biome, neighbors)
    } else {
      loaded.decorations = []
    }
    if (isSystem) {
      loaded.ownerLabel = this.createOwnerLabel(parcel.x, parcel.y, key, parcel.ownerId!)
    } else if (isOwn) {
      loaded.editIcon = this.createEditIcon(parcel.x, parcel.y, key, parcel)
    } else if (isOther) {
      loaded.ownerLabel = this.createOwnerLabel(parcel.x, parcel.y, key, parcel.ownerId!)
    } else if (purchasable) {
      loaded.buyIcon = this.createBuyIcon(parcel.x, parcel.y, key, parcel)
      loaded.priceLabel = this.createPriceLabel(parcel.x, parcel.y, key)
    }
  }

  worldToParcel(worldX: number, worldZ: number): { x: number; y: number } {
    return this.worldToParcelCoords(worldX, worldZ)
  }

  /** Add a building to a loaded parcel (read-only, for viewing other players' constructions) */
  addBuildingToParcel(parcelX: number, parcelY: number, serverObjectId: string, objectName: string, localX: number, localY: number): void {
    const key = this.getParcelKey(parcelX, parcelY)
    const loaded = this.loadedParcels.get(key)
    if (!loaded || loaded.lowDetail) return
    if (loaded.buildings.has(serverObjectId)) return // Already rendered

    const buildingType = findBuildingTypeByName(objectName)
    if (!buildingType) return

    const worldCoords = this.parcelToWorldCoords(parcelX, parcelY)
    const worldX = worldCoords.x + localX + buildingType.sizeX / 2
    const worldZ = worldCoords.z + localY + buildingType.sizeZ / 2

    const building = new Building(
      this.scene,
      buildingType,
      localX,
      localY,
      new Vector3(worldX, 0, worldZ)
    )
    building.setNormalMode()
    building.mesh.isPickable = false

    loaded.buildings.set(serverObjectId, building)
  }

  /** Remove a building from a loaded parcel by server placed object ID */
  removeBuildingFromParcel(parcelX: number, parcelY: number, serverObjectId: string): void {
    const key = this.getParcelKey(parcelX, parcelY)
    const loaded = this.loadedParcels.get(key)
    if (!loaded) return

    const building = loaded.buildings.get(serverObjectId)
    if (building) {
      building.dispose()
      loaded.buildings.delete(serverObjectId)
    }
  }

  /** Get a loaded parcel's data by coordinates */
  getLoadedParcel(parcelX: number, parcelY: number): LoadedParcel | undefined {
    return this.loadedParcels.get(this.getParcelKey(parcelX, parcelY))
  }

  dispose(): void {
    for (const key of this.loadedParcels.keys()) {
      this.unloadParcel(key)
    }
  }
}
