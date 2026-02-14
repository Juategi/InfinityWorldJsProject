import { Room, Client } from "colyseus";
import { WorldState, ParcelSchema, PlacedObjectSchema, PlayerSchema } from "./schema";
import { Repositories } from "../repositories/factory";
import { logger } from "../logger";
import { WORLD_CONFIG } from "../config/world";
import { chebyshevDistance, calculateParcelPrice, MAX_BUY_DISTANCE } from "../config/parcels";

/** Radius of parcels loaded around a player's camera */
const VIEW_RADIUS = 3;

/** Message types sent by the client */
interface RequestParcelsMsg {
  x: number;
  y: number;
}

interface PlaceBuildMsg {
  parcelId: string;
  objectId: string;
  localX: number;
  localY: number;
}

interface MoveBuildMsg {
  placedObjectId: string;
  localX: number;
  localY: number;
}

interface DeleteBuildMsg {
  placedObjectId: string;
}

interface BuyParcelMsg {
  x: number;
  y: number;
}

export class WorldRoom extends Room<WorldState> {
  private repos!: Repositories;
  /** Track which parcels each player has loaded */
  private playerLoadedParcels: Map<string, Set<string>> = new Map();
  /** Cached catalog: objectId (UUID) → object name */
  private catalogNames: Map<string, string> = new Map();

  onCreate(options: { repos: Repositories }) {
    this.repos = options.repos;
    this.setState(new WorldState());

    this.maxClients = 100;
    this.autoDispose = false;

    // Register message handlers
    this.onMessage("requestParcels", (client, msg: RequestParcelsMsg) => {
      this.handleRequestParcels(client, msg).catch(err =>
        logger.error({ err }, "requestParcels error")
      );
    });

    this.onMessage("placeBuild", (client, msg: PlaceBuildMsg) => {
      this.handlePlaceBuild(client, msg).catch(err =>
        logger.error({ err }, "placeBuild error")
      );
    });

    this.onMessage("moveBuild", (client, msg: MoveBuildMsg) => {
      this.handleMoveBuild(client, msg).catch(err =>
        logger.error({ err }, "moveBuild error")
      );
    });

    this.onMessage("deleteBuild", (client, msg: DeleteBuildMsg) => {
      this.handleDeleteBuild(client, msg).catch(err =>
        logger.error({ err }, "deleteBuild error")
      );
    });

    this.onMessage("buyParcel", (client, msg: BuyParcelMsg) => {
      this.handleBuyParcel(client, msg).catch(err =>
        logger.error({ err }, "buyParcel error")
      );
    });

    // Pre-load catalog names for object resolution
    this.loadCatalogNames().catch(err =>
      logger.error({ err }, "Failed to load catalog names")
    );

    logger.info("WorldRoom created");
  }

  /** Load all placeable object names into memory for quick lookup */
  private async loadCatalogNames(): Promise<void> {
    const allObjects = await this.repos.placeableObject.findAll();
    for (const obj of allObjects) {
      this.catalogNames.set(obj.id, obj.name);
    }
    logger.info({ count: this.catalogNames.size }, "Catalog names loaded");
  }

  async onJoin(client: Client, options: { playerId?: string }) {
    const playerId = options.playerId || client.sessionId;
    logger.info({ playerId, sessionId: client.sessionId }, "Player joining");

    // Load or create player from DB
    let player = await this.repos.player.findById(playerId);
    if (!player) {
      player = await this.repos.player.findByName(playerId);
    }
    if (!player) {
      // New player with initial coins
      player = await this.repos.player.create({ name: playerId, coins: 500 });
    }

    // Store playerId on userData for later reference
    (client as Client & { playerId: string }).playerId = player.id;

    // Add to state
    const ps = new PlayerSchema();
    ps.id = player.id;
    ps.name = player.name;
    ps.coins = player.coins;
    this.state.players.set(client.sessionId, ps);

    this.playerLoadedParcels.set(client.sessionId, new Set());

    // Send initial player data (inventory, parcels list)
    const [parcels, inventory] = await Promise.all([
      this.repos.parcel.findByOwnerId(player.id),
      this.repos.playerInventory.findByPlayerId(player.id),
    ]);

    client.send("initPlayer", {
      playerId: player.id,
      coins: player.coins,
      parcels: parcels.map(p => ({ id: p.id, ownerId: p.ownerId, x: p.x, y: p.y })),
      inventory: inventory.map(i => i.objectId),
    });
  }

  async onLeave(client: Client, consented: boolean) {
    const ps = this.state.players.get(client.sessionId);
    const playerId = ps?.id || client.sessionId;
    logger.info({ playerId, consented }, "Player leaving");

    // Allow reconnection for 60 seconds if not consented
    if (!consented) {
      try {
        await this.allowReconnection(client, 60);
        logger.info({ playerId }, "Player reconnected");
        return;
      } catch {
        // Reconnection timed out
      }
    }

    // Clean up loaded parcels tracking
    this.playerLoadedParcels.delete(client.sessionId);

    // Remove parcels that no other player needs
    this.cleanupUnusedParcels();

    // Remove from state
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    logger.info("WorldRoom disposing");
  }

