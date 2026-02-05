import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import express from "express";
import { config } from "dotenv";

config();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const server = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server }),
});

// TODO: Register rooms here
// gameServer.define("world", WorldRoom);

gameServer.listen(port).then(() => {
  console.log(`🎮 Colyseus server running on http://localhost:${port}`);
});
