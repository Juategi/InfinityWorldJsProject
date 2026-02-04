import { Game } from '../game/Game'
import { BuildingManager } from '../game/BuildingManager'
import type { BuildingType } from '../game/Building'

export class UIManager {
  private game: Game

  // Elementos del DOM
  private goldDisplay!: HTMLElement
  private gemsDisplay!: HTMLElement
  private buildBtn!: HTMLElement
  private buildModal!: HTMLElement
  private buildList!: HTMLElement
  private closeBuildModalBtn!: HTMLElement

  constructor(game: Game) {
    this.game = game
  }

  init(): void {
    this.cacheElements()
    this.setupEventListeners()
    this.updateResourceDisplay()
    this.populateBuildingList()
  }

  private cacheElements(): void {
    this.goldDisplay = document.querySelector('#resource-gold .resource-value')!
    this.gemsDisplay = document.querySelector('#resource-gems .resource-value')!
    this.buildBtn = document.getElementById('btn-build')!
    this.buildModal = document.getElementById('build-modal')!
    this.buildList = document.getElementById('build-list')!
    this.closeBuildModalBtn = document.getElementById('close-build-modal')!
  }

  private setupEventListeners(): void {
    // Botón de construcción
    this.buildBtn.addEventListener('click', () => {
      this.showBuildModal()
    })

    // Cerrar modal
    this.closeBuildModalBtn.addEventListener('click', () => {
      this.hideBuildModal()
    })

    // Click fuera del modal para cerrar
    this.buildModal.addEventListener('click', (e) => {
      if (e.target === this.buildModal) {
        this.hideBuildModal()
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
      // Gastar recursos
      this.game.spendGold(building.type.cost)
    }) as EventListener)

    document.addEventListener('buildingSelected', ((e: CustomEvent) => {
      console.log('Edificio seleccionado:', e.detail)
      // Aquí se puede mostrar un panel de info del edificio
    }) as EventListener)

    // Tecla Escape para cancelar construcción
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.game.getBuildingManager().cancelBuildMode()
      }
    })
  }

  private updateResourceDisplay(): void {
    this.goldDisplay.textContent = this.formatNumber(this.game.state.gold)
    this.gemsDisplay.textContent = this.formatNumber(this.game.state.gems)
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  private populateBuildingList(): void {
    const buildings = BuildingManager.getBuildingTypes()

    this.buildList.innerHTML = buildings.map(building => `
      <button class="build-item" data-building-type="${building.id}">
        <span class="build-item-icon">${building.icon}</span>
        <span class="build-item-name">${building.name}</span>
        <span class="build-item-cost">💰 ${building.cost}</span>
      </button>
    `).join('')

    // Agregar estilos inline para los items
    const style = document.createElement('style')
    style.textContent = `
      .build-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 12px 8px;
        background: #3a3a3a;
        border: 2px solid #555;
        border-radius: 8px;
        color: white;
        cursor: pointer;
        transition: all 0.15s;
      }
      .build-item:hover {
        background: #4a4a4a;
        border-color: #4CAF50;
      }
      .build-item:active {
        transform: scale(0.95);
      }
      .build-item-icon {
        font-size: 28px;
      }
      .build-item-name {
        font-size: 11px;
        font-weight: 600;
      }
      .build-item-cost {
        font-size: 10px;
        color: #ffd700;
      }
      .build-item.disabled {
        opacity: 0.5;
        pointer-events: none;
      }
    `
    document.head.appendChild(style)

    // Event listeners para cada item
    this.buildList.querySelectorAll('.build-item').forEach(btn => {
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

    // Verificar si tiene suficiente oro
    if (this.game.state.gold < building.cost) {
      this.showToast('No tienes suficiente oro')
      return
    }

    this.hideBuildModal()
    this.game.getBuildingManager().startBuildMode(typeId)
  }

  private showBuildModal(): void {
    this.buildModal.classList.remove('hidden')
    this.updateBuildingAvailability()
  }

  private hideBuildModal(): void {
    this.buildModal.classList.add('hidden')
  }

  private updateBuildingAvailability(): void {
    const buttons = this.buildList.querySelectorAll('.build-item')
    const buildings = BuildingManager.getBuildingTypes()

    buttons.forEach(btn => {
      const typeId = btn.getAttribute('data-building-type')
      const building = buildings.find(b => b.id === typeId)

      if (building && this.game.state.gold < building.cost) {
        btn.classList.add('disabled')
      } else {
        btn.classList.remove('disabled')
      }
    })
  }

  private onBuildModeStart(buildingType: BuildingType): void {
    // Mostrar indicador de modo construcción
    this.buildBtn.innerHTML = `
      <span>❌</span>
      <span>Cancelar</span>
    `
    this.buildBtn.style.background = 'linear-gradient(180deg, #f44336 0%, #c62828 100%)'

    // Cambiar comportamiento del botón
    this.buildBtn.onclick = () => {
      this.game.getBuildingManager().cancelBuildMode()
    }

    this.showToast(`Toca para colocar: ${buildingType.name}`)
  }

  private onBuildModeEnd(): void {
    // Restaurar botón
    this.buildBtn.innerHTML = `
      <span>🏗️</span>
      <span>Construir</span>
    `
    this.buildBtn.style.background = 'linear-gradient(180deg, #4CAF50 0%, #388E3C 100%)'

    this.buildBtn.onclick = () => {
      this.showBuildModal()
    }
  }

  private showToast(message: string): void {
    // Crear toast si no existe
    let toast = document.getElementById('toast')
    if (!toast) {
      toast = document.createElement('div')
      toast.id = 'toast'
      toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s;
      `
      document.body.appendChild(toast)
    }

    toast.textContent = message
    toast.style.opacity = '1'

    setTimeout(() => {
      toast.style.opacity = '0'
    }, 2000)
  }
}
