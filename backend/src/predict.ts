import { Router } from "express";
import multer from "multer";
import * as tf from "@tensorflow/tfjs-node";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { getGridFS } from "./db.js";

const upload = multer({ storage: multer.memoryStorage() });

export const TARGETS = [
  "Dry Clover (g)",
  "Dry Dead (g)",
  "Dry Green (g)",
  "Dry Total (g)",
  "Wet Total (g)",
] as const;

type Target = typeof TARGETS[number];

let model: tf.LayersModel;

export async function loadModel(modelPath: string) {
  if (!modelPath) throw new Error("MODEL_PATH missing");
  model = await tf.loadLayersModel("file://" + modelPath);
  console.log("Model loaded sucessfully:", modelPath);
}

const Prediction = mongoose.model(
  "Prediction",
  new mongoose.Schema(
    {
      userId: { type: mongoose.Schema.Types.ObjectId, required: false },
      ts: { type: Date, default: Date.now },
      outputs: { type: Object, required: true },
      recommend: { type: Boolean, default: false },
      imageFileId: { type: mongoose.Schema.Types.ObjectId, required: true },
      originalName: String,
      mimeType: String,
    },
    { collection: "predictions" }
  )
);

/**
 * If Keras model already contains preprocessing inside the graph,
 * set PREPROCESS_MODE=none
 *
 * If model expects EfficientNet preprocessed input,
 * set PREPROCESS_MODE=efficientnet
 */
function preprocessIfNeeded(img: tf.Tensor3D) {
  const mode = (process.env.PREPROCESS_MODE || "efficientnet").toLowerCase();
  if (mode === "none") return img.toFloat();

  // EfficientNet preprocess, scale to [-1, 1]
  return img.toFloat().div(127.5).sub(1);
}

function getModelSize() {
  const shape = model.inputs?.[0]?.shape;
  // expected [null, H, W, C]
  const h = (shape?.[1] as number) || 224;
  const w = (shape?.[2] as number) || 224;
  const c = (shape?.[3] as number) || 3;
  return { h, w, c };
}

async function bufferToInputTensor(buf: Buffer) {
  const { h, w } = getModelSize();

  const decoded = tf.node.decodeImage(buf, 3) as tf.Tensor3D; // force RGB
  const resized = tf.image.resizeBilinear(decoded, [h, w]);
  const pre = preprocessIfNeeded(resized);
  const batched = pre.expandDims(0); // (1,H,W,3)

  decoded.dispose();
  resized.dispose();

  return batched;
}

function buildOutputs(y: number[]): Record<Target, number> {
  const entries = TARGETS.map((label, i) => [label, y[i] ?? 0] as const);
  return Object.fromEntries(entries) as Record<Target, number>;
}

/**
 * can adjust thresholds later in UI/admin settings.
 */
function deriveRecommend(outputs: Record<Target, number>) {
  const dryTotal = outputs["Dry Total (g)"] ?? 0;
  const dryDead  = outputs["Dry Dead (g)"] ?? 0;

  // Example rule (tune for use case)
  return dryTotal >= 40 && dryDead <= 15;
}

export const predict = Router();

predict.post("/predict", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "image missing" });
    }

    // 1) tensor
    const xImg = await bufferToInputTensor(req.file.buffer);

    // 2) predict
    const pred = model.predict(xImg) as tf.Tensor;
    const y = Array.from(await pred.data()) as number[];

    xImg.dispose();
    pred.dispose();

    if (y.length < 5) {
      throw new Error(`Model output too short: expected 5, got ${y.length}`);
    }

    const outputs = buildOutputs(y);
    const recommend = deriveRecommend(outputs);

    // 3) store image in GridFS
    const bucket = getGridFS();
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      metadata: { contentType: req.file.mimetype },
    });
    uploadStream.end(req.file.buffer);
    const imageFileId = uploadStream.id as mongoose.Types.ObjectId;

    // 4) userId from JWT
    let userId: mongoose.Types.ObjectId | undefined;
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token) {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        userId = new mongoose.Types.ObjectId(decoded.uid);
      }
    }

    // 5) save prediction doc
    const payload: any = {
      outputs,
      recommend,
      imageFileId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
    };
    if (userId) payload.userId = userId;

    await Prediction.create(payload);

    return res.json({ ok: true, outputs, recommend, imageFileId });

  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});
