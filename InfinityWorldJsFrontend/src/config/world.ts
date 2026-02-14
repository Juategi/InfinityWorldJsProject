export const WORLD_CONFIG = {
  PARCEL_SIZE: 100,
  DETAIL_RADIUS: 2,    // Full detail: decorations, icons, labels
  LOAD_RADIUS: 4,      // LOD zone: ground + border only, no decorations
  UNLOAD_RADIUS: 5,    // Beyond this, parcels are unloaded
}

/** Distancia máxima (Chebyshev) a la que un jugador puede comprar una parcela */
export const MAX_BUY_DISTANCE = 20

/** Precio base de una parcela (la más lejana del centro) */
export const BASE_PARCEL_PRICE = 50

/** Precio máximo de una parcela (en el centro) */
export const MAX_PARCEL_PRICE = 500

/** Radio a partir del cual el precio es el mínimo */
export const PRICE_MAX_DISTANCE = 50

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

/**
 * Precio determinista de una parcela basado en distancia al centro.
 * Más cerca del centro → más caro.
 */
export function calculateParcelPrice(x: number, y: number): number {
  const dist = distanceToOrigin(x, y)

  if (dist >= PRICE_MAX_DISTANCE) return BASE_PARCEL_PRICE
  if (dist === 0) return MAX_PARCEL_PRICE

  const t = dist / PRICE_MAX_DISTANCE
  const logT = Math.log(1 + t * 9) / Math.log(10)
  const price = MAX_PARCEL_PRICE - (MAX_PARCEL_PRICE - BASE_PARCEL_PRICE) * logT

  return Math.round(price)
}
