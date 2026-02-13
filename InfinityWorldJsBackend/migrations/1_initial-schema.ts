import { MigrationBuilder, ColumnDefinitions } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Enable PostGIS extension
  pgm.sql("CREATE EXTENSION IF NOT EXISTS postgis;");

  // Enable uuid-ossp for UUID generation
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

  // --- Players ---
  pgm.createTable("players", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    name: { type: "varchar(100)", notNull: true, unique: true },
    coins: { type: "integer", notNull: true, default: 0 },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // --- Parcels ---
  pgm.createTable("parcels", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    owner_id: {
      type: "uuid",
      references: "players",
      onDelete: "SET NULL",
    },
    x: { type: "integer", notNull: true },
    y: { type: "integer", notNull: true },
    geom: { type: "geometry(Point, 4326)" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // Unique constraint: only one parcel per (x, y)
  pgm.addConstraint("parcels", "parcels_x_y_unique", { unique: ["x", "y"] });

  // Index on owner_id for fast lookup of player's parcels
  pgm.createIndex("parcels", "owner_id");

  // Spatial index (GiST) on the geometry column
  pgm.createIndex("parcels", "geom", { method: "gist" });

  // Trigger: auto-populate geom from x, y on insert/update
  pgm.sql(`
    CREATE OR REPLACE FUNCTION parcels_set_geom()
    RETURNS trigger AS $$
    BEGIN
      NEW.geom := ST_SetSRID(ST_MakePoint(NEW.x, NEW.y), 4326);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE TRIGGER trg_parcels_set_geom
    BEFORE INSERT OR UPDATE OF x, y ON parcels
    FOR EACH ROW
    EXECUTE FUNCTION parcels_set_geom();
  `);

  // --- Placeable Objects (catalog) ---
  pgm.createTable("placeable_objects", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    name: { type: "varchar(100)", notNull: true, unique: true },
    size_x: { type: "integer", notNull: true },
    size_y: { type: "integer", notNull: true },
    category: { type: "varchar(50)" },
    era: { type: "varchar(50)" },
    price: { type: "integer", notNull: true, default: 0 },
    is_free: { type: "boolean", notNull: true, default: true },
    description: { type: "text" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // --- Placed Objects (instances in parcels) ---
  pgm.createTable("placed_objects", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    parcel_id: {
      type: "uuid",
      notNull: true,
      references: "parcels",
      onDelete: "CASCADE",
    },
    object_id: {
      type: "uuid",
      notNull: true,
      references: "placeable_objects",
      onDelete: "CASCADE",
    },
    local_x: { type: "integer", notNull: true },
    local_y: { type: "integer", notNull: true },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // Index for loading all objects of a parcel
  pgm.createIndex("placed_objects", "parcel_id");

  // --- Player Inventory (unlocked objects) ---
  pgm.createTable("player_inventory", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    player_id: {
      type: "uuid",
      notNull: true,
      references: "players",
      onDelete: "CASCADE",
    },
    object_id: {
      type: "uuid",
      notNull: true,
      references: "placeable_objects",
      onDelete: "CASCADE",
    },
    unlocked_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // A player can only unlock an object once
  pgm.addConstraint("player_inventory", "player_inventory_unique", {
    unique: ["player_id", "object_id"],
  });

  pgm.createIndex("player_inventory", "player_id");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("player_inventory");
  pgm.dropTable("placed_objects");
  pgm.dropTable("placeable_objects");
  pgm.dropTable("parcels");
  pgm.dropTable("players");

  pgm.sql("DROP FUNCTION IF EXISTS parcels_set_geom();");
  pgm.sql('DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;');
  pgm.sql("DROP EXTENSION IF EXISTS postgis CASCADE;");
}
