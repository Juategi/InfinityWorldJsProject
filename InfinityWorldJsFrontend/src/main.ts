import { Game } from './game/Game'
import { UIManager } from './ui/UIManager'
import { WORLD_CONFIG } from './config/world'
import type { Parcel } from './types'

let game: Game | null = null
let ui: UIManager | null = null
let gameInitialized = false

// Datos mock de parcelas del jugador (vacío = estado nuevo jugador)
// En DEV se añaden parcelas de ejemplo para probar la UI
const playerParcels: Parcel[] = import.meta.env.DEV
  ? [
      { id: '0,0', ownerId: 'player1', x: 0, y: 0 },
      { id: '1,0', ownerId: 'player1', x: 1, y: 0 },
      { id: '-1,2', ownerId: 'player1', x: -1, y: 2 },
    ]
  : []

// --- Utilidades ---

function showToast(message: string) {
  const toast = document.getElementById('toast')
  if (!toast) return
  toast.textContent = message
  toast.classList.add('visible')
  setTimeout(() => toast.classList.remove('visible'), 2000)
}

function hideScreen(el: HTMLElement): Promise<void> {
  el.classList.add('hiding')
  return new Promise(resolve => {
    setTimeout(() => {
      el.style.display = 'none'
      el.classList.remove('hiding')
      resolve()
    }, 400)
  })
}

function showScreen(el: HTMLElement) {
  el.style.display = el.id === 'main-menu' ? 'flex' : 'block'
  // Force reflow to ensure transition plays
  void el.offsetHeight
}

// --- Navegación ---

function hideAllScreens() {
  document.getElementById('main-menu')!.style.display = 'none'
  document.getElementById('parcels-screen')!.style.display = 'none'
  document.getElementById('settings-screen')!.style.display = 'none'
  document.getElementById('game-canvas')!.style.display = 'none'
  document.getElementById('ui-overlay')!.style.display = 'none'
}

function showMainMenu() {
  hideAllScreens()
  showScreen(document.getElementById('main-menu')!)

  if (game) {
    game.stop()
  }
}

async function enterWorld() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
  const overlay = document.getElementById('ui-overlay')!

  // Ocultar pantalla visible con transición
  const screens = ['main-menu', 'parcels-screen', 'settings-screen']
  const visibleScreen = screens
    .map(id => document.getElementById(id)!)
    .find(el => el.style.display !== 'none')
  if (visibleScreen) await hideScreen(visibleScreen)

  // Mostrar canvas y UI
  canvas.style.display = 'block'
  overlay.style.display = 'block'

  // Inicializar juego solo la primera vez
  if (!gameInitialized) {
    game = new Game(canvas)
    ui = new UIManager(game)
    await game.init()
    ui.init()
    gameInitialized = true

    // Configurar botón de volver al menú
    const btnBackMenu = document.getElementById('btn-back-menu')
    if (btnBackMenu) {
      btnBackMenu.addEventListener('pointerdown', (e) => {
        e.stopPropagation()
        showMainMenu()
      })
    }

    // Exponer globalmente para debug
    if (import.meta.env.DEV) {
      (window as unknown as { game: Game }).game = game
    }
  }

  game!.run()
}

// --- Pantalla Mis Parcelas ---

function renderParcels() {
  const listEl = document.getElementById('parcels-list')!
  const emptyEl = document.getElementById('parcels-empty')!

  if (playerParcels.length === 0) {
    emptyEl.style.display = 'flex'
    listEl.style.display = 'none'
    return
  }

  emptyEl.style.display = 'none'
  listEl.style.display = 'flex'
  listEl.innerHTML = ''

  playerParcels.forEach((parcel) => {
    const card = document.createElement('div')
    card.className = 'parcel-card'
    card.innerHTML = `
      <div class="parcel-card-icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M1 11v10h5v-6h4v6h5V11L8 4z M10 3v1.97l7 5V11h2v2h-2v2h2v2h-2v4h6V3H10zm9 6h-2V7h2v2z"/>
        </svg>
      </div>
      <div class="parcel-card-info">
        <div class="parcel-card-name">Parcela (${parcel.x}, ${parcel.y})</div>
        <div class="parcel-card-coords">Coordenadas: X=${parcel.x}, Y=${parcel.y}</div>
      </div>
      <svg class="parcel-card-arrow" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
      </svg>
    `
    card.addEventListener('pointerdown', () => {
      enterWorld()
    })
    listEl.appendChild(card)
  })
}

