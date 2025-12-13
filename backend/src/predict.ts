import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import mongoose from "mongoose";
import { fileURLToPath } from "url";

import { requireAuth } from "./requireAuth.js";
import type { AuthedRequest } from "./requireAuth.js";
import { getGridFS } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads dir exists
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// model URL (Python FastAPI service)
const MODEL_URL = process.env.MODEL_URL || "http://localhost:8001/predict";
console.log("[predict] Using MODEL_URL =", MODEL_URL);

//Multer disk storage (field name: "image"
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Prediction schema (same as history.ts)
const PredictionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: false },
    ts: { type: Date, default: Date.now },
    outputs: Object,
    recommend: Boolean,
    imageFileId: mongoose.Schema.Types.ObjectId,
    originalName: String,
    mimeType: String,
  },
  { collection: "predictions" }
);

const Prediction =
  mongoose.models.Prediction ||
  mongoose.model("Prediction", PredictionSchema);

export const predict = Router();

/**
 * POST /predict
 * Form-data: image=<file>
 * Auth: Bearer token
 */
predict.post(
  "/predict",
  requireAuth,
  upload.single("image"),
  async (req: AuthedRequest, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ ok: false, error: "No image file provided" });
    }

    const imgPath = req.file.path;

    try {
      const bucket = getGridFS();

      // 1) Save image into GridFS
      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        metadata: {
          contentType: req.file.mimetype,
          userId: req.userId?.toString(),
        },
      });

      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(imgPath)
          .on("error", reject)
          .pipe(uploadStream)
          .on("error", reject)
          .on("finish", () => resolve());
      });

      const imageFileId = uploadStream.id as mongoose.Types.ObjectId;

      // 2) Call Python model service with the same image
      const form = new FormData();
      form.append("image", fs.createReadStream(imgPath), {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      const modelUrl =
        process.env.MODEL_URL || "http://model:8001/predict";

      const modelResp = await axios.post(modelUrl, form, {
        headers: form.getHeaders(),
        timeout: 30000,
      });

      const raw = modelResp.data;
      const rawPreds: any = raw.predictions || raw.outputs || {};

      // 3) Map predictions -> readable labels
      const outputs: Record<string, number> = {
        "Dry Clover (g)":
          rawPreds.Dry_Clover_g ??
          rawPreds["Dry Clover (g)"] ??
          0,
        "Dry Dead (g)":
          rawPreds.Dry_Dead_g ??
          rawPreds["Dry Dead (g)"] ??
          0,
        "Dry Green (g)":
          rawPreds.Dry_Green_g ??
          rawPreds["Dry Green (g)"] ??
          0,
        "Dry Total (g)":
          rawPreds.Dry_Total_g ??
          rawPreds["Dry Total (g)"] ??
          0,
        "Wet Total (g)":
          rawPreds.GDM_g ??
          rawPreds["Wet Total (g)"] ??
          rawPreds["GDM_g"] ??
          0,
      };

      const dryTotal = outputs["Dry Total (g)"] ?? 0;
      const recommend = dryTotal < 100;

      // 5) Save prediction document
      await Prediction.create({
        userId: req.userId ?? null,
        ts: new Date(),
        outputs,
        recommend,
        imageFileId,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      });

      // 6) Response to frontend
      return res.json({
        ok: true,
        outputs,
        recommend,
        imageFileId,
        originalName: req.file.originalname,
      });
    } catch (err) {
      console.error("Predict route error:", err);
      return res.status(500).json({ ok: false, error: "Prediction failed" });
    } finally {
      // Clean up temp file
      if (req.file?.path) {
        fs.unlink(req.file.path, () => {});
      }
    }
  }
);