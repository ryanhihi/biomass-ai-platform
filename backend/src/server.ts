import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";

import { connectMongo } from "./db.js";
import { auth } from "./auth.js";
import { history } from "./history.js";
import { images } from "./image.js";
import { predict as predictRouter } from "./predict.js";

// App setup
const app = express();

// CORS: allow frontend + localhost
const allowedOrigins = [
  "http://localhost:5173",
  "https://biomass-guru.onrender.com",
];

app.use(
  cors({
    origin: (origin, cb) => {
      // allow non-browser requests (no origin) and allowed origins
      if (!origin || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
  })
);

// Body parser AFTER CORS
app.use(express.json());

// Simple health routes
app.get("/", (_req, res) => {
  res.send("Pasture-GURU backend is running");
});

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

// store uploads under /backend/uploads
const uploadDir = path.join(process.cwd(), "uploads");

// make sure the folder exists (important on Render)
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Model service URL (FastAPI)
const MODEL_URL =
  process.env.MODEL_SERVICE_URL || "http://localhost:8001/predict";

console.log("[predict] Using MODEL_URL =", MODEL_URL);

async function forwardToPython(imagePath: string) {
  const formData = new FormData();
  formData.append("image", fs.createReadStream(imagePath));

  const response = await axios.post(MODEL_URL, formData, {
    headers: formData.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  // response.data is { predictions: { Dry_Green_g: ..., ... } }
  return response.data;
}

// Routers
app.use("/auth", auth);
app.use("/", history);
app.use("/", images);
app.use("/", predictRouter);   // <<< use predictRouter, not predict

// Prediction endpoints (if you still want direct proxy)
app.post("/predict", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const imagePath = req.file.path;
    const pyData = await forwardToPython(imagePath);

    return res.json({
      imagePath,
      ...pyData, // { predictions: {...} }
    });
  } catch (err) {
    console.error("Prediction error at /predict:", err);
    return res.status(500).json({ error: "Prediction failed" });
  }
});

// You can remove this if the frontend never uses /api/predict
app.post("/api/predict", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const imagePath = req.file.path;
    const pyData = await forwardToPython(imagePath);

    return res.json({
      imagePath,
      ...pyData,
    });
  } catch (err) {
    console.error("Prediction error at /api/predict:", err);
    return res.status(500).json({ error: "Prediction failed" });
  }
});

// Boot
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
