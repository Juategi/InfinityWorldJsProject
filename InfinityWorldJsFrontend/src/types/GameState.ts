export interface GameState {
  gold: number
  gems: number
  buildings: BuildingState[]
}

export interface BuildingState {
  id: string
  typeId: string
  gridX: number
  gridZ: number
  level: number
}
