import { Game } from '../game/Game'
import { BuildingManager } from '../game/BuildingManager'
import { isUnlocked } from '../game/PlayerInventory'
import { notifications } from './NotificationManager'
import type { BuildingType, BuildingCategory } from '../game/Building'
import type { GameMode } from '../types'

export class UIManager {
  private game: Game

  // Elementos del DOM
  private coinsDisplay!: HTMLElement
  private menuCoinsDisplay!: HTMLElement | null
  private buildItems!: HTMLElement
  private buildTabs!: NodeListOf<HTMLElement>
  private buildModeBtn!: HTMLElement
  private buildPanel!: HTMLElement
  private exitEditBtn!: HTMLElement | null

  // Estado actual
  private currentCategory: BuildingCategory = 'buildings'

  constructor(game: Game) {
    this.game = game
  }

  init(): void {
    this.cacheElements()
    this.createEditModeUI()
    this.setupEventListeners()
    this.updateResourceDisplay()
    this.populateBuildingList()

    // Estado inicial: modo mundo (ocultar panel de construcción)
    if (this.buildPanel) {
      this.buildPanel.style.display = 'none'
    }
  }

  private cacheElements(): void {
    this.coinsDisplay = document.querySelector('#resource-coins .resource-value')!
    this.menuCoinsDisplay = document.querySelector('#menu-coins .menu-coins-value')
    this.buildItems = document.getElementById('build-items')!
    this.buildTabs = document.querySelectorAll('.build-tab')!
    this.buildModeBtn = document.getElementById('btn-build-mode')!
    this.buildPanel = document.getElementById('build-panel')!
  }

