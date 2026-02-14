export const WORLD_CONFIG = {
  PARCEL_SIZE: 200,
  DETAIL_RADIUS: 2,    // Full detail: decorations, icons, labels
  LOAD_RADIUS: 4,      // LOD zone: ground + border only, no decorations
  UNLOAD_RADIUS: 5,    // Beyond this, parcels are unloaded
  SYSTEM_PLAYER_ID: '00000000-0000-0000-0000-000000000000',
  SYSTEM_PLAYER_NAME: 'Infinity',
}

const SYSTEM_PARCELS = [
  { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 },
]

export function isSystemParcel(x: number, y: number): boolean {
  return SYSTEM_PARCELS.some(p => p.x === x && p.y === y)
}

/** Distancia máxima (Chebyshev) a la que un jugador puede comprar una parcela */
export const MAX_BUY_DISTANCE = 20

/** Precio fijo de cualquier parcela */
export const PARCEL_PRICE = 100

export function parcelKey(x: number, y: number): string {
  return `${x}:${y}`
}

export function chebyshevDistance(
  x1: number, y1: number, x2: number, y2: number
): number {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2))
}

export function distanceToOrigin(x: number, y: number): number {
  return Math.max(Math.abs(x), Math.abs(y))
}
