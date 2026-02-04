import { Scene } from '@babylonjs/core/scene'
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { PointerEventTypes, PointerInfo } from '@babylonjs/core/Events/pointerEvents'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Plane } from '@babylonjs/core/Maths/math.plane'
import '@babylonjs/core/Culling/ray'
import { Grid } from './Grid'
import { BuildingManager } from './BuildingManager'

export class InputManager {
  private scene: Scene
  private camera: ArcRotateCamera
  private grid: Grid
  private buildingManager: BuildingManager
  private isDragging: boolean = false
  private lastPointerPos: { x: number; y: number } | null = null
  private groundPlane: Plane

  constructor(
    scene: Scene,
    camera: ArcRotateCamera,
    grid: Grid,
    buildingManager: BuildingManager
  ) {
    this.scene = scene
    this.camera = camera
    this.grid = grid
    this.buildingManager = buildingManager

    // Plano del suelo en Y=0
    this.groundPlane = Plane.FromPositionAndNormal(Vector3.Zero(), Vector3.Up())

    this.setupPointerEvents()
  }

  private setupPointerEvents(): void {
    this.scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN:
          this.onPointerDown(pointerInfo)
          break
        case PointerEventTypes.POINTERMOVE:
          this.onPointerMove(pointerInfo)
          break
        case PointerEventTypes.POINTERUP:
          this.onPointerUp(pointerInfo)
          break
      }
    })
  }

  // Calcular posición en el ground usando ray-plane intersection
  private getGroundPosition(pointerInfo: PointerInfo): Vector3 | null {
    const ray = this.scene.createPickingRay(
      this.scene.pointerX,
      this.scene.pointerY,
      null,
      this.camera
    )

    // Calcular distancia al plano
    const distance = ray.intersectsPlane(this.groundPlane)
    if (distance === null || distance < 0) return null

    // Calcular punto de intersección
    return ray.origin.add(ray.direction.scale(distance))
  }

  private onPointerDown(pointerInfo: PointerInfo): void {
    this.isDragging = false
    const evt = pointerInfo.event as PointerEvent
    this.lastPointerPos = { x: evt.clientX, y: evt.clientY }
  }

  private onPointerMove(pointerInfo: PointerInfo): void {
    const evt = pointerInfo.event as PointerEvent

    if (this.lastPointerPos) {
      const dx = Math.abs(evt.clientX - this.lastPointerPos.x)
      const dy = Math.abs(evt.clientY - this.lastPointerPos.y)
      if (dx > 10 || dy > 10) {
        this.isDragging = true
      }
    }

    // Actualizar preview en modo construcción
    if (this.buildingManager.isInBuildMode()) {
      const groundPos = this.getGroundPosition(pointerInfo)
      if (groundPos) {
        this.buildingManager.updatePreview(groundPos)
      }
    }
  }

  private onPointerUp(pointerInfo: PointerInfo): void {
    // Si fue un tap (no drag)
    if (!this.isDragging) {
      this.handleTap(pointerInfo)
    }

    this.lastPointerPos = null
    this.isDragging = false
  }

  private handleTap(pointerInfo: PointerInfo): void {
    // En modo construcción: colocar edificio
    if (this.buildingManager.isInBuildMode()) {
      const groundPos = this.getGroundPosition(pointerInfo)
      if (groundPos) {
        this.buildingManager.updatePreview(groundPos)
        this.buildingManager.confirmBuild()
      }
      return
    }

    // En modo normal: seleccionar edificios
    const pickInfo = pointerInfo.pickInfo
    if (pickInfo?.hit && pickInfo.pickedMesh) {
      const metadata = pickInfo.pickedMesh.metadata
      if (metadata?.buildingId) {
        document.dispatchEvent(new CustomEvent('buildingSelected', {
          detail: {
            buildingId: metadata.buildingId,
            type: metadata.type
          }
        }))
      }
    }
  }

  // Obtener posición del mundo desde coordenadas de pantalla
  getWorldPosition(screenX: number, screenY: number): Vector3 | null {
    const ray = this.scene.createPickingRay(screenX, screenY, null, this.camera)
    const distance = ray.intersectsPlane(this.groundPlane)
    if (distance === null || distance < 0) return null
    return ray.origin.add(ray.direction.scale(distance))
  }
}
