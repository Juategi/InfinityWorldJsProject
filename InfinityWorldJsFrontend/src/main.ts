import { Game } from './game/Game'
import { UIManager } from './ui/UIManager'
import { calculateParcelPrice, chebyshevDistance, MAX_BUY_DISTANCE } from './config/world'
import { BUILDING_TYPES } from './game/Building'
import { initInventory, isUnlocked, unlockObject } from './game/PlayerInventory'
import type { BuildingType, BuildingCategory, BuildingEra } from './game/Building'
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
  document.getElementById('shop-screen')!.style.display = 'none'
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
  const screens = ['main-menu', 'parcels-screen', 'settings-screen', 'shop-screen']
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
    game.getParcelManager().setPlayerParcels(playerParcels)
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

// --- Tienda ---

// Inicializar inventario (desbloquea objetos gratuitos)
initInventory()

let shopEraFilter: BuildingEra | 'all' = 'all'
let shopCatFilter: BuildingCategory | 'all' = 'all'
let shopSection: 'objects' | 'parcels' = 'objects'

function getCoins(): number {
  return game ? game.state.coins : 500
}

function updateShopCoins() {
  const el = document.querySelector('.shop-coins-value')
  if (el) {
    const coins = getCoins()
    el.textContent = coins >= 1000 ? coins.toLocaleString() : String(coins)
  }
}

async function showShopScreen(from: 'menu' | 'hud' = 'menu') {
  if (from === 'menu') {
    const menu = document.getElementById('main-menu')!
    await hideScreen(menu)
  } else {
    // Desde HUD: ocultar canvas y overlay
    document.getElementById('game-canvas')!.style.display = 'none'
    document.getElementById('ui-overlay')!.style.display = 'none'
    if (game) game.stop()
  }
  updateShopCoins()
  renderShopItems()
  renderShopParcels()
  showScreen(document.getElementById('shop-screen')!)
}

function updateShopSectionUI() {
  document.querySelectorAll('.shop-section-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-shop-section') === shopSection)
  })
  document.getElementById('shop-objects-section')!.style.display = shopSection === 'objects' ? 'flex' : 'none'
  document.getElementById('shop-parcels-section')!.style.display = shopSection === 'parcels' ? 'flex' : 'none'
}

function renderShopItems() {
  const grid = document.getElementById('shop-items-grid')!
  const allItems = Object.values(BUILDING_TYPES).filter(bt => bt.era)

  const filtered = allItems.filter(bt => {
    if (shopEraFilter !== 'all' && bt.era !== shopEraFilter) return false
    if (shopCatFilter !== 'all' && bt.category !== shopCatFilter) return false
    return true
  })

  grid.innerHTML = filtered.map(bt => {
    const owned = isUnlocked(bt.id)
    const isFree = bt.cost === 0

    return `
      <div class="shop-item-card ${owned ? 'unlocked' : ''}" data-item-id="${bt.id}">
        <div class="shop-item-icon">${bt.icon}</div>
        <span class="shop-item-name">${bt.name}</span>
        <span class="shop-item-meta">${bt.sizeX}x${bt.sizeZ}</span>
        ${owned
          ? '<div class="shop-item-price free">Desbloqueado</div>'
          : isFree
            ? '<div class="shop-item-price free">Gratis</div>'
            : `<div class="shop-item-price paid"><div class="cost-icon"></div><span>${bt.cost}</span></div>`
        }
      </div>
    `
  }).join('')

  // Click events
  grid.querySelectorAll('.shop-item-card').forEach(card => {
    card.addEventListener('pointerdown', () => {
      const id = card.getAttribute('data-item-id')!
      onShopItemClick(id)
    })
  })
}

function onShopItemClick(itemId: string) {
  const bt = BUILDING_TYPES[itemId]
  if (!bt) return

  if (isUnlocked(bt.id)) {
    showToast('Ya desbloqueado!')
    return
  }

  if (bt.cost === 0) {
    // Gratis: desbloquear directamente
    unlockObject(bt.id)
    renderShopItems()
    showToast(`${bt.name} desbloqueado!`)
    return
  }

  // Mostrar diálogo de compra
  showBuyObjectDialog(bt)
}

let pendingBuyObject: BuildingType | null = null

