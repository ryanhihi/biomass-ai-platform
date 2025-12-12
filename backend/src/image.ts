import { Router } from "express";
import mongoose from "mongoose";
import { getGridFS } from "./db.js";

export const images = Router();

/**
 * GET /images/:id
 * Streams a stored image from GridFS
 */
images.get("/images/:id", async (req, res) => {
  try {
    const id = new mongoose.Types.ObjectId(req.params.id);
    const bucket = getGridFS();

    // Read metadata to set content-type
    const files = await bucket.find({ _id: id } as any).toArray();
    const file = files[0] as any;

    if (!file) {
      return res.status(404).json({ ok: false, error: "Image not found" });
    }

    const contentType =
      file?.metadata?.contentType ||
      file?.contentType ||
      "application/octet-stream";

    res.setHeader("Content-Type", contentType);

    const stream = bucket.openDownloadStream(id);
    stream.on("error", () => res.status(404).end());
    stream.pipe(res);
  } catch {
    return res.status(400).json({ ok: false, error: "Invalid image id" });
  }
});
