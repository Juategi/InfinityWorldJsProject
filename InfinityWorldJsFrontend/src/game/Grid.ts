import { Scene } from '@babylonjs/core/scene'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import type { LinesMesh } from '@babylonjs/core/Meshes/linesMesh'

export interface GridCell {
  x: number
  z: number
  occupied: boolean
  buildingId: string | null
}

export class Grid {
  private scene: Scene
  private width: number
  private height: number
  private cellSize: number = 1
  private cells: GridCell[][] = []
  private ground!: Mesh
  private gridLines!: LinesMesh

  constructor(scene: Scene, width: number, height: number) {
    this.scene = scene
    this.width = width
    this.height = height
    this.initializeCells()
  }

  private initializeCells(): void {
    for (let x = 0; x < this.width; x++) {
      this.cells[x] = []
      for (let z = 0; z < this.height; z++) {
        this.cells[x][z] = {
          x,
          z,
          occupied: false,
          buildingId: null
        }
      }
    }
  }

  createGround(): void {
    // Dispose si ya existe
    if (this.ground) {
      this.ground.dispose()
    }
    if (this.gridLines) {
      this.gridLines.dispose()
    }

    // Crear terreno con origen en (0,0) - esquina inferior izquierda
    this.ground = MeshBuilder.CreateGround(
      'ground',
      {
        width: this.width * this.cellSize,
        height: this.height * this.cellSize,
        subdivisions: 1
      },
      this.scene
    )

    // Posicionar para que origen esté en esquina (0,0)
    this.ground.position.x = (this.width * this.cellSize) / 2
    this.ground.position.z = (this.height * this.cellSize) / 2

    // Material del terreno (césped)
    const groundMaterial = new StandardMaterial('groundMaterial', this.scene)
    groundMaterial.diffuseColor = new Color3(0.3, 0.5, 0.2)
    groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1)
    this.ground.material = groundMaterial

    // Asegurar que el ground sea pickable
    this.ground.isPickable = true

    // Crear líneas de grid
    this.createGridLines()
  }

  private createGridLines(): void {
    const lines: Vector3[][] = []

    // Líneas verticales (origen en 0)
    for (let x = 0; x <= this.width; x++) {
      const xPos = x * this.cellSize
      lines.push([
        new Vector3(xPos, 0.01, 0),
        new Vector3(xPos, 0.01, this.height * this.cellSize)
      ])
    }

    // Líneas horizontales (origen en 0)
    for (let z = 0; z <= this.height; z++) {
      const zPos = z * this.cellSize
      lines.push([
        new Vector3(0, 0.01, zPos),
        new Vector3(this.width * this.cellSize, 0.01, zPos)
      ])
    }

    this.gridLines = MeshBuilder.CreateLineSystem(
      'gridLines',
      { lines },
      this.scene
    )
    this.gridLines.color = new Color3(0.2, 0.3, 0.15)
    this.gridLines.alpha = 0.3
  }

  // Convertir posición del mundo a celda del grid (origen en 0,0)
  worldToGrid(worldPos: Vector3): { x: number; z: number } | null {
    const gridX = Math.floor(worldPos.x / this.cellSize)
    const gridZ = Math.floor(worldPos.z / this.cellSize)

    if (gridX >= 0 && gridX < this.width && gridZ >= 0 && gridZ < this.height) {
      return { x: gridX, z: gridZ }
    }
    return null
  }

  // Convertir celda del grid a posición del mundo (origen en 0,0)
  gridToWorld(gridX: number, gridZ: number, sizeX: number = 1, sizeZ: number = 1): Vector3 {
    return new Vector3(
      (gridX + sizeX / 2) * this.cellSize,
      0,
      (gridZ + sizeZ / 2) * this.cellSize
    )
  }

  // Verificar si un área está disponible
  isAreaAvailable(startX: number, startZ: number, sizeX: number, sizeZ: number): boolean {
    for (let x = startX; x < startX + sizeX; x++) {
      for (let z = startZ; z < startZ + sizeZ; z++) {
        if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
          return false
        }
        if (this.cells[x][z].occupied) {
          return false
        }
      }
    }
    return true
  }

  // Ocupar celdas
  occupyCells(startX: number, startZ: number, sizeX: number, sizeZ: number, buildingId: string): void {
    for (let x = startX; x < startX + sizeX; x++) {
      for (let z = startZ; z < startZ + sizeZ; z++) {
        this.cells[x][z].occupied = true
        this.cells[x][z].buildingId = buildingId
      }
    }
  }

  // Liberar celdas
  freeCells(startX: number, startZ: number, sizeX: number, sizeZ: number): void {
    for (let x = startX; x < startX + sizeX; x++) {
      for (let z = startZ; z < startZ + sizeZ; z++) {
        this.cells[x][z].occupied = false
        this.cells[x][z].buildingId = null
      }
    }
  }

  getGround(): Mesh {
    return this.ground
  }

  getWidth(): number {
    return this.width
  }

  getHeight(): number {
    return this.height
  }

  getCellSize(): number {
    return this.cellSize
  }

  showGridLines(visible: boolean): void {
    if (this.gridLines) {
      this.gridLines.isVisible = visible
    }
  }

  setVisible(visible: boolean): void {
    if (this.ground) {
      this.ground.setEnabled(visible)
    }
    if (this.gridLines) {
      this.gridLines.setEnabled(visible)
    }
  }

  dispose(): void {
    if (this.ground) {
      this.ground.dispose()
    }
    if (this.gridLines) {
      this.gridLines.dispose()
    }
  }
}
