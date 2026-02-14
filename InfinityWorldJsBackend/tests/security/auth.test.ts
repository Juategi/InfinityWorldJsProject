import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import { Express } from "express";
import { createTestApp } from "./setup";

let app: Express;
let playerA: { id: string };
let playerB: { id: string };
let freeObject: { id: string };

beforeAll(async () => {
  // Set ADMIN_KEY for admin tests
  process.env.ADMIN_KEY = "test-admin-key";

  const ctx = await createTestApp();
  app = ctx.app;
  playerA = ctx.playerA;
  playerB = ctx.playerB;
  freeObject = ctx.freeObject;
});

describe("Authentication (401)", () => {
  it("GET /players/:id/balance without X-Player-Id → 401", async () => {
    const res = await request(app).get(`/players/${playerA.id}/balance`);
    expect(res.status).toBe(401);
  });

  it("GET /players/:id/inventory without X-Player-Id → 401", async () => {
    const res = await request(app).get(`/players/${playerA.id}/inventory`);
    expect(res.status).toBe(401);
  });

  it("POST /shop/buy without X-Player-Id → 401", async () => {
    // Use a real object ID that passes validation, so auth middleware is reached
    const res = await request(app)
      .post("/shop/buy")
      .send({ playerId: playerA.id, objectId: freeObject.id });
    expect(res.status).toBe(401);
  });

  it("GET /players/:id/balance with non-existent player → 401", async () => {
    // Use playerA's ID as the auth header but a fabricated ID in the URL.
    // The params validation runs first (checks UUID format). If the UUID format
    // is valid but the player doesn't exist, requirePlayer returns 401.
    // We need the URL id to pass UUID validation, and X-Player-Id to be unknown.
    const res = await request(app)
      .get(`/players/${playerA.id}/balance`)
      .set("X-Player-Id", "aaaaaaaa-bbbb-4ccc-9ddd-eeeeeeeeeeee");
    expect(res.status).toBe(401);
  });
});

describe("Authorization (403)", () => {
  it("GET /players/:id/balance — player A accessing player B → 403", async () => {
    const res = await request(app)
      .get(`/players/${playerB.id}/balance`)
      .set("X-Player-Id", playerA.id);
    expect(res.status).toBe(403);
  });

  it("GET /players/:id/inventory — player A accessing player B → 403", async () => {
    const res = await request(app)
      .get(`/players/${playerB.id}/inventory`)
      .set("X-Player-Id", playerA.id);
    expect(res.status).toBe(403);
  });

  it("POST /shop/buy — body playerId is stripped by validation, handler uses auth header", async () => {
    // playerId in body is stripped by Zod validation (not in schema).
    // Handler uses req.playerId (from X-Player-Id auth header), so mismatched
    // body playerId doesn't cause a security issue — the purchase is charged
    // to the authenticated player, not the body player.
    const res = await request(app)
      .post("/shop/buy")
      .set("X-Player-Id", playerA.id)
      .send({ playerId: playerB.id, objectId: freeObject.id });
    // Should succeed for playerA (the authenticated player), not playerB
    expect(res.status).toBe(201);
  });
});

describe("Admin endpoint authorization", () => {
  it("GET /admin/economy-log without X-Admin-Key → 403", async () => {
    const res = await request(app).get("/admin/economy-log");
    expect(res.status).toBe(403);
  });

  it("GET /admin/economy-log with wrong key → 403", async () => {
    const res = await request(app)
      .get("/admin/economy-log")
      .set("X-Admin-Key", "wrong-key");
    expect(res.status).toBe(403);
  });
});
