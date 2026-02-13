import { BUILDING_TYPES } from './Building'

/** Conjunto de IDs de objetos desbloqueados por el jugador */
const unlocked = new Set<string>()

/** Inicializar: desbloquear todos los objetos gratuitos */
export function initInventory(): void {
  Object.values(BUILDING_TYPES).forEach(bt => {
    if (bt.cost === 0) {
      unlocked.add(bt.id)
    }
  })
}

export function isUnlocked(objectId: string): boolean {
  return unlocked.has(objectId)
}

export function unlockObject(objectId: string): void {
  unlocked.add(objectId)
}

export function getUnlockedSet(): Set<string> {
  return unlocked
}
