import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, AuthedRequest } from "./requireAuth.js";

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
  mongoose.models.Prediction || mongoose.model("Prediction", PredictionSchema);

export const history = Router();

/**
 * GET /history?limit=20&skip=0
 * Returns latest predictions for the authenticated user
 */
history.get("/history", requireAuth, async (req: AuthedRequest, res) => {
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const skip = Number(req.query.skip ?? 0);

  const docs = await Prediction.find({ userId: req.userId })
    .sort({ ts: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return res.json({ ok: true, items: docs });
});