  private createEditModeUI(): void {
    // Crear botón de salir del modo edición
    const exitBtn = document.createElement('button')
    exitBtn.id = 'btn-exit-edit'
    exitBtn.className = 'exit-edit-btn'
    exitBtn.innerHTML = '← Back to World'
    exitBtn.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      padding: 12px 24px;
      background: linear-gradient(180deg, #ff6b6b 0%, #ee5a5a 100%);
      border: 2px solid #cc4444;
      border-radius: 8px;
      color: white;
      font-weight: bold;
      font-size: 16px;
      cursor: pointer;
      display: none;
      z-index: 1000;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    `
    document.body.appendChild(exitBtn)
    this.exitEditBtn = exitBtn

    // Event listener
    exitBtn.addEventListener('click', () => {
      this.game.exitEditMode()
    })
  }

  private setupEventListeners(): void {
    // Tabs de categorías
    this.buildTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const category = tab.getAttribute('data-category') as BuildingCategory
        if (category) {
          this.setActiveCategory(category)
        }
      })
    })

    // Botón principal de construcción
    this.buildModeBtn.addEventListener('click', () => {
      if (this.game.getBuildingManager().isInBuildMode()) {
        this.game.getBuildingManager().cancelBuildMode()
      }
    })

    // Herramientas de edición
    document.getElementById('btn-move')?.addEventListener('click', () => {
      const bm = this.game.getBuildingManager()
      if (bm.isInMoveMode()) {
        bm.cancelMove()
      } else if (bm.getSelectedBuildingId()) {
        bm.startMoveMode()
      } else {
        this.showToast('Select a building first')
      }
    })

    document.getElementById('btn-rotate')?.addEventListener('click', () => {
      const bm = this.game.getBuildingManager()
      if (bm.isInBuildMode()) {
        bm.rotatePreview()
      } else if (bm.getSelectedBuildingId()) {
        bm.rotateSelected()
      } else {
        this.showToast('Select a building first')
      }
    })

    document.getElementById('btn-info')?.addEventListener('click', () => {
      this.showToast('Info mode - Coming soon!')
    })

    document.getElementById('btn-delete')?.addEventListener('click', () => {
      const bm = this.game.getBuildingManager()
      const id = bm.getSelectedBuildingId()
      if (id) {
        bm.removeBuilding(id)
      } else {
        this.showToast('Select a building first')
      }
    })

    // Escuchar eventos del juego
    document.addEventListener('resourceUpdate', ((e: CustomEvent) => {
      this.game.state = e.detail
      this.updateResourceDisplay()
    }) as EventListener)

    document.addEventListener('buildModeStart', ((e: CustomEvent<BuildingType>) => {
      this.onBuildModeStart(e.detail)
    }) as EventListener)

    document.addEventListener('buildModeEnd', () => {
      this.onBuildModeEnd()
    })

    document.addEventListener('buildingPlaced', ((e: CustomEvent) => {
      const building = e.detail
      this.game.spendCoins(building.type.cost)
      this.updateBuildingAvailability()
    }) as EventListener)

    document.addEventListener('buildingSelected', ((e: CustomEvent) => {
      console.log('Edificio seleccionado:', e.detail)
    }) as EventListener)

    document.addEventListener('buildFailed', () => {
      this.showToast('Cannot place here!')
    })

    // Atajos de teclado
    document.addEventListener('keydown', (e) => {
      const bm = this.game.getBuildingManager()

      if (e.key === 'Escape') {
        if (bm.isInMoveMode()) {
          bm.cancelMove()
        } else if (bm.isInBuildMode()) {
          bm.cancelBuildMode()
        } else if (this.game.getMode() === 'edit') {
          this.game.exitEditMode()
        }
      }

      if (e.key === 'r' || e.key === 'R') {
        if (bm.isInBuildMode()) {
          bm.rotatePreview()
        } else if (bm.getSelectedBuildingId()) {
          bm.rotateSelected()
        }
      }

      if (e.key === 'm' || e.key === 'M') {
        if (bm.isInMoveMode()) {
          bm.cancelMove()
        } else if (bm.getSelectedBuildingId()) {
          bm.startMoveMode()
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const id = bm.getSelectedBuildingId()
        if (id) {
          bm.removeBuilding(id)
        }
      }
    })

    // Escuchar cambios de modo
    document.addEventListener('gameModeChange', ((e: CustomEvent<{ mode: GameMode }>) => {
      this.onModeChange(e.detail.mode)
    }) as EventListener)
  }

  private onModeChange(mode: GameMode): void {
    if (mode === 'edit') {
      // Mostrar UI de edición
      if (this.exitEditBtn) {
        this.exitEditBtn.style.display = 'block'
      }
      if (this.buildPanel) {
        this.buildPanel.style.display = 'block'
      }
      this.showToast('Edit Mode - Build your parcel!')
    } else {
      // Ocultar UI de edición
      if (this.exitEditBtn) {
        this.exitEditBtn.style.display = 'none'
      }
      if (this.buildPanel) {
        this.buildPanel.style.display = 'none'
      }
      this.showToast('World Mode - Click a parcel icon to edit')
    }
  }

  private setActiveCategory(category: BuildingCategory): void {
    this.currentCategory = category

    // Actualizar tabs
    this.buildTabs.forEach(tab => {
      if (tab.getAttribute('data-category') === category) {
        tab.classList.add('active')
      } else {
        tab.classList.remove('active')
      }
    })

    // Actualizar lista de edificios
    this.populateBuildingList()
  }

  private updateResourceDisplay(): void {
    const formatted = this.formatNumber(this.game.state.coins)
    this.coinsDisplay.textContent = formatted
    if (this.menuCoinsDisplay) {
      this.menuCoinsDisplay.textContent = formatted
    }

    // Animación de pulso al cambiar
    const coinEl = document.getElementById('resource-coins')
    if (coinEl) {
      coinEl.classList.remove('coins-changed')
      void coinEl.offsetWidth // force reflow
      coinEl.classList.add('coins-changed')
    }
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return num.toLocaleString()
    }
    return num.toString()
  }

  private populateBuildingList(): void {
    const allBuildings = BuildingManager.getBuildingTypes()
    const buildings = allBuildings.filter(b => b.category === this.currentCategory && isUnlocked(b.id))

    this.buildItems.innerHTML = buildings.map(building => `
      <button class="build-item ${this.game.state.coins < building.cost ? 'disabled' : ''}" data-building-type="${building.id}">
        ${building.isNew ? '<span class="build-item-badge">NEW</span>' : ''}
        <div class="build-item-icon">${building.icon}</div>
        <span class="build-item-name">${building.name}</span>
        <div class="build-item-cost">
          <div class="cost-icon"></div>
          <span>${building.cost}</span>
        </div>
      </button>
    `).join('')

    // Event listeners para cada item
    this.buildItems.querySelectorAll('.build-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const typeId = btn.getAttribute('data-building-type')
        if (typeId) {
          this.selectBuilding(typeId)
        }
      })
    })
  }

  private selectBuilding(typeId: string): void {
    const buildings = BuildingManager.getBuildingTypes()
    const building = buildings.find(b => b.id === typeId)

    if (!building) return

    if (this.game.state.coins < building.cost) {
      this.showToast('Monedas insuficientes!')
      return
    }

    this.game.getBuildingManager().startBuildMode(typeId)
  }

  private updateBuildingAvailability(): void {
    const buttons = this.buildItems.querySelectorAll('.build-item')
    const buildings = BuildingManager.getBuildingTypes()

    buttons.forEach(btn => {
      const typeId = btn.getAttribute('data-building-type')
      const building = buildings.find(b => b.id === typeId)

      if (building && this.game.state.coins < building.cost) {
        btn.classList.add('disabled')
      } else {
        btn.classList.remove('disabled')
      }
    })
  }

  private onBuildModeStart(buildingType: BuildingType): void {
    // Activar botón de construcción
    this.buildModeBtn.classList.add('active')
    this.showToast(`Tap to place: ${buildingType.name}`)
  }

  private onBuildModeEnd(): void {
    // Desactivar botón de construcción
    this.buildModeBtn.classList.remove('active')
  }

  private showToast(message: string): void {
    notifications.notify(message, 'info')
  }
}
