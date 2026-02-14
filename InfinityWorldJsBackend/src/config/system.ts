export const SYSTEM_PLAYER_ID = "00000000-0000-0000-0000-000000000000"
export const SYSTEM_PLAYER_NAME = "Infinity"

export const SYSTEM_PARCELS: { x: number; y: number }[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
]

export function isSystemParcel(x: number, y: number): boolean {
  return SYSTEM_PARCELS.some((p) => p.x === x && p.y === y)
}
