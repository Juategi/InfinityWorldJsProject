import { Scene } from '@babylonjs/core/scene'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'
import '@babylonjs/loaders/glTF'

export type BuildingCategory = 'buildings' | 'nature' | 'decor'

export interface BuildingType {
  id: string
  name: string
  icon: string
  category: BuildingCategory
  sizeX: number
  sizeZ: number
  height: number
  cost: number
  color: Color3
  isNew?: boolean
  modelFile?: string
  modelScale?: number
}

// Definición de tipos de edificios
export const BUILDING_TYPES: Record<string, BuildingType> = {
  // === BUILDINGS ===
  stoneCottage: {
    id: 'stoneCottage',
    name: 'Stone Cottage',
    icon: '🏠',
    category: 'buildings',
    sizeX: 2,
    sizeZ: 2,
    height: 2,
    cost: 500,
    color: new Color3(0.6, 0.5, 0.4)
  },
  townhall: {
    id: 'townhall',
    name: 'Town Hall',
    icon: '🏛️',
    category: 'buildings',
    sizeX: 4,
    sizeZ: 4,
    height: 3,
    cost: 0,
    color: new Color3(0.8, 0.7, 0.5)
  },
  goldmine: {
    id: 'goldmine',
    name: 'Gold Mine',
    icon: '⛏️',
    category: 'buildings',
    sizeX: 3,
    sizeZ: 3,
    height: 1.5,
    cost: 150,
    color: new Color3(0.9, 0.8, 0.3)
  },
  storage: {
    id: 'storage',
    name: 'Storage',
    icon: '🏪',
    category: 'buildings',
    sizeX: 3,
    sizeZ: 3,
    height: 2,
    cost: 100,
    color: new Color3(0.6, 0.4, 0.2)
  },
  barracks: {
    id: 'barracks',
    name: 'Barracks',
    icon: '⚔️',
    category: 'buildings',
    sizeX: 3,
    sizeZ: 3,
    height: 2.5,
    cost: 200,
    color: new Color3(0.5, 0.3, 0.3)
  },
  wall: {
    id: 'wall',
    name: 'Wall',
    icon: '🧱',
    category: 'buildings',
    sizeX: 1,
    sizeZ: 1,
    height: 1.2,
    cost: 50,
    color: new Color3(0.5, 0.5, 0.5)
  },
  tower: {
    id: 'tower',
    name: 'Tower',
    icon: '🗼',
    category: 'buildings',
    sizeX: 2,
    sizeZ: 2,
    height: 4,
    cost: 300,
    color: new Color3(0.4, 0.4, 0.5)
  },

  // === NATURE ===
  oakTree: {
    id: 'oakTree',
    name: 'Oak Tree',
    icon: '🌳',
    category: 'nature',
    sizeX: 1,
    sizeZ: 1,
    height: 3,
    cost: 150,
    color: new Color3(0.2, 0.5, 0.2)
  },
  pineTree: {
    id: 'pineTree',
    name: 'Pine Tree',
    icon: '🌲',
    category: 'nature',
    sizeX: 1,
    sizeZ: 1,
    height: 3.5,
    cost: 120,
    color: new Color3(0.1, 0.4, 0.2)
  },
  bush: {
    id: 'bush',
    name: 'Bush',
    icon: '🌿',
    category: 'nature',
    sizeX: 1,
    sizeZ: 1,
    height: 0.8,
    cost: 50,
    color: new Color3(0.3, 0.6, 0.3)
  },
  flowerBed: {
    id: 'flowerBed',
    name: 'Flower Bed',
    icon: '🌸',
    category: 'nature',
    sizeX: 1,
    sizeZ: 1,
    height: 0.3,
    cost: 75,
    color: new Color3(0.9, 0.5, 0.6)
  },

  // === DECOR ===
  fountain: {
    id: 'fountain',
    name: 'Fountain',
    icon: '⛲',
    category: 'decor',
    sizeX: 2,
    sizeZ: 2,
    height: 1.5,
    cost: 300,
    color: new Color3(0.6, 0.7, 0.8),
    isNew: true
  },
  statue: {
    id: 'statue',
    name: 'Statue',
    icon: '🗿',
    category: 'decor',
    sizeX: 1,
    sizeZ: 1,
    height: 2,
    cost: 250,
    color: new Color3(0.7, 0.7, 0.7)
  },
  bench: {
    id: 'bench',
    name: 'Bench',
    icon: '🪑',
    category: 'decor',
    sizeX: 1,
    sizeZ: 1,
    height: 0.5,
    cost: 80,
    color: new Color3(0.5, 0.3, 0.2)
  },
  lamp: {
    id: 'lamp',
    name: 'Street Lamp',
    icon: '🏮',
    category: 'decor',
    sizeX: 1,
    sizeZ: 1,
    height: 2.5,
    cost: 100,
    color: new Color3(0.3, 0.3, 0.3),
    isNew: true
  },

  // === MODELOS 3D ===
  whimsicalCottage: {
    id: 'whimsicalCottage',
    name: 'Whimsical Cottage',
    icon: '🏡',
    category: 'buildings',
    sizeX: 3,
    sizeZ: 3,
    height: 3,
    cost: 400,
    color: new Color3(0.7, 0.5, 0.3),
    isNew: true,
    modelFile: '/models/whimsical_cottage.glb',
    modelScale: 1
  }
}