function showBuyObjectDialog(bt: BuildingType) {
  pendingBuyObject = bt
  document.getElementById('buy-object-icon')!.textContent = bt.icon
  document.getElementById('buy-object-name')!.textContent = bt.name
  document.getElementById('buy-object-desc')!.textContent = `${bt.sizeX}x${bt.sizeZ} - ${bt.era ?? ''}`
  document.getElementById('buy-object-price')!.textContent = String(bt.cost)

  const confirmBtn = document.getElementById('btn-buy-object-confirm') as HTMLButtonElement
  confirmBtn.disabled = getCoins() < bt.cost

  document.getElementById('buy-object-dialog')!.style.display = 'flex'
}

function hideBuyObjectDialog() {
  pendingBuyObject = null
  document.getElementById('buy-object-dialog')!.style.display = 'none'
}

function confirmBuyObject() {
  if (!pendingBuyObject) return

  const cost = pendingBuyObject.cost
  if (getCoins() < cost) {
    showToast('Monedas insuficientes!')
    hideBuyObjectDialog()
    return
  }

  if (game) {
    game.spendCoins(cost)
  }

  unlockObject(pendingBuyObject.id)
  showToast(`${pendingBuyObject.name} desbloqueado!`)
  hideBuyObjectDialog()
  updateShopCoins()
  renderShopItems()
}

// --- Parcelas en tienda (5B.5) ---

function renderShopParcels() {
  const grid = document.getElementById('shop-parcels-grid')!

  // Centros de expansión: parcelas propias, o el origen si no tiene ninguna
  const centers = playerParcels.length > 0
    ? playerParcels.map(p => ({ x: p.x, y: p.y }))
    : [{ x: 0, y: 0 }]

  // Generar parcelas comprables dentro del radio de proximidad
  const displayRadius = Math.min(MAX_BUY_DISTANCE, 10)
  const available: Array<{ x: number; y: number; price: number; dist: number; owned: boolean }> = []
  const seen = new Set<string>()

  // Agregar parcelas propias como "owned"
  for (const p of playerParcels) {
    const key = `${p.x}:${p.y}`
    seen.add(key)
    const dist = chebyshevDistance(p.x, p.y, 0, 0)
    available.push({ x: p.x, y: p.y, price: 0, dist, owned: true })
  }

  // Generar parcelas disponibles alrededor de cada centro
  for (const center of centers) {
    for (let dx = -displayRadius; dx <= displayRadius; dx++) {
      for (let dy = -displayRadius; dy <= displayRadius; dy++) {
        const px = center.x + dx
        const py = center.y + dy
        const key = `${px}:${py}`
        if (seen.has(key)) continue
        seen.add(key)

        const distToCenter = chebyshevDistance(px, py, center.x, center.y)
        if (distToCenter === 0 || distToCenter > MAX_BUY_DISTANCE) continue

        available.push({
          x: px,
          y: py,
          price: calculateParcelPrice(px, py),
          dist: distToCenter,
          owned: false,
        })
      }
    }
  }

  // Ordenar: propias primero (por distancia), luego disponibles por distancia
  available.sort((a, b) => {
    if (a.owned !== b.owned) return a.owned ? -1 : 1
    return a.dist - b.dist
  })

  // Limitar a 60 resultados
  const toShow = available.slice(0, 60)

  grid.innerHTML = toShow.map(p => `
    <div class="shop-parcel-card ${p.owned ? 'owned' : ''}" data-px="${p.x}" data-py="${p.y}" data-pprice="${p.price}">
      <div class="shop-parcel-coords">(${p.x}, ${p.y})</div>
      <div class="shop-parcel-distance">${p.owned ? 'Tu parcela' : `Dist. al centro: ${chebyshevDistance(p.x, p.y, 0, 0)}`}</div>
      ${p.owned
        ? '<div class="shop-parcel-price" style="color: #66BB6A;">Tuya</div>'
        : `<div class="shop-parcel-price"><div class="cost-icon"></div><span>${p.price}</span></div>`
      }
    </div>
  `).join('')

  grid.querySelectorAll('.shop-parcel-card:not(.owned)').forEach(card => {
    card.addEventListener('pointerdown', () => {
      const x = Number(card.getAttribute('data-px'))
      const y = Number(card.getAttribute('data-py'))
      onShopParcelClick(x, y)
    })
  })
}

