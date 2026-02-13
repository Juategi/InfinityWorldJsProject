import { config } from "dotenv";
config();

import { checkConnection, closePool } from "../db";
import { createRepositories } from "../repositories/factory";
import { runAllSeeds } from "./index";

async function main() {
  const dbOk = await checkConnection();
  if (!dbOk) {
    console.error("❌ Cannot connect to PostgreSQL. Is the database running?");
    process.exit(1);
  }

  console.log("🌱 Running seeds...\n");

  const repos = createRepositories(true);
  await runAllSeeds(repos);

  console.log("\n✅ All seeds completed");
  await closePool();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
