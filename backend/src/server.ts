// src/server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";

import { connectMongo } from "./db.js";
import { auth } from "./auth.js";
import { history } from "./history.js";
import { images } from "./image.js";
import { predict as predictRouter } from "./predict.js";

const app = express();

// CORS: allow frontend + localhost
const allowedOrigins = [
  "http://localhost:5173",
  "https://biomass-guru.onrender.com",
];

app.use(
  cors({
    origin(origin, callback) {
      // allow non-browser clients (no origin) and allowed origins
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
  })
);

// parse JSON after CORS
app.use(express.json());

// Health routes
app.get("/", (_req, res) => {
  res.send("Pasture-GURU backend is running");
});

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

// Routers
app.use("/auth", auth);
app.use("/", history);
app.use("/", images);
app.use("/", predictRouter);

const PORT = Number(process.env.PORT || 8000);

async function boot() {
  console.log("MONGO_URI set?", !!process.env.MONGO_URI);

  await connectMongo(process.env.MONGO_URI!);

  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
}

boot().catch((err) => {
  console.error("Boot failed:", err);
  process.exit(1);
});
