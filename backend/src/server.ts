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
import { predict } from "./predict.js";

// App setup
const app = express();

// Simple health / root routes
app.get("/", (_req, res) => {
  res.send("Pasture-GURU backend is running");
});

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

app.use(express.json());

// CORS – this is enough; remove app.options("*", cors())
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://biomass-guru.onrender.com", // your frontend
    ],
  })
);

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

async function forwardToPython(imagePath: string) {
  const formData = new FormData();
  formData.append("image", fs.createReadStream(imagePath));

  // Python FastAPI service URL
  const pythonUrl =
    process.env.MODEL_SERVICE_URL || "http://localhost:8001/predict";

  console.log("[predict] Using MODEL_URL =", pythonUrl);

  const response = await axios.post(pythonUrl, formData, {
    headers: formData.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  return response.data; // { predictions: {...} }
}

// routers
app.use("/auth", auth);
app.use("/", history);
app.use("/", images);
app.use("/", predict);

// Prediction endpoints
app.post("/predict", upload.single("image"), async (req, res) => {
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
    console.error("Prediction error at /predict:", err);
    return res.status(500).json({ error: "Prediction failed" });
  }
});

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
