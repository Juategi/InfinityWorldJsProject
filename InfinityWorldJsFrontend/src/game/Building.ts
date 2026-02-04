import { Scene } from '@babylonjs/core/scene'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'

export interface BuildingType {
  id: string
  name: string
  icon: string
  sizeX: number
  sizeZ: number
  height: number
  cost: number
  color: Color3
}

// Definición de tipos de edificios
export const BUILDING_TYPES: Record<string, BuildingType> = {
  townhall: {
    id: 'townhall',
    name: 'Ayuntamiento',
    icon: '🏛️',
    sizeX: 4,
    sizeZ: 4,
    height: 3,
    cost: 0,
    color: new Color3(0.8, 0.7, 0.5)
  },
  goldmine: {
    id: 'goldmine',
    name: 'Mina de Oro',
    icon: '⛏️',
    sizeX: 3,
    sizeZ: 3,
    height: 1.5,
    cost: 150,
    color: new Color3(0.9, 0.8, 0.3)
  },
  storage: {
    id: 'storage',
    name: 'Almacén',
    icon: '🏪',
    sizeX: 3,
    sizeZ: 3,
    height: 2,
    cost: 100,
    color: new Color3(0.6, 0.4, 0.2)
  },
  barracks: {
    id: 'barracks',
    name: 'Cuartel',
    icon: '⚔️',
    sizeX: 3,
    sizeZ: 3,
    height: 2.5,
    cost: 200,
    color: new Color3(0.5, 0.3, 0.3)
  },
  wall: {
    id: 'wall',
    name: 'Muro',
    icon: '🧱',
    sizeX: 1,
    sizeZ: 1,
    height: 1.2,
    cost: 50,
    color: new Color3(0.5, 0.5, 0.5)
  },
  tower: {
    id: 'tower',
    name: 'Torre',
    icon: '🗼',
    sizeX: 2,
    sizeZ: 2,
    height: 4,
    cost: 300,
    color: new Color3(0.4, 0.4, 0.5)
  }
}

export class Building {
  public id: string
  public type: BuildingType
  public gridX: number
  public gridZ: number
  public mesh: Mesh
  private scene: Scene

  constructor(scene: Scene, type: BuildingType, gridX: number, gridZ: number, worldPos: Vector3) {
    this.scene = scene
    this.type = type
    this.gridX = gridX
    this.gridZ = gridZ
    this.id = `${type.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Crear mesh del edificio (placeholder - después se reemplaza con modelos 3D)
    this.mesh = this.createMesh(worldPos)
    this.mesh.metadata = { buildingId: this.id, type: type.id }
  }

  private createMesh(position: Vector3): Mesh {
    // Por ahora usamos cajas como placeholder
    // Después se pueden reemplazar con modelos GLB/GLTF
    const mesh = MeshBuilder.CreateBox(
      this.id,
      {
        width: this.type.sizeX * 0.9,
        height: this.type.height,
        depth: this.type.sizeZ * 0.9
      },
      this.scene
    )

    // Posicionar (el centro de la caja debe estar a la altura correcta)
    mesh.position = new Vector3(
      position.x,
      this.type.height / 2,
      position.z
    )

    // Material
    const material = new StandardMaterial(`${this.id}_material`, this.scene)
    material.diffuseColor = this.type.color
    material.specularColor = new Color3(0.2, 0.2, 0.2)
    mesh.material = material

    return mesh
  }

  setPosition(worldPos: Vector3): void {
    this.mesh.position = new Vector3(
      worldPos.x,
      this.type.height / 2,
      worldPos.z
    )
  }

  setPreviewMode(valid: boolean): void {
    const material = this.mesh.material as StandardMaterial
    if (valid) {
      material.diffuseColor = new Color3(0.2, 0.8, 0.2)
      material.alpha = 0.7
    } else {
      material.diffuseColor = new Color3(0.8, 0.2, 0.2)
      material.alpha = 0.7
    }
  }

  setNormalMode(): void {
    const material = this.mesh.material as StandardMaterial
    material.diffuseColor = this.type.color
    material.alpha = 1
  }

  dispose(): void {
    this.mesh.dispose()
  }
}
