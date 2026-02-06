import { Scene } from '@babylonjs/core/scene'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Grid } from './Grid'
import { Building, BuildingType, BUILDING_TYPES } from './Building'

export class BuildingManager {
  private scene: Scene
  private grid: Grid
  private buildings: Map<string, Building> = new Map()
  private previewBuilding: Building | null = null
  private currentBuildType: BuildingType | null = null
  private worldOffsetX: number = 0
  private worldOffsetZ: number = 0

  constructor(scene: Scene, grid: Grid) {
    this.scene = scene
    this.grid = grid
  }

  // Trasladar todos los edificios a coordenadas locales (para modo edición)
  toLocalCoordinates(parcelWorldX: number, parcelWorldZ: number): void {
    const offsetX = parcelWorldX - this.worldOffsetX
    const offsetZ = parcelWorldZ - this.worldOffsetZ

    for (const building of this.buildings.values()) {
      const currentPos = building.mesh.position
      building.mesh.position = new Vector3(
        currentPos.x - offsetX,
        currentPos.y,
        currentPos.z - offsetZ
      )
    }

    this.worldOffsetX = parcelWorldX
    this.worldOffsetZ = parcelWorldZ
  }

  // Trasladar todos los edificios a coordenadas del mundo
  toWorldCoordinates(): void {
    for (const building of this.buildings.values()) {
      const currentPos = building.mesh.position
      building.mesh.position = new Vector3(
        currentPos.x + this.worldOffsetX,
        currentPos.y,
        currentPos.z + this.worldOffsetZ
      )
    }

    this.worldOffsetX = 0
    this.worldOffsetZ = 0
  }

  // Mostrar/ocultar todos los edificios
  setVisible(visible: boolean): void {
    for (const building of this.buildings.values()) {
      building.mesh.setEnabled(visible)
    }
  }

  // Obtener el offset actual
  getWorldOffset(): { x: number; z: number } {
    return { x: this.worldOffsetX, z: this.worldOffsetZ }
  }

  // Iniciar modo construcción
  startBuildMode(typeId: string): void {
    const buildingType = BUILDING_TYPES[typeId]
    if (!buildingType) {
      console.error(`Tipo de edificio no encontrado: ${typeId}`)
      return
    }

    this.cancelBuildMode()
    this.currentBuildType = buildingType

    // Mostrar grid de ayuda
    this.grid.showGridLines(true)

    document.dispatchEvent(new CustomEvent('buildModeStart', { detail: buildingType }))
  }

  // Cancelar modo construcción
  cancelBuildMode(): void {
    if (this.previewBuilding) {
      this.previewBuilding.dispose()
      this.previewBuilding = null
    }
    this.currentBuildType = null
    this.grid.showGridLines(false)

    document.dispatchEvent(new CustomEvent('buildModeEnd'))
  }

  // Actualizar preview del edificio mientras el usuario mueve el cursor/dedo
  updatePreview(worldPos: Vector3): void {
    if (!this.currentBuildType) return

    const gridPos = this.grid.worldToGrid(worldPos)
    if (!gridPos) {
      if (this.previewBuilding) {
        this.previewBuilding.mesh.isVisible = false
      }
      return
    }

    const snappedPos = this.grid.gridToWorld(
      gridPos.x,
      gridPos.z,
      this.currentBuildType.sizeX,
      this.currentBuildType.sizeZ
    )

    // Crear preview si no existe
    if (!this.previewBuilding) {
      this.previewBuilding = new Building(
        this.scene,
        this.currentBuildType,
        gridPos.x,
        gridPos.z,
        snappedPos
      )
    }

    this.previewBuilding.mesh.isVisible = true
    this.previewBuilding.setPosition(snappedPos)
    this.previewBuilding.gridX = gridPos.x
    this.previewBuilding.gridZ = gridPos.z

    // Verificar si la posición es válida
    const isValid = this.grid.isAreaAvailable(
      gridPos.x,
      gridPos.z,
      this.currentBuildType.sizeX,
      this.currentBuildType.sizeZ
    )
    this.previewBuilding.setPreviewMode(isValid)
  }

  // Confirmar construcción
  confirmBuild(): Building | null {
    if (!this.previewBuilding || !this.currentBuildType) return null

    const gridX = this.previewBuilding.gridX
    const gridZ = this.previewBuilding.gridZ

    // Verificar disponibilidad final
    const isValid = this.grid.isAreaAvailable(
      gridX,
      gridZ,
      this.currentBuildType.sizeX,
      this.currentBuildType.sizeZ
    )

    if (!isValid) return null

    // Crear edificio definitivo
    const worldPos = this.grid.gridToWorld(
      gridX,
      gridZ,
      this.currentBuildType.sizeX,
      this.currentBuildType.sizeZ
    )

    const building = new Building(
      this.scene,
      this.currentBuildType,
      gridX,
      gridZ,
      worldPos
    )

    // Ocupar celdas
    this.grid.occupyCells(
      gridX,
      gridZ,
      this.currentBuildType.sizeX,
      this.currentBuildType.sizeZ,
      building.id
    )

    // Registrar edificio
    this.buildings.set(building.id, building)

    // Limpiar preview
    this.previewBuilding.dispose()
    this.previewBuilding = null

    document.dispatchEvent(new CustomEvent('buildingPlaced', { detail: building }))

    return building
  }

  // Eliminar edificio
  removeBuilding(buildingId: string): boolean {
    const building = this.buildings.get(buildingId)
    if (!building) return false

    // Liberar celdas
    this.grid.freeCells(
      building.gridX,
      building.gridZ,
      building.type.sizeX,
      building.type.sizeZ
    )

    // Eliminar mesh
    building.dispose()
    this.buildings.delete(buildingId)

    document.dispatchEvent(new CustomEvent('buildingRemoved', { detail: buildingId }))

    return true
  }

  // Obtener edificio por ID
  getBuilding(buildingId: string): Building | undefined {
    return this.buildings.get(buildingId)
  }

  // Obtener todos los edificios
  getAllBuildings(): Building[] {
    return Array.from(this.buildings.values())
  }

  // Verificar si está en modo construcción
  isInBuildMode(): boolean {
    return this.currentBuildType !== null
  }

  // Obtener tipo actual de construcción
  getCurrentBuildType(): BuildingType | null {
    return this.currentBuildType
  }

  // Obtener tipos de edificios disponibles
  static getBuildingTypes(): BuildingType[] {
    return Object.values(BUILDING_TYPES)
  }
}
