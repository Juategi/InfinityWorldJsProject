import { Engine } from '@babylonjs/core/Engines/engine'
import { Scene } from '@babylonjs/core/scene'
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent'
import { Grid } from './Grid'
import { BuildingManager } from './BuildingManager'
import { InputManager } from './InputManager'
import { ParcelManager } from './ParcelManager'
import type { GameState, GameMode, Parcel } from '../types'
import { WORLD_CONFIG } from '../config/world'
import { quality, type QualityConfig } from '../config/QualitySettings'
import type { WorldSync } from '../network/WorldSync'

export class Game {
  private canvas: HTMLCanvasElement
  private engine: Engine
  private scene!: Scene
  private camera!: ArcRotateCamera
  private grid!: Grid
  private buildingManager!: BuildingManager
  private inputManager!: InputManager
  private parcelManager!: ParcelManager
  private worldSync: WorldSync | null = null
  private shadowGenerator: ShadowGenerator | null = null

  private currentMode: GameMode = 'world'
  private editingParcel: Parcel | null = null
  private savedCameraPosition: Vector3 | null = null

  public state: GameState = {
    coins: 500,
    buildings: []
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true
    })

    // Manejar resize
    window.addEventListener('resize', () => {
      this.engine.resize()
    })
  }

  async init(): Promise<void> {
    this.scene = new Scene(this.engine)
    this.scene.clearColor = new Color4(0.4, 0.6, 0.9, 1) // Cielo azul claro

    this.setupCamera()
    this.setupLighting()

    // Inicializar sistema de parcelas (modo mundo)
    this.parcelManager = new ParcelManager(this.scene)
    await this.parcelManager.loadParcelsAround(0, 0)

    // Callback cuando se hace clic en icono de edición
    this.parcelManager.onEditParcel((parcel) => {
      this.enterEditMode(parcel)
    })

    // Callback cuando se hace clic en icono de compra
    this.parcelManager.onBuyParcel((parcel) => {
      document.dispatchEvent(new CustomEvent('buyParcelRequest', { detail: parcel }))
    })

    // Inicializar Grid para modo edición (oculto inicialmente)
    this.grid = new Grid(this.scene, WORLD_CONFIG.PARCEL_SIZE, WORLD_CONFIG.PARCEL_SIZE)
    this.buildingManager = new BuildingManager(this.scene, this.grid)
    this.inputManager = new InputManager(this.scene, this.camera, this.grid, this.buildingManager)

    // Grid oculto en modo mundo
    this.grid.setVisible(false)

    // Actualizar parcelas según movimiento de cámara (solo en modo mundo)
    this.scene.onBeforeRenderObservable.add(() => {
      if (this.currentMode === 'world') {
        // If connected to server, WorldSync handles parcel requests
        if (this.worldSync) {
          this.worldSync.updateCameraPosition(this.camera.target.x, this.camera.target.z)
        } else {
          // Offline fallback: load parcels locally
          this.parcelManager.updateFromCameraPosition(this.camera.target)
        }
      }
    })
  }

  enterEditMode(parcel: Parcel): void {
    if (this.currentMode === 'edit') return

    this.currentMode = 'edit'
    this.editingParcel = parcel
    document.dispatchEvent(new CustomEvent('gameModeChange', { detail: { mode: 'edit' } }))

    // Guardar posición de cámara
    this.savedCameraPosition = this.camera.target.clone()

    // Ocultar parcelas del mundo
    this.parcelManager.setVisible(false)

    // Calcular offset de la parcela en coordenadas del mundo
    const parcelWorldX = parcel.x * WORLD_CONFIG.PARCEL_SIZE
    const parcelWorldZ = parcel.y * WORLD_CONFIG.PARCEL_SIZE

    // Mover edificios a coordenadas locales (0-100)
    this.buildingManager.toLocalCoordinates(parcelWorldX, parcelWorldZ)

    // Mostrar grid para edición
    this.grid.setVisible(true)
    this.grid.createGround()

    // Centrar cámara en el centro del grid (50, 50)
    const gridCenter = WORLD_CONFIG.PARCEL_SIZE / 2
    this.camera.target = new Vector3(gridCenter, 0, gridCenter)
    this.camera.radius = 80

    // Emitir evento para UI
    document.dispatchEvent(new CustomEvent('gameModeChange', {
      detail: { mode: 'edit', parcel }
    }))
  }

  exitEditMode(): void {
    if (this.currentMode === 'world') return

    const parcel = this.editingParcel

    this.currentMode = 'world'
    this.editingParcel = null

    // Ocultar grid
    this.grid.setVisible(false)

    // Mover edificios a coordenadas del mundo
    this.buildingManager.toWorldCoordinates()

    // Mostrar parcelas del mundo
    this.parcelManager.setVisible(true)

    // Restaurar posición de cámara (al centro de la parcela editada)
    if (parcel) {
      const parcelCenterX = parcel.x * WORLD_CONFIG.PARCEL_SIZE + WORLD_CONFIG.PARCEL_SIZE / 2
      const parcelCenterZ = parcel.y * WORLD_CONFIG.PARCEL_SIZE + WORLD_CONFIG.PARCEL_SIZE / 2
      this.camera.target = new Vector3(parcelCenterX, 0, parcelCenterZ)
    } else if (this.savedCameraPosition) {
      this.camera.target = this.savedCameraPosition
    }
    this.camera.radius = 80

    // Emitir evento para UI
    document.dispatchEvent(new CustomEvent('gameModeChange', {
      detail: { mode: 'world', parcel: null }
    }))
  }

  getMode(): GameMode {
    return this.currentMode
  }

  getEditingParcel(): Parcel | null {
    return this.editingParcel
  }

  private setupCamera(): void {
    // Centro de la parcela (0,0)
    const initialTarget = new Vector3(
      WORLD_CONFIG.PARCEL_SIZE / 2,
      0,
      WORLD_CONFIG.PARCEL_SIZE / 2
    )

    // Cámara isométrica estilo Clash of Clans
    this.camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 4,      // Alpha: rotación horizontal (45 grados)
      Math.PI / 3,       // Beta: ángulo vertical (~60 grados desde arriba)
      80,                // Radio: distancia
      initialTarget,     // Target: centro de parcela (0,0)
      this.scene
    )

    // Límites de zoom
    this.camera.lowerRadiusLimit = 15
    this.camera.upperRadiusLimit = 150

    // Límites de ángulo vertical (evitar ver desde abajo)
    this.camera.lowerBetaLimit = Math.PI / 6
    this.camera.upperBetaLimit = Math.PI / 2.5

    // Habilitar controles táctiles
    this.camera.attachControl(this.canvas, true)

    // Configurar panning
    this.camera.panningSensibility = 100
    this.camera.panningInertia = 0.9

    // Controles WASD
    this.setupKeyboardControls()
  }

  private setupKeyboardControls(): void {
    const keys: Record<string, boolean> = {}
    const moveSpeed = 0.5

    window.addEventListener('keydown', (e) => {
      keys[e.key.toLowerCase()] = true
    })

    window.addEventListener('keyup', (e) => {
      keys[e.key.toLowerCase()] = false
    })

    // Actualizar posición cada frame
    this.scene.onBeforeRenderObservable.add(() => {
      const forward = new Vector3(
        Math.sin(this.camera.alpha),
        0,
        Math.cos(this.camera.alpha)
      )
      const right = new Vector3(
        Math.sin(this.camera.alpha + Math.PI / 2),
        0,
        Math.cos(this.camera.alpha + Math.PI / 2)
      )

      const movement = Vector3.Zero()

      if (keys['w']) movement.addInPlace(forward)
      if (keys['s']) movement.subtractInPlace(forward)
      if (keys['a']) movement.subtractInPlace(right)
      if (keys['d']) movement.addInPlace(right)

      if (movement.length() > 0) {
        movement.normalize().scaleInPlace(moveSpeed)
        this.camera.target.addInPlace(movement)
      }
    })
  }

  private directionalLight: DirectionalLight | null = null

  private setupLighting(): void {
    const config = quality.getConfig()

    // Luz ambiental
    const hemisphericLight = new HemisphericLight(
      'hemisphericLight',
      new Vector3(0, 1, 0),
      this.scene
    )
    hemisphericLight.intensity = 0.6
    hemisphericLight.diffuse = new Color3(1, 1, 1)
    hemisphericLight.groundColor = new Color3(0.4, 0.4, 0.5)

    // Luz direccional (sol)
    this.directionalLight = new DirectionalLight(
      'directionalLight',
      new Vector3(-1, -2, -1),
      this.scene
    )
    this.directionalLight.intensity = 0.8
    this.directionalLight.diffuse = new Color3(1, 0.95, 0.8)

    // Sombras (based on quality)
    if (config.shadowsEnabled) {
      const shadowGen = new ShadowGenerator(config.shadowMapSize, this.directionalLight)
      shadowGen.useBlurExponentialShadowMap = true
      shadowGen.blurScale = 2
      this.shadowGenerator = shadowGen
    }

    // Niebla
    if (config.fogEnabled) {
      this.scene.fogMode = Scene.FOGMODE_LINEAR
      this.scene.fogColor = new Color3(0.4, 0.6, 0.9)
      this.scene.fogStart = 200
      this.scene.fogEnd = 400
    }

    // FPS limit
    if (config.maxFps > 0) {
      this.engine.setHardwareScalingLevel(1)
    }

    // Listen for quality changes
    quality.onChange((newConfig) => this.applyQuality(newConfig))
  }

  /** Apply quality settings at runtime */
  private applyQuality(config: QualityConfig): void {
    // Shadows
    if (!config.shadowsEnabled && this.shadowGenerator) {
      this.shadowGenerator.dispose()
      this.shadowGenerator = null
    } else if (config.shadowsEnabled && !this.shadowGenerator && this.directionalLight) {
      this.shadowGenerator = new ShadowGenerator(config.shadowMapSize, this.directionalLight)
      this.shadowGenerator.useBlurExponentialShadowMap = true
      this.shadowGenerator.blurScale = 2
    }

    // Fog
    if (config.fogEnabled) {
      this.scene.fogMode = Scene.FOGMODE_LINEAR
    } else {
      this.scene.fogMode = Scene.FOGMODE_NONE
    }

    // Update load radii in WORLD_CONFIG
    WORLD_CONFIG.LOAD_RADIUS = config.loadRadius
    WORLD_CONFIG.DETAIL_RADIUS = config.detailRadius
  }

  getShadowGenerator(): ShadowGenerator | null {
    return this.shadowGenerator
  }

  run(): void {
    this.engine.runRenderLoop(() => {
      this.scene.render()
    })
  }

  stop(): void {
    this.engine.stopRenderLoop()
  }

  // Métodos públicos para interactuar con el juego
  getScene(): Scene {
    return this.scene
  }

  getGrid(): Grid {
    return this.grid
  }

  getBuildingManager(): BuildingManager {
    return this.buildingManager
  }

  getInputManager(): InputManager {
    return this.inputManager
  }

  addCoins(amount: number): void {
    this.state.coins += amount
    document.dispatchEvent(new CustomEvent('resourceUpdate', { detail: this.state }))
  }

  spendCoins(amount: number): boolean {
    if (this.state.coins >= amount) {
      this.state.coins -= amount
      document.dispatchEvent(new CustomEvent('resourceUpdate', { detail: this.state }))
      return true
    }
    return false
  }

  getParcelManager(): ParcelManager {
    return this.parcelManager
  }

  setWorldSync(sync: WorldSync | null): void {
    if (this.worldSync) {
      this.worldSync.dispose()
    }
    this.worldSync = sync
  }

  getWorldSync(): WorldSync | null {
    return this.worldSync
  }

  dispose(): void {
    if (this.worldSync) {
      this.worldSync.dispose()
      this.worldSync = null
    }
    this.parcelManager.dispose()
    this.engine.dispose()
  }
}
