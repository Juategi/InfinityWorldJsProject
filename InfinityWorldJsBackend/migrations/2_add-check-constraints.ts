import { MigrationBuilder, ColumnDefinitions } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Ensure player coins can never go negative at DB level
  pgm.addConstraint("players", "players_coins_non_negative", {
    check: "coins >= 0",
  });

  // Ensure catalog item prices are non-negative
  pgm.addConstraint("placeable_objects", "placeable_objects_price_non_negative", {
    check: "price >= 0",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint("players", "players_coins_non_negative");
  pgm.dropConstraint("placeable_objects", "placeable_objects_price_non_negative");
}
