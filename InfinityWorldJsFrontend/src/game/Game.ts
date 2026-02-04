import { Engine } from '@babylonjs/core/Engines/engine'
import { Scene } from '@babylonjs/core/scene'
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { Grid } from './Grid'
import { BuildingManager } from './BuildingManager'
import { InputManager } from './InputManager'
import type { GameState } from '../types/GameState'

export class Game {
  private canvas: HTMLCanvasElement
  private engine: Engine
  private scene!: Scene
  private camera!: ArcRotateCamera
  private grid!: Grid
  private buildingManager!: BuildingManager
  private inputManager!: InputManager

  public state: GameState = {
    gold: 1000,
    gems: 50,
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

    // Inicializar sistemas
    this.grid = new Grid(this.scene, 100, 100)
    this.buildingManager = new BuildingManager(this.scene, this.grid)
    this.inputManager = new InputManager(this.scene, this.camera, this.grid, this.buildingManager)

    // Crear terreno inicial
    this.grid.createGround()
  }

  private setupCamera(): void {
    // Cámara isométrica estilo Clash of Clans
    this.camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 4,      // Alpha: rotación horizontal (45 grados)
      Math.PI / 3,       // Beta: ángulo vertical (~60 grados desde arriba)
      30,                // Radio: distancia
      Vector3.Zero(),    // Target: centro del mundo
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

  private setupLighting(): void {
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
    const directionalLight = new DirectionalLight(
      'directionalLight',
      new Vector3(-1, -2, -1),
      this.scene
    )
    directionalLight.intensity = 0.8
    directionalLight.diffuse = new Color3(1, 0.95, 0.8)
  }

  run(): void {
    this.engine.runRenderLoop(() => {
      this.scene.render()
    })
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

  addGold(amount: number): void {
    this.state.gold += amount
    document.dispatchEvent(new CustomEvent('resourceUpdate', { detail: this.state }))
  }

  spendGold(amount: number): boolean {
    if (this.state.gold >= amount) {
      this.state.gold -= amount
      document.dispatchEvent(new CustomEvent('resourceUpdate', { detail: this.state }))
      return true
    }
    return false
  }

  dispose(): void {
    this.engine.dispose()
  }
}
