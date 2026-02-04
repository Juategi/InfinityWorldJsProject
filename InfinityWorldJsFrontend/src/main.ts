import { Game } from './game/Game'
import { UIManager } from './ui/UIManager'

// Inicializar el juego cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement

  if (!canvas) {
    console.error('Canvas no encontrado')
    return
  }

  // Crear instancia del juego
  const game = new Game(canvas)

  // Inicializar UI
  const ui = new UIManager(game)

  // Iniciar el juego
  await game.init()
  ui.init()

  // Iniciar loop de renderizado
  game.run()

  // Exponer globalmente para debug (remover en producción)
  if (import.meta.env.DEV) {
    (window as unknown as { game: Game }).game = game
  }
})