  // --- Message Handlers ---

  private async handleRequestParcels(client: Client, msg: RequestParcelsMsg) {
    const { x, y } = msg;
    if (typeof x !== "number" || typeof y !== "number") return;

    const radius = VIEW_RADIUS;
    const loaded = this.playerLoadedParcels.get(client.sessionId);
    if (!loaded) return;

    // Fetch parcels from DB in the area
    const dbParcels = await this.repos.parcel.findInArea(x, y, radius);
    const dbParcelMap = new Map(dbParcels.map(p => [`${p.x},${p.y}`, p]));

    const newKeys = new Set<string>();

    for (let px = x - radius; px <= x + radius; px++) {
      for (let py = y - radius; py <= y + radius; py++) {
        const key = `${px},${py}`;
        newKeys.add(key);

        if (!this.state.parcels.has(key)) {
          const dbParcel = dbParcelMap.get(key);
          const parcelSchema = new ParcelSchema();
          parcelSchema.id = key;
          parcelSchema.x = px;
          parcelSchema.y = py;
          parcelSchema.ownerId = dbParcel?.ownerId || "";

          // Load placed objects if parcel has an owner
          if (dbParcel) {
            const objects = await this.repos.placedObject.findByParcelId(dbParcel.id);
            for (const obj of objects) {
              const os = new PlacedObjectSchema();
              os.id = obj.id;
              os.objectId = obj.objectId;
              os.objectName = this.catalogNames.get(obj.objectId) || "";
              os.localX = obj.localX;
              os.localY = obj.localY;
              parcelSchema.objects.set(obj.id, os);
            }
          }

          this.state.parcels.set(key, parcelSchema);
        }

        loaded.add(key);
      }
    }

    // Remove parcels this player no longer needs
    const toRemove: string[] = [];
    for (const key of loaded) {
      if (!newKeys.has(key)) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) {
      loaded.delete(key);
    }

    // Cleanup parcels not needed by anyone
    this.cleanupUnusedParcels();
  }

  private async handlePlaceBuild(client: Client, msg: PlaceBuildMsg) {
    const ps = this.state.players.get(client.sessionId);
    if (!ps) return;

    const { parcelId, objectId, localX, localY } = msg;

    // Validate parcel ownership
    const parcel = await this.repos.parcel.findById(parcelId);
    if (!parcel || parcel.ownerId !== ps.id) {
      client.send("actionError", { action: "placeBuild", error: "No eres dueño de esta parcela" });
      return;
    }

    // Validate object is unlocked
    const hasObject = await this.repos.playerInventory.hasObject(ps.id, objectId);
    if (!hasObject) {
      client.send("actionError", { action: "placeBuild", error: "Objeto no desbloqueado" });
      return;
    }

    // Validate local coordinates
    if (localX < 0 || localX >= WORLD_CONFIG.PARCEL_SIZE || localY < 0 || localY >= WORLD_CONFIG.PARCEL_SIZE) {
      client.send("actionError", { action: "placeBuild", error: "Posicion fuera de la parcela" });
      return;
    }

    // Create in DB
    const placed = await this.repos.placedObject.create({
      parcelId: parcel.id,
      objectId,
      localX,
      localY,
    });

    // Update schema
    const key = `${parcel.x},${parcel.y}`;
    const parcelSchema = this.state.parcels.get(key);
    if (parcelSchema) {
      const os = new PlacedObjectSchema();
      os.id = placed.id;
      os.objectId = placed.objectId;
      os.objectName = this.catalogNames.get(placed.objectId) || "";
      os.localX = placed.localX;
      os.localY = placed.localY;
      parcelSchema.objects.set(placed.id, os);
    }

    client.send("actionOk", { action: "placeBuild", placedObjectId: placed.id });
  }

  private async handleMoveBuild(client: Client, msg: MoveBuildMsg) {
    const ps = this.state.players.get(client.sessionId);
    if (!ps) return;

    const { placedObjectId, localX, localY } = msg;

    const placedObj = await this.repos.placedObject.findById(placedObjectId);
    if (!placedObj) {
      client.send("actionError", { action: "moveBuild", error: "Objeto no encontrado" });
      return;
    }

    // Validate ownership via parcel
    const parcel = await this.repos.parcel.findById(placedObj.parcelId);
    if (!parcel || parcel.ownerId !== ps.id) {
      client.send("actionError", { action: "moveBuild", error: "No eres dueño de esta parcela" });
      return;
    }

    if (localX < 0 || localX >= WORLD_CONFIG.PARCEL_SIZE || localY < 0 || localY >= WORLD_CONFIG.PARCEL_SIZE) {
      client.send("actionError", { action: "moveBuild", error: "Posicion fuera de la parcela" });
      return;
    }

    // Update in DB
    await this.repos.placedObject.update(placedObjectId, { localX, localY });

    // Update schema
    const key = `${parcel.x},${parcel.y}`;
    const parcelSchema = this.state.parcels.get(key);
    if (parcelSchema) {
      const os = parcelSchema.objects.get(placedObjectId);
      if (os) {
        os.localX = localX;
        os.localY = localY;
      }
    }

    client.send("actionOk", { action: "moveBuild" });
  }

