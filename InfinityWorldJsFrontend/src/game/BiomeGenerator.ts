import { createNoise2D } from 'simplex-noise'

export type BiomeType = 'prairie' | 'forest' | 'desert' | 'snow' | 'mountain' | 'swamp'

/** Fixed seed so all players generate the same world */
const WORLD_SEED = 'InfinityWorld_42'

/**
 * Simple seeded PRNG (mulberry32).
 * Produces deterministic random numbers from a string seed.
 */
function seedRandom(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  }
  return () => {
    h |= 0
    h = h + 0x6D2B79F5 | 0
    let t = Math.imul(h ^ h >>> 15, 1 | h)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// Create deterministic noise functions using the fixed seed
const prng = seedRandom(WORLD_SEED)
const tempNoise = createNoise2D(prng)
const humidNoise = createNoise2D(prng)

/** Noise scale: larger values = bigger biome clusters */
const TEMP_SCALE = 0.06
const HUMID_SCALE = 0.055

/**
 * Sample noise with multiple octaves for more natural patterns.
 * Returns value in [-1, 1]
 */
function fractalNoise(
  noiseFn: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number = 3,
  lacunarity: number = 2.0,
  persistence: number = 0.5
): number {
  let value = 0
  let amplitude = 1
  let frequency = 1
  let maxValue = 0

  for (let i = 0; i < octaves; i++) {
    value += noiseFn(x * frequency, y * frequency) * amplitude
    maxValue += amplitude
    amplitude *= persistence
    frequency *= lacunarity
  }

  return value / maxValue
}

/**
 * Deterministic biome generation: given parcel coordinates (x, y),
 * always returns the same biome for the same coordinates.
 *
 * Uses two noise layers:
 * - Temperature: hot <-> cold
 * - Humidity: dry <-> wet
 *
 * Biome assignment:
 *   temp > 0.3, humid < -0.1  -> Desert
 *   temp > 0.3, humid >= -0.1 -> Prairie
 *   temp [-0.1, 0.3], humid > 0.2 -> Swamp
 *   temp [-0.1, 0.3], humid <= 0.2 -> Forest
 *   temp < -0.1, humid < 0   -> Mountain
 *   temp < -0.1, humid >= 0  -> Snow
 */
export function getBiome(parcelX: number, parcelY: number): BiomeType {
  const temperature = fractalNoise(tempNoise, parcelX * TEMP_SCALE, parcelY * TEMP_SCALE, 3)
  const humidity = fractalNoise(humidNoise, parcelX * HUMID_SCALE, parcelY * HUMID_SCALE, 3)

  if (temperature > 0.3) {
    return humidity < -0.1 ? 'desert' : 'prairie'
  }

  if (temperature > -0.1) {
    return humidity > 0.2 ? 'swamp' : 'forest'
  }

  return humidity < 0 ? 'mountain' : 'snow'
}

/**
 * Get the raw temperature and humidity values for a parcel.
 * Useful for biome transitions (7.7).
 */
export function getBiomeValues(parcelX: number, parcelY: number): { temperature: number; humidity: number } {
  return {
    temperature: fractalNoise(tempNoise, parcelX * TEMP_SCALE, parcelY * TEMP_SCALE, 3),
    humidity: fractalNoise(humidNoise, parcelX * HUMID_SCALE, parcelY * HUMID_SCALE, 3),
  }
}
