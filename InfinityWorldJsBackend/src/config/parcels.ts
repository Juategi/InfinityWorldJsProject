/**
 * Configuración y utilidades del sistema de parcelas.
 *
 * Coordenadas: enteros con signo (x, y) desde el origen (0, 0).
 * PostgreSQL INT4 soporta ±2,147,483,647 → más que suficiente.
 * Solo se persisten en BD las parcelas compradas; el mundo vacío es implícito.
 */

/** Tamaño de parcela en unidades del mundo */
export const PARCEL_SIZE = 100;

/** Distancia máxima (Chebyshev) a la que un jugador puede comprar una parcela */
export const MAX_BUY_DISTANCE = 20;

/** Precio base de una parcela (la más lejana del centro) */
export const BASE_PARCEL_PRICE = 50;

/** Precio máximo de una parcela (en el centro) */
export const MAX_PARCEL_PRICE = 500;

/** Radio a partir del cual el precio es el mínimo */
export const PRICE_MAX_DISTANCE = 50;

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

/**
 * Calcula el precio de una parcela basado en su distancia al centro.
 * Más cerca del centro → más caro (mayor demanda).
 *
 * Fórmula: interpolación logarítmica inversa.
 * - dist=0 → MAX_PARCEL_PRICE (500)
 * - dist>=PRICE_MAX_DISTANCE → BASE_PARCEL_PRICE (50)
 *
 * Determinista: dado (x, y) siempre devuelve el mismo precio.
 */
export function calculateParcelPrice(x: number, y: number): number {
  const dist = distanceToOrigin(x, y);

  if (dist >= PRICE_MAX_DISTANCE) return BASE_PARCEL_PRICE;
  if (dist === 0) return MAX_PARCEL_PRICE;

  // Interpolación logarítmica: decae rápido cerca del centro, lento lejos
  const t = dist / PRICE_MAX_DISTANCE; // 0..1
  const logT = Math.log(1 + t * 9) / Math.log(10); // log10(1+t*9) → 0..1 con curva log
  const price = MAX_PARCEL_PRICE - (MAX_PARCEL_PRICE - BASE_PARCEL_PRICE) * logT;

  return Math.round(price);
}
