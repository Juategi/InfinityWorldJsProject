import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { Express } from "express";
import { createTestApp } from "./setup";

let app: Express;
let playerA: { id: string };

beforeAll(async () => {
  const ctx = await createTestApp();
  app = ctx.app;
  playerA = ctx.playerA;
});

describe("Validation — malformed inputs (400)", () => {
  describe("UUID params", () => {
    it("GET /players/not-a-uuid/balance → 400", async () => {
      const res = await request(app)
        .get("/players/not-a-uuid/balance")
        .set("X-Player-Id", playerA.id);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
    });

    it("GET /catalog/123 → 400 (invalid UUID)", async () => {
      const res = await request(app).get("/catalog/123");
      expect(res.status).toBe(400);
    });
  });

  describe("Query params", () => {
    it("GET /parcels?x=abc → 400 (non-numeric coordinate)", async () => {
      const res = await request(app).get("/parcels?x=abc&y=0&radius=2");
      expect(res.status).toBe(400);
    });

    it("GET /catalog?era=nonexistent → 400 (invalid era)", async () => {
      const res = await request(app).get("/catalog?era=nonexistent");
      expect(res.status).toBe(400);
    });

    it("GET /catalog?category=invalid → 400 (invalid category)", async () => {
      const res = await request(app).get("/catalog?category=invalid");
      expect(res.status).toBe(400);
    });
  });

  describe("Body params", () => {
    it("POST /shop/buy with missing objectId → 400", async () => {
      const res = await request(app)
        .post("/shop/buy")
        .set("X-Player-Id", playerA.id)
        .send({ playerId: playerA.id });
      expect(res.status).toBe(400);
    });

    it("POST /shop/buy with non-UUID objectId → 400", async () => {
      const res = await request(app)
        .post("/shop/buy")
        .set("X-Player-Id", playerA.id)
        .send({ playerId: playerA.id, objectId: "not-a-uuid" });
      expect(res.status).toBe(400);
    });

    it("POST /parcels/buy with string coordinates → 400", async () => {
      const res = await request(app)
        .post("/parcels/buy")
        .set("X-Player-Id", playerA.id)
        .send({ playerId: playerA.id, x: "abc", y: "def" });
      expect(res.status).toBe(400);
    });

    it("POST /parcels/buy with Infinity → 400", async () => {
      const res = await request(app)
        .post("/parcels/buy")
        .set("X-Player-Id", playerA.id)
        .send({ playerId: playerA.id, x: Infinity, y: 0 });
      expect(res.status).toBe(400);
    });

    it("POST /parcels/buy with overflow coordinates → 400", async () => {
      const res = await request(app)
        .post("/parcels/buy")
        .set("X-Player-Id", playerA.id)
        .send({ playerId: playerA.id, x: 9999999, y: 0 });
      expect(res.status).toBe(400);
    });
  });

  describe("SQL injection attempts", () => {
    it("GET /catalog with SQL in era param → 400", async () => {
      const res = await request(app).get("/catalog?era=medieval'; DROP TABLE players;--");
      expect(res.status).toBe(400);
    });

    it("GET /players with SQL in UUID param → 400", async () => {
      const res = await request(app)
        .get("/players/'; DROP TABLE players;--/balance")
        .set("X-Player-Id", playerA.id);
      expect(res.status).toBe(400);
    });
  });
});
