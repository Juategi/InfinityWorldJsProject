import { Schema, type, MapSchema } from "@colyseus/schema";

/** A placed object inside a parcel (synchronized to clients) */
export class PlacedObjectSchema extends Schema {
  @type("string") id: string = "";
  @type("string") objectId: string = "";
  @type("int32") localX: number = 0;
  @type("int32") localY: number = 0;
}

/** A parcel in the visible area (synchronized to clients) */
export class ParcelSchema extends Schema {
  @type("string") id: string = "";
  @type("string") ownerId: string = "";
  @type("int32") x: number = 0;
  @type("int32") y: number = 0;
  @type({ map: PlacedObjectSchema }) objects = new MapSchema<PlacedObjectSchema>();
}

/** A connected player (synchronized to clients) */
export class PlayerSchema extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("int32") coins: number = 0;
  @type("float32") cameraX: number = 0;
  @type("float32") cameraZ: number = 0;
}

/** Root state for the WorldRoom */
export class WorldState extends Schema {
  @type({ map: ParcelSchema }) parcels = new MapSchema<ParcelSchema>();
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
}
