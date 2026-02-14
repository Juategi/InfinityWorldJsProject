/**
 * Configuración y utilidades del sistema de parcelas.
 *
 * Coordenadas: enteros con signo (x, y) desde el origen (0, 0).
 * PostgreSQL INT4 soporta ±2,147,483,647 → más que suficiente.
 * Solo se persisten en BD las parcelas compradas; el mundo vacío es implícito.
 */

/** Tamaño de parcela en unidades del mundo */
export const PARCEL_SIZE = 200;

/** Distancia máxima (Chebyshev) a la que un jugador puede comprar una parcela */
export const MAX_BUY_DISTANCE = 20;

/** Precio fijo de cualquier parcela */
export const PARCEL_PRICE = 100;

/**
 * Clave única para una coordenada de parcela.
 * Formato "x:y" para evitar colisiones con ids UUID.
 */
export function parcelKey(x: number, y: number): string {
  return `${x}:${y}`;
}

/**
 * Distancia Chebyshev entre dos puntos (máximo de |dx|, |dy|).
 * Modela movimiento en 8 direcciones (incluye diagonales).
 */
export function chebyshevDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

/**
 * Distancia desde una coordenada al origen (0, 0).
 * Usa Chebyshev para consistencia con el sistema de proximidad.
 */
export function distanceToOrigin(x: number, y: number): number {
  return Math.max(Math.abs(x), Math.abs(y));
}