async function showParcelsScreen() {
  const menu = document.getElementById('main-menu')!
  const parcelsScreen = document.getElementById('parcels-screen')!

  await hideScreen(menu)
  renderParcels()
  showScreen(parcelsScreen)
}

// --- Pantalla Ajustes ---

async function showSettingsScreen() {
  const menu = document.getElementById('main-menu')!
  const settingsScreen = document.getElementById('settings-screen')!

  await hideScreen(menu)
  showScreen(settingsScreen)
}

// --- Diálogo de compra de parcela ---

let pendingBuyParcel: Parcel | null = null

function showBuyParcelDialog(parcel: Parcel) {
  pendingBuyParcel = parcel
  const dialog = document.getElementById('buy-parcel-dialog')!
  document.getElementById('buy-parcel-x')!.textContent = String(parcel.x)
  document.getElementById('buy-parcel-y')!.textContent = String(parcel.y)
  document.getElementById('buy-parcel-price')!.textContent = String(WORLD_CONFIG.PARCEL_PRICE)

  // Disable confirm if not enough coins
  const confirmBtn = document.getElementById('btn-buy-parcel-confirm') as HTMLButtonElement
  confirmBtn.disabled = game ? game.state.coins < WORLD_CONFIG.PARCEL_PRICE : true

  dialog.style.display = 'flex'
}

function hideBuyParcelDialog() {
  pendingBuyParcel = null
  document.getElementById('buy-parcel-dialog')!.style.display = 'none'
}

function confirmBuyParcel() {
  if (!pendingBuyParcel || !game) return

  const price = WORLD_CONFIG.PARCEL_PRICE
  if (game.state.coins < price) {
    showToast('Monedas insuficientes!')
    hideBuyParcelDialog()
    return
  }

  // Deduct coins locally
  game.spendCoins(price)

  // Update parcel visually
  game.getParcelManager().markParcelAsOwned(
    pendingBuyParcel.x,
    pendingBuyParcel.y,
    'player1'
  )

  // Add to player parcels list
  playerParcels.push({
    id: `${pendingBuyParcel.x},${pendingBuyParcel.y}`,
    ownerId: 'player1',
    x: pendingBuyParcel.x,
    y: pendingBuyParcel.y,
  })

  showToast(`Parcela (${pendingBuyParcel.x}, ${pendingBuyParcel.y}) comprada!`)
  hideBuyParcelDialog()
}

// --- Inicialización ---

document.addEventListener('DOMContentLoaded', () => {
  // Botón principal: Acceder al Mundo
  document.getElementById('btn-enter-world')!.addEventListener('pointerdown', () => {
    enterWorld()
  })

  // Mis Parcelas
  document.getElementById('btn-my-parcels')!.addEventListener('pointerdown', () => {
    showParcelsScreen()
  })

  // Botón back de parcelas
  document.getElementById('btn-parcels-back')!.addEventListener('pointerdown', () => {
    const parcelsScreen = document.getElementById('parcels-screen')!
    hideScreen(parcelsScreen).then(() => showScreen(document.getElementById('main-menu')!))
  })

  // Botón "Ir a la Tienda" desde parcelas vacías
  document.getElementById('btn-parcels-to-shop')!.addEventListener('pointerdown', () => {
    showToast('Tienda - Proximamente')
  })

  // Botones placeholder
  document.getElementById('btn-menu-shop')!.addEventListener('pointerdown', () => {
    showToast('Tienda - Proximamente')
  })

  // Ajustes
  document.getElementById('btn-menu-settings')!.addEventListener('pointerdown', () => {
    showSettingsScreen()
  })

  // Botón back de ajustes
  document.getElementById('btn-settings-back')!.addEventListener('pointerdown', () => {
    const settingsScreen = document.getElementById('settings-screen')!
    hideScreen(settingsScreen).then(() => showScreen(document.getElementById('main-menu')!))
  })

  // Botón cerrar sesión (placeholder)
  document.getElementById('btn-logout')!.addEventListener('pointerdown', () => {
    showToast('Cerrar sesion - Proximamente')
  })

  // Diálogo de compra de parcela
  document.getElementById('btn-buy-parcel-cancel')!.addEventListener('pointerdown', () => {
    hideBuyParcelDialog()
  })

  document.getElementById('btn-buy-parcel-confirm')!.addEventListener('pointerdown', () => {
    confirmBuyParcel()
  })

  // Escuchar petición de compra desde el juego
  document.addEventListener('buyParcelRequest', ((e: CustomEvent<Parcel>) => {
    showBuyParcelDialog(e.detail)
  }) as EventListener)
})
