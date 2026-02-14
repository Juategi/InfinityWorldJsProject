import { Client, Room } from 'colyseus.js'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

type ConnectionListener = (state: ConnectionState) => void

const BACKEND_URL = import.meta.env.VITE_BACKEND_WS_URL || 'ws://localhost:3000'

type RoomChangeListener = (room: Room) => void

class NetworkClient {
  private client: Client
  private room: Room | null = null
  private listeners: Set<ConnectionListener> = new Set()
  private roomChangeListeners: Set<RoomChangeListener> = new Set()
  private _state: ConnectionState = 'disconnected'
  private reconnectToken: string | null = null

  constructor() {
    this.client = new Client(BACKEND_URL)
  }

  get state(): ConnectionState {
    return this._state
  }

  get worldRoom(): Room | null {
    return this.room
  }

  onStateChange(listener: ConnectionListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Listen for room changes (e.g. after reconnection with a new Room instance) */
  onRoomChange(listener: RoomChangeListener): () => void {
    this.roomChangeListeners.add(listener)
    return () => this.roomChangeListeners.delete(listener)
  }

  private setState(state: ConnectionState): void {
    this._state = state
    this.listeners.forEach(l => l(state))
  }

  private setupRoomListeners(room: Room): void {
    room.onLeave(async (code: number) => {
      // code 1000 = normal close, 4000+ = server kicked
      if (code >= 1000 && code < 4000 && this.reconnectToken) {
        await this.tryReconnect()
      } else {
        this.room = null
        this.reconnectToken = null
        this.setState('disconnected')
      }
    })

    room.onError((code: number, message?: string) => {
      console.error(`Room error [${code}]:`, message)
      this.setState('error')
    })
  }

  async joinWorld(playerId: string): Promise<Room> {
    this.setState('connecting')

    try {
      const room = await this.client.joinOrCreate('world', { playerId })
      this.room = room
      this.reconnectToken = room.reconnectionToken
      this.setState('connected')
      this.setupRoomListeners(room)
      return room
    } catch (err) {
      console.error('Failed to join world room:', err)
      this.setState('error')
      throw err
    }
  }

  private async tryReconnect(): Promise<void> {
    const token = this.reconnectToken
    if (!token) return

    this.setState('reconnecting')

    const maxAttempts = 5
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Wait before retry with exponential backoff
        await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempt - 1), 8000)))

        const reconnected: Room = await this.client.reconnect(token)
        this.room = reconnected
        this.reconnectToken = reconnected.reconnectionToken
        this.setState('connected')
        this.setupRoomListeners(reconnected)
        this.roomChangeListeners.forEach(l => l(reconnected))
        return
      } catch {
        console.warn(`Reconnect attempt ${attempt}/${maxAttempts} failed`)
      }
    }

    // All attempts failed
    this.room = null
    this.reconnectToken = null
    this.setState('disconnected')
  }

  async leave(): Promise<void> {
    this.reconnectToken = null
    if (this.room) {
      await this.room.leave()
      this.room = null
    }
    this.setState('disconnected')
  }
}

// Singleton
export const networkClient = new NetworkClient()