function onShopParcelClick(x: number, y: number) {
  const price = calculateParcelPrice(x, y)
  if (getCoins() < price) {
    showToast('Monedas insuficientes!')
    return
  }

  pendingBuyParcel = { id: `${x},${y}`, ownerId: '', x, y }
  const dialog = document.getElementById('buy-parcel-dialog')!
  document.getElementById('buy-parcel-x')!.textContent = String(x)
  document.getElementById('buy-parcel-y')!.textContent = String(y)
  document.getElementById('buy-parcel-price')!.textContent = String(price)

  const confirmBtn = document.getElementById('btn-buy-parcel-confirm') as HTMLButtonElement
  confirmBtn.disabled = getCoins() < price

  dialog.style.display = 'flex'
}

// --- Diálogo de compra de parcela ---

let pendingBuyParcel: Parcel | null = null

function showBuyParcelDialog(parcel: Parcel) {
  pendingBuyParcel = parcel
  const price = calculateParcelPrice(parcel.x, parcel.y)
  const dialog = document.getElementById('buy-parcel-dialog')!
  document.getElementById('buy-parcel-x')!.textContent = String(parcel.x)
  document.getElementById('buy-parcel-y')!.textContent = String(parcel.y)
  document.getElementById('buy-parcel-price')!.textContent = String(price)

  const confirmBtn = document.getElementById('btn-buy-parcel-confirm') as HTMLButtonElement
  confirmBtn.disabled = game ? game.state.coins < price : true

  dialog.style.display = 'flex'
}

function hideBuyParcelDialog() {
  pendingBuyParcel = null
  document.getElementById('buy-parcel-dialog')!.style.display = 'none'
}

function confirmBuyParcel() {
  if (!pendingBuyParcel || !game) return

  const price = calculateParcelPrice(pendingBuyParcel.x, pendingBuyParcel.y)
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
  updateShopCoins()
  renderShopParcels()
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
  document.getElementById('btn-parcels-to-shop')!.addEventListener('pointerdown', async () => {
    const parcelsScreen = document.getElementById('parcels-screen')!
    await hideScreen(parcelsScreen)
    shopSection = 'parcels'
    updateShopSectionUI()
    updateShopCoins()
    renderShopItems()
    renderShopParcels()
    showScreen(document.getElementById('shop-screen')!)
  })

  // Tienda desde menú principal
  document.getElementById('btn-menu-shop')!.addEventListener('pointerdown', () => {
    showShopScreen('menu')
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

  // --- Tienda: navegación y filtros ---

  // Botón back de tienda
  document.getElementById('btn-shop-back')!.addEventListener('pointerdown', () => {
    const shopScreen = document.getElementById('shop-screen')!
    hideScreen(shopScreen).then(() => showScreen(document.getElementById('main-menu')!))
  })

  // Tienda desde HUD (icono shop en el mundo)
  document.getElementById('btn-shop')!.addEventListener('pointerdown', (e) => {
    e.stopPropagation()
    showShopScreen('hud')
  })

  // Tabs de sección (Objetos / Parcelas)
  document.querySelectorAll('.shop-section-tab').forEach(tab => {
    tab.addEventListener('pointerdown', () => {
      shopSection = (tab.getAttribute('data-shop-section') as 'objects' | 'parcels') || 'objects'
      updateShopSectionUI()
    })
  })

  // Era tabs
  document.querySelectorAll('.shop-era-tab').forEach(tab => {
    tab.addEventListener('pointerdown', () => {
      shopEraFilter = (tab.getAttribute('data-era') as BuildingEra | 'all') || 'all'
      document.querySelectorAll('.shop-era-tab').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      renderShopItems()
    })
  })

  // Category filters
  document.querySelectorAll('.shop-cat-filter').forEach(btn => {
    btn.addEventListener('pointerdown', () => {
      shopCatFilter = (btn.getAttribute('data-cat') as BuildingCategory | 'all') || 'all'
      document.querySelectorAll('.shop-cat-filter').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      renderShopItems()
    })
  })

  // Diálogo compra de objeto
  document.getElementById('btn-buy-object-cancel')!.addEventListener('pointerdown', () => {
    hideBuyObjectDialog()
  })

  document.getElementById('btn-buy-object-confirm')!.addEventListener('pointerdown', () => {
    confirmBuyObject()
  })
})
