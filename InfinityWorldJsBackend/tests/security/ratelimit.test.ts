import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { Express } from "express";
import { createTestApp } from "./setup";

let app: Express;

beforeAll(async () => {
  const ctx = await createTestApp();
  app = ctx.app;
});

describe("Rate limiting (429)", () => {
  it("global limiter: burst of requests eventually returns 429", async () => {
    // Global limit is 100/min. Send 105 requests rapidly.
    const promises = [];
    for (let i = 0; i < 105; i++) {
      promises.push(request(app).get("/catalog"));
    }

    const responses = await Promise.all(promises);
    const statuses = responses.map((r) => r.status);

    // At least some should be 429
    const tooMany = statuses.filter((s) => s === 429);
    expect(tooMany.length).toBeGreaterThan(0);
  });
});