export class Building {
  public id: string
  public type: BuildingType
  public gridX: number
  public gridZ: number
  public mesh: Mesh
  public rootNode: TransformNode
  private scene: Scene
  private modelMeshes: AbstractMesh[] = []
  private originalMaterials: Map<AbstractMesh, import('@babylonjs/core/Materials/material').Material | null> = new Map()
  private modelLoaded: boolean = false
  private previewMaterial: StandardMaterial | null = null
  private footprintMesh: Mesh | null = null
  private footprintMaterial: StandardMaterial | null = null

  constructor(scene: Scene, type: BuildingType, gridX: number, gridZ: number, worldPos: Vector3) {
    this.scene = scene
    this.type = type
    this.gridX = gridX
    this.gridZ = gridZ
    this.id = `${type.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Nodo raíz para posicionamiento
    this.rootNode = new TransformNode(`${this.id}_root`, this.scene)
    this.rootNode.position = new Vector3(worldPos.x, 0, worldPos.z)

    // Crear caja placeholder
    this.mesh = this.createMesh()
    this.mesh.parent = this.rootNode
    this.mesh.metadata = { buildingId: this.id, type: type.id }

    // Cargar modelo GLB si está definido
    if (type.modelFile) {
      this.loadModel(type.modelFile)
    }
  }

  private createMesh(): Mesh {
    const mesh = MeshBuilder.CreateBox(
      this.id,
      {
        width: this.type.sizeX * 0.9,
        height: this.type.height,
        depth: this.type.sizeZ * 0.9
      },
      this.scene
    )

    // Posición relativa al rootNode (solo offset Y)
    mesh.position = new Vector3(0, this.type.height / 2, 0)

    // Material
    const material = new StandardMaterial(`${this.id}_material`, this.scene)
    material.diffuseColor = this.type.color
    material.specularColor = new Color3(0.2, 0.2, 0.2)
    mesh.material = material

    return mesh
  }

  private async loadModel(modelFile: string): Promise<void> {
    try {
      const result = await SceneLoader.ImportMeshAsync('', '', modelFile, this.scene)

      const rootMesh = result.meshes[0]
      rootMesh.parent = this.rootNode

      // Medir bounding box a escala 1 para calcular auto-fit
      rootMesh.scaling = new Vector3(1, 1, 1)
      rootMesh.computeWorldMatrix(true)
      for (const m of result.meshes) {
        m.computeWorldMatrix(true)
      }
      const rawBounds = rootMesh.getHierarchyBoundingVectors(true)
      const modelWidth = rawBounds.max.x - rawBounds.min.x
      const modelDepth = rawBounds.max.z - rawBounds.min.z

      // Auto-escalar para que el modelo encaje en sizeX x sizeZ celdas
      const userScale = this.type.modelScale ?? 1
      let fitScale = userScale
      if (modelWidth > 0 && modelDepth > 0) {
        fitScale = Math.min(this.type.sizeX / modelWidth, this.type.sizeZ / modelDepth) * userScale
      }
      rootMesh.scaling = new Vector3(fitScale, fitScale, fitScale)

      // Recalcular bounds con escala final para posicionar en Y=0
      rootMesh.computeWorldMatrix(true)
      for (const m of result.meshes) {
        m.computeWorldMatrix(true)
      }
      const bounds = rootMesh.getHierarchyBoundingVectors(true)
      rootMesh.position.y = -bounds.min.y

      // Guardar referencias, materiales originales y metadata para raycasting
      this.modelMeshes = result.meshes as AbstractMesh[]
      for (const m of this.modelMeshes) {
        m.metadata = { buildingId: this.id, type: this.type.id }
        this.originalMaterials.set(m, m.material)
      }

      this.modelLoaded = true

      // Ocultar placeholder, mostrar modelo
      this.mesh.isVisible = false
    } catch (error) {
      console.warn(`Error cargando modelo ${modelFile}, usando placeholder:`, error)
    }
  }

  setPosition(worldPos: Vector3): void {
    this.rootNode.position = new Vector3(worldPos.x, 0, worldPos.z)
  }

  setPreviewMode(valid: boolean): void {
    const color = valid
      ? new Color3(0.2, 0.8, 0.2)
      : new Color3(0.8, 0.2, 0.2)

    // Mostrar footprint del suelo
    this.showFootprint(true, color)

    if (this.modelLoaded) {
      // Usar el modelo real con material semitransparente
      this.mesh.isVisible = false
      this.setModelVisible(true)

      if (!this.previewMaterial) {
        this.previewMaterial = new StandardMaterial(`${this.id}_preview`, this.scene)
        this.previewMaterial.specularColor = new Color3(0, 0, 0)
      }
      this.previewMaterial.diffuseColor = color
      this.previewMaterial.alpha = 0.7

      for (const m of this.modelMeshes) {
        m.material = this.previewMaterial
      }
    } else {
      // Fallback: usar caja placeholder
      this.mesh.isVisible = true
      const material = this.mesh.material as StandardMaterial
      material.diffuseColor = color
      material.alpha = 0.7
    }
  }

  setNormalMode(): void {
    // Ocultar footprint
    this.showFootprint(false)

    if (this.modelLoaded) {
      // Restaurar materiales originales del modelo
      this.mesh.isVisible = false
      for (const m of this.modelMeshes) {
        const original = this.originalMaterials.get(m)
        if (original !== undefined) {
          m.material = original
        }
      }
      this.setModelVisible(true)
    } else {
      const material = this.mesh.material as StandardMaterial
      material.diffuseColor = this.type.color
      material.alpha = 1
    }
  }

  private showFootprint(visible: boolean, color?: Color3): void {
    if (visible) {
      // Crear footprint si no existe
      if (!this.footprintMesh) {
        this.footprintMesh = MeshBuilder.CreateGround(
          `${this.id}_footprint`,
          { width: this.type.sizeX, height: this.type.sizeZ },
          this.scene
        )
        this.footprintMesh.parent = this.rootNode
        this.footprintMesh.position.y = 0.05 // Ligeramente sobre el suelo

        this.footprintMaterial = new StandardMaterial(`${this.id}_footprint_mat`, this.scene)
        this.footprintMaterial.specularColor = new Color3(0, 0, 0)
        this.footprintMaterial.backFaceCulling = false
        this.footprintMesh.material = this.footprintMaterial
      }

      if (this.footprintMaterial && color) {
        this.footprintMaterial.diffuseColor = color
        this.footprintMaterial.alpha = 0.5
      }
      this.footprintMesh.isVisible = true
    } else if (this.footprintMesh) {
      this.footprintMesh.isVisible = false
    }
  }

  private setModelVisible(visible: boolean): void {
    for (const m of this.modelMeshes) {
      m.isVisible = visible
    }
  }

  dispose(): void {
    for (const m of this.modelMeshes) {
      m.dispose()
    }
    this.modelMeshes = []
    this.originalMaterials.clear()
    this.previewMaterial?.dispose()
    this.footprintMaterial?.dispose()
    this.footprintMesh?.dispose()
    this.mesh.dispose()
    this.rootNode.dispose()
  }
}
