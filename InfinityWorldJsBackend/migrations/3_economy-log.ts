import { MigrationBuilder, ColumnDefinitions } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Economy action enum type
  pgm.sql(`
    CREATE TYPE economy_action AS ENUM (
      'buy_parcel',
      'buy_object',
      'earn_coins',
      'spend_coins'
    );
  `);

  pgm.createTable("economy_log", {
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
    action: {
      type: "economy_action",
      notNull: true,
    },
    amount: {
      type: "integer",
      notNull: true,
    },
    balance_before: {
      type: "integer",
      notNull: true,
    },
    balance_after: {
      type: "integer",
      notNull: true,
    },
    metadata: {
      type: "jsonb",
      default: "'{}'",
    },
    ip_address: {
      type: "inet",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // Index for querying by player
  pgm.createIndex("economy_log", "player_id");

  // Index for time-based queries and retention cleanup
  pgm.createIndex("economy_log", "created_at");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("economy_log");
  pgm.sql("DROP TYPE IF EXISTS economy_action;");
}
