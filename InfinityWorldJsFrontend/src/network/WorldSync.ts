import type { Room } from 'colyseus.js'
import type { ParcelManager } from '../game/ParcelManager'
import type { Game } from '../game/Game'
import { WORLD_CONFIG } from '../config/world'

/**
 * Bridges the Colyseus room state with the Game's ParcelManager and BuildingManager.
 * When connected, parcel loading is driven by server state instead of local mock data.
 */
export class WorldSync {
  private room: Room
  private game: Game
  private parcelManager: ParcelManager
  private lastRequestX: number = NaN
  private lastRequestY: number = NaN
  private disposed = false

  constructor(room: Room, game: Game) {
    this.room = room
    this.game = game
    this.parcelManager = game.getParcelManager()

    this.setupListeners()

    // Request initial parcels around camera
    const coords = this.parcelManager.getCurrentParcelCoords()
    this.sendRequestParcels(coords.x, coords.y)
  }

  private setupListeners(): void {
    const state = this.room.state as {
      parcels: { onAdd: (cb: (parcel: any, key: string) => void) => void; onRemove: (cb: (parcel: any, key: string) => void) => void };
      players: { onAdd: (cb: (player: any, key: string) => void) => void; onRemove: (cb: (player: any, key: string) => void) => void };
    }

    // Listen for parcels added to room state
    state.parcels.onAdd((parcel: any, _key: string) => {
      if (this.disposed) return
      this.parcelManager.loadParcelFromServer({
        id: parcel.id,
        ownerId: parcel.ownerId,
        x: parcel.x,
        y: parcel.y,
      })

      // Listen for placed objects on this parcel (fires for existing + new objects)
      if (parcel.objects) {
        parcel.objects.onAdd((obj: any) => {
          if (this.disposed) return
          this.parcelManager.addBuildingToParcel(parcel.x, parcel.y, obj.id, obj.objectName, obj.localX, obj.localY)
        })

        parcel.objects.onRemove((obj: any) => {
          if (this.disposed) return
          this.parcelManager.removeBuildingFromParcel(parcel.x, parcel.y, obj.id)
        })
      }

      // Listen for ownership changes on this parcel
      parcel.onChange(() => {
        if (this.disposed) return
        this.parcelManager.loadParcelFromServer({
          id: parcel.id,
          ownerId: parcel.ownerId,
          x: parcel.x,
          y: parcel.y,
        })
      })
    })

    // Listen for parcels removed from room state
    state.parcels.onRemove((_parcel: any, key: string) => {
      if (this.disposed) return
      this.parcelManager.removeParcelByKey(key)
    })

    // Listen for players joining/leaving
    state.players.onAdd((player: any, _key: string) => {
      if (this.disposed) return
      document.dispatchEvent(new CustomEvent('playerJoined', {
        detail: { id: player.id, name: player.name, coins: player.coins }
      }))
    })

    state.players.onRemove((player: any, _key: string) => {
      if (this.disposed) return
      document.dispatchEvent(new CustomEvent('playerLeft', {
        detail: { id: player.id, name: player.name }
      }))
    })

    // Listen for server messages
    this.room.onMessage("initPlayer", (data: {
      playerId: string;
      coins: number;
      parcels: Array<{ id: string; ownerId: string; x: number; y: number }>;
      inventory: string[];
    }) => {
      if (this.disposed) return
      this.parcelManager.setLocalPlayerId(data.playerId)
      this.parcelManager.setPlayerParcels(
        data.parcels.map(p => ({ id: p.id, ownerId: p.ownerId, x: p.x, y: p.y }))
      )
      this.game.state.coins = data.coins
      document.dispatchEvent(new CustomEvent('resourceUpdate', { detail: this.game.state }))

      // Emit event so UI can update parcels list
      document.dispatchEvent(new CustomEvent('playerDataLoaded', { detail: data }))
    })

    this.room.onMessage("actionOk", (data: { action: string; [key: string]: unknown }) => {
      if (this.disposed) return
      if (data.action === 'buyParcel') {
        const parcelData = data.parcel as { id: string; ownerId: string; x: number; y: number }
        const coins = data.coins as number
        this.parcelManager.markParcelAsOwned(parcelData.x, parcelData.y, parcelData.ownerId)
        this.game.state.coins = coins
        document.dispatchEvent(new CustomEvent('resourceUpdate', { detail: this.game.state }))
        document.dispatchEvent(new CustomEvent('parcelBought', { detail: parcelData }))
      }

      if (data.action === 'placeBuild') {
        document.dispatchEvent(new CustomEvent('buildPlaced', { detail: data }))
      }
    })

    this.room.onMessage("actionError", (data: { action: string; error: string }) => {
      if (this.disposed) return
      document.dispatchEvent(new CustomEvent('serverActionError', { detail: data }))
    })
  }

  /** Called every frame from the game loop (in world mode) to request parcels as camera moves */
  updateCameraPosition(cameraX: number, cameraZ: number): void {
    if (this.disposed) return

    const px = Math.floor(cameraX / WORLD_CONFIG.PARCEL_SIZE)
    const py = Math.floor(cameraZ / WORLD_CONFIG.PARCEL_SIZE)

    if (px === this.lastRequestX && py === this.lastRequestY) return

    this.lastRequestX = px
    this.lastRequestY = py
    this.sendRequestParcels(px, py)
  }

  private sendRequestParcels(x: number, y: number): void {
    this.room.send("requestParcels", { x, y })
  }

  /** Send a buy parcel request to the server */
  buyParcel(x: number, y: number): void {
    this.room.send("buyParcel", { x, y })
  }

  /** Send a place build request to the server */
  placeBuild(parcelId: string, objectId: string, localX: number, localY: number): void {
    this.room.send("placeBuild", { parcelId, objectId, localX, localY })
  }

  /** Send a move build request to the server */
  moveBuild(placedObjectId: string, localX: number, localY: number): void {
    this.room.send("moveBuild", { placedObjectId, localX, localY })
  }

  /** Send a delete build request to the server */
  deleteBuild(placedObjectId: string): void {
    this.room.send("deleteBuild", { placedObjectId })
  }

  /** Get list of online players from room state */
  getOnlinePlayers(): Array<{ id: string; name: string; coins: number }> {
    const players: Array<{ id: string; name: string; coins: number }> = []
    const state = this.room.state as { players: { forEach: (cb: (p: any, k: string) => void) => void } }
    state.players.forEach((p: any) => {
      players.push({ id: p.id, name: p.name, coins: p.coins })
    })
    return players
  }

  dispose(): void {
    this.disposed = true
  }
}
