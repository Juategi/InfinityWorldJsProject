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
import { WORLD_CONFIG } from '../config/world'

interface LoadedParcel {
  parcel: Parcel
  ground: Mesh
  border: LinesMesh
  editIcon: Mesh | null
}

export class ParcelManager {
  private scene: Scene
  private loadedParcels: Map<string, LoadedParcel> = new Map()
  private currentParcelX: number = 0
  private currentParcelY: number = 0
  private onEditParcelCallback: ((parcel: Parcel) => void) | null = null

  constructor(scene: Scene) {
    this.scene = scene
  }

  onEditParcel(callback: (parcel: Parcel) => void): void {
    this.onEditParcelCallback = callback
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

  async updateFromCameraPosition(cameraTarget: Vector3): Promise<void> {
    const parcelCoords = this.worldToParcelCoords(cameraTarget.x, cameraTarget.z)

    // Si no hemos cambiado de parcela, no hacer nada
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

    // Crear parcela local (en producción vendría del servidor)
    // Solo la parcela (0,0) tiene dueño por ahora
    const hasOwner = parcelX === 0 && parcelY === 0
    const parcel: Parcel = {
      id: key,
      ownerId: hasOwner ? 'player1' : null,
      x: parcelX,
      y: parcelY,
    }

    const worldCoords = this.parcelToWorldCoords(parcelX, parcelY)
    const size = WORLD_CONFIG.PARCEL_SIZE

    // Crear ground de la parcela
    const ground = MeshBuilder.CreateGround(
      `parcel_ground_${key}`,
      { width: size, height: size },
      this.scene
    )
    ground.position.x = worldCoords.x + size / 2
    ground.position.z = worldCoords.z + size / 2

    // Material del terreno (diferente si tiene dueño)
    const material = new StandardMaterial(`parcel_material_${key}`, this.scene)
    if (hasOwner) {
      material.diffuseColor = new Color3(0.35, 0.55, 0.25) // Verde más vivo
    } else {
      material.diffuseColor = new Color3(0.25, 0.4, 0.2) // Verde más apagado
    }
    material.specularColor = new Color3(0.1, 0.1, 0.1)
    ground.material = material
    ground.isPickable = true

    // Crear borde (rojo si tiene dueño, gris si no)
    const border = this.createParcelBorder(parcelX, parcelY, key, hasOwner)

    // Crear icono de edición solo si tiene dueño
    let editIcon: Mesh | null = null
    if (hasOwner) {
      editIcon = this.createEditIcon(parcelX, parcelY, key, parcel)
    }

    this.loadedParcels.set(key, { parcel, ground, border, editIcon })
  }

  private createEditIcon(parcelX: number, parcelY: number, key: string, parcel: Parcel): Mesh {
    const worldCoords = this.parcelToWorldCoords(parcelX, parcelY)
    const size = WORLD_CONFIG.PARCEL_SIZE

    // Crear cubo como icono de edición
    const icon = MeshBuilder.CreateBox(
      `parcel_edit_icon_${key}`,
      { size: 5 },
      this.scene
    )
    icon.position.x = worldCoords.x + size / 2
    icon.position.y = 10 // Flotando sobre el terreno
    icon.position.z = worldCoords.z + size / 2

    // Material naranja para el icono
    const iconMaterial = new StandardMaterial(`edit_icon_material_${key}`, this.scene)
    iconMaterial.diffuseColor = new Color3(1, 0.6, 0)
    iconMaterial.emissiveColor = new Color3(0.3, 0.2, 0)
    icon.material = iconMaterial

    // Hacer clickeable
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

  private createParcelBorder(parcelX: number, parcelY: number, key: string, hasOwner: boolean): LinesMesh {
    const worldCoords = this.parcelToWorldCoords(parcelX, parcelY)
    const size = WORLD_CONFIG.PARCEL_SIZE
    const y = 0.05 // Ligeramente elevado para evitar z-fighting

    const points = [
      new Vector3(worldCoords.x, y, worldCoords.z),
      new Vector3(worldCoords.x + size, y, worldCoords.z),
      new Vector3(worldCoords.x + size, y, worldCoords.z + size),
      new Vector3(worldCoords.x, y, worldCoords.z + size),
      new Vector3(worldCoords.x, y, worldCoords.z), // Cerrar el cuadrado
    ]

    const border = MeshBuilder.CreateLines(
      `parcel_border_${key}`,
      { points },
      this.scene
    )
    // Rojo si tiene dueño, gris si no
    border.color = hasOwner ? new Color3(1, 0.3, 0.3) : new Color3(0.4, 0.4, 0.4)

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
      if (loaded.editIcon) {
        loaded.editIcon.dispose()
      }
      this.loadedParcels.delete(key)
    }
  }

  setVisible(visible: boolean): void {
    for (const loaded of this.loadedParcels.values()) {
      loaded.ground.setEnabled(visible)
      loaded.border.setEnabled(visible)
      if (loaded.editIcon) {
        loaded.editIcon.setEnabled(visible)
      }
    }
  }

  getLoadedParcelsCount(): number {
    return this.loadedParcels.size
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
