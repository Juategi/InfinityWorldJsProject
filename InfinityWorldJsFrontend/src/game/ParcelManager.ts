import { Scene } from '@babylonjs/core/scene'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { ActionManager } from '@babylonjs/core/Actions/actionManager'
import { ExecuteCodeAction } from '@babylonjs/core/Actions/directActions'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { LinesMesh } from '@babylonjs/core/Meshes/linesMesh'
import type { Parcel } from '../types'
import { WORLD_CONFIG, chebyshevDistance, MAX_BUY_DISTANCE } from '../config/world'

interface LoadedParcel {
  parcel: Parcel
  ground: Mesh
  border: LinesMesh
  editIcon: Mesh | null
  buyIcon: Mesh | null
}

export class ParcelManager {
  private scene: Scene
  private loadedParcels: Map<string, LoadedParcel> = new Map()
  private currentParcelX: number = 0
  private currentParcelY: number = 0
  private onEditParcelCallback: ((parcel: Parcel) => void) | null = null
  private onBuyParcelCallback: ((parcel: Parcel) => void) | null = null

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

    this.currentParcelX = parcelCoords.x
    this.currentParcelY = parcelCoords.y

    await this.loadParcelsAround(parcelCoords.x, parcelCoords.y)
    this.unloadDistantParcels(parcelCoords.x, parcelCoords.y)
  }

  async loadParcelsAround(centerX: number, centerY: number): Promise<void> {
    const radius = WORLD_CONFIG.LOAD_RADIUS

    for (let x = centerX - radius; x <= centerX + radius; x++) {
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        const key = this.getParcelKey(x, y)
        if (!this.loadedParcels.has(key)) {
          await this.loadParcel(x, y)
        }
      }
    }
  }

  private async loadParcel(parcelX: number, parcelY: number): Promise<void> {
    const key = this.getParcelKey(parcelX, parcelY)

    // Determinar si tiene dueño (en producción vendría del servidor)
    const isOwned = this.playerParcels.some(p => p.x === parcelX && p.y === parcelY)
    const parcel: Parcel = {
      id: key,
      ownerId: isOwned ? 'player1' : null,
      x: parcelX,
      y: parcelY,
    }

    const purchasable = !isOwned && this.isPurchasable(parcelX, parcelY)

    const worldCoords = this.parcelToWorldCoords(parcelX, parcelY)
    const size = WORLD_CONFIG.PARCEL_SIZE

    // Crear ground
    const ground = MeshBuilder.CreateGround(
      `parcel_ground_${key}`,
      { width: size, height: size },
      this.scene
    )
    ground.position.x = worldCoords.x + size / 2
    ground.position.z = worldCoords.z + size / 2

    const material = new StandardMaterial(`parcel_material_${key}`, this.scene)
    if (isOwned) {
      material.diffuseColor = new Color3(0.35, 0.55, 0.25)
    } else if (purchasable) {
      material.diffuseColor = new Color3(0.28, 0.45, 0.25) // Verde intermedio para comprables
    } else {
      material.diffuseColor = new Color3(0.22, 0.35, 0.18) // Verde más apagado fuera de rango
    }
    material.specularColor = new Color3(0.1, 0.1, 0.1)
    ground.material = material
    ground.isPickable = true

    // Borde: azul si comprable, rojo si propia, gris si fuera de rango
    const border = this.createParcelBorder(parcelX, parcelY, key, isOwned, purchasable)

    // Iconos
    let editIcon: Mesh | null = null
    let buyIcon: Mesh | null = null
    if (isOwned) {
      editIcon = this.createEditIcon(parcelX, parcelY, key, parcel)
    } else if (purchasable) {
      buyIcon = this.createBuyIcon(parcelX, parcelY, key, parcel)
    }

    this.loadedParcels.set(key, { parcel, ground, border, editIcon, buyIcon })
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

  private createParcelBorder(
    parcelX: number,
    parcelY: number,
    key: string,
    hasOwner: boolean,
    purchasable: boolean
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

    if (hasOwner) {
      border.color = new Color3(1, 0.3, 0.3) // Rojo: parcela propia
    } else if (purchasable) {
      border.color = new Color3(0.3, 0.6, 1) // Azul: disponible para comprar
    } else {
      border.color = new Color3(0.3, 0.3, 0.3) // Gris oscuro: fuera de rango
    }

    return border
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
      this.loadedParcels.delete(key)
    }
  }

  setVisible(visible: boolean): void {
    for (const loaded of this.loadedParcels.values()) {
      loaded.ground.setEnabled(visible)
      loaded.border.setEnabled(visible)
      if (loaded.editIcon) loaded.editIcon.setEnabled(visible)
      if (loaded.buyIcon) loaded.buyIcon.setEnabled(visible)
    }
  }

  getLoadedParcelsCount(): number {
    return this.loadedParcels.size
  }

  markParcelAsOwned(x: number, y: number, ownerId: string): void {
    const key = this.getParcelKey(x, y)
    const loaded = this.loadedParcels.get(key)
    if (!loaded) return

    loaded.parcel.ownerId = ownerId

    // Actualizar color del suelo
    const material = loaded.ground.material as StandardMaterial
    material.diffuseColor = new Color3(0.35, 0.55, 0.25)

    // Actualizar borde a rojo (propia)
    loaded.border.color = new Color3(1, 0.3, 0.3)

    // Remover icono de compra, añadir icono de edición
    if (loaded.buyIcon) {
      loaded.buyIcon.dispose()
      loaded.buyIcon = null
    }
    loaded.editIcon = this.createEditIcon(x, y, key, loaded.parcel)

    // Añadir a parcelas del jugador
    this.addPlayerParcel(loaded.parcel)
  }

  getCurrentParcelCoords(): { x: number; y: number } {
    return { x: this.currentParcelX, y: this.currentParcelY }
  }

  dispose(): void {
    for (const key of this.loadedParcels.keys()) {
      this.unloadParcel(key)
    }
  }
}