  private async handleDeleteBuild(client: Client, msg: DeleteBuildMsg) {
    const ps = this.state.players.get(client.sessionId);
    if (!ps) return;

    const { placedObjectId } = msg;

    const placedObj = await this.repos.placedObject.findById(placedObjectId);
    if (!placedObj) {
      client.send("actionError", { action: "deleteBuild", error: "Objeto no encontrado" });
      return;
    }

    const parcel = await this.repos.parcel.findById(placedObj.parcelId);
    if (!parcel || parcel.ownerId !== ps.id) {
      client.send("actionError", { action: "deleteBuild", error: "No eres dueño de esta parcela" });
      return;
    }

    // Delete from DB
    await this.repos.placedObject.delete(placedObjectId);

    // Remove from schema
    const key = `${parcel.x},${parcel.y}`;
    const parcelSchema = this.state.parcels.get(key);
    if (parcelSchema) {
      parcelSchema.objects.delete(placedObjectId);
    }

    client.send("actionOk", { action: "deleteBuild" });
  }

  private async handleBuyParcel(client: Client, msg: BuyParcelMsg) {
    const ps = this.state.players.get(client.sessionId);
    if (!ps) return;

    const { x, y } = msg;
    if (typeof x !== "number" || typeof y !== "number") return;

    // Check parcel not already owned
    const existing = await this.repos.parcel.findAtPosition(x, y);
    if (existing && existing.ownerId) {
      client.send("actionError", { action: "buyParcel", error: "Esta parcela ya tiene dueño" });
      return;
    }

    // Check proximity constraint
    const playerParcels = await this.repos.parcel.findByOwnerId(ps.id);
    if (playerParcels.length === 0) {
      if (chebyshevDistance(x, y, 0, 0) > MAX_BUY_DISTANCE) {
        client.send("actionError", { action: "buyParcel", error: "Demasiado lejos del origen" });
        return;
      }
    } else {
      const inRange = playerParcels.some(p => chebyshevDistance(x, y, p.x, p.y) <= MAX_BUY_DISTANCE);
      if (!inRange) {
        client.send("actionError", { action: "buyParcel", error: "Demasiado lejos de tus parcelas" });
        return;
      }
    }

    // Check price and coins
    const price = calculateParcelPrice(x, y);
    const player = await this.repos.player.findById(ps.id);
    if (!player || player.coins < price) {
      client.send("actionError", { action: "buyParcel", error: "Monedas insuficientes" });
      return;
    }

    // Deduct coins
    const updated = await this.repos.player.addCoins(ps.id, -price);
    if (!updated) {
      client.send("actionError", { action: "buyParcel", error: "Error al procesar pago" });
      return;
    }

    // Create or update parcel
    let parcel;
    if (existing) {
      parcel = await this.repos.parcel.update(existing.id, { ownerId: ps.id });
    } else {
      parcel = await this.repos.parcel.create({ ownerId: ps.id, x, y });
    }

    // Update player coins in schema
    ps.coins = updated.coins;

    // Update parcel in schema
    const key = `${x},${y}`;
    let parcelSchema = this.state.parcels.get(key);
    if (parcelSchema) {
      parcelSchema.ownerId = ps.id;
    } else {
      parcelSchema = new ParcelSchema();
      parcelSchema.id = parcel?.id || key;
      parcelSchema.x = x;
      parcelSchema.y = y;
      parcelSchema.ownerId = ps.id;
      this.state.parcels.set(key, parcelSchema);
    }

    client.send("actionOk", {
      action: "buyParcel",
      parcel: { id: parcel?.id || key, ownerId: ps.id, x, y },
      coins: updated.coins,
    });
  }

  /** Remove parcels from state that no player has loaded */
  private cleanupUnusedParcels() {
    const allNeeded = new Set<string>();
    for (const loaded of this.playerLoadedParcels.values()) {
      for (const key of loaded) {
        allNeeded.add(key);
      }
    }

    const toDelete: string[] = [];
    this.state.parcels.forEach((_parcel, key) => {
      if (!allNeeded.has(key)) {
        toDelete.push(key);
      }
    });

    for (const key of toDelete) {
      this.state.parcels.delete(key);
    }
  }
}
