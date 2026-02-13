export interface GameState {
  coins: number
  buildings: BuildingState[]
}

export interface BuildingState {
  id: string
  typeId: string
  gridX: number
  gridZ: number
  level: number
  rotation: number
}
