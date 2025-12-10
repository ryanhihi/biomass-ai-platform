// import { Router } from "express";
// import multer from "multer";
// import * as tf from "@tensorflow/tfjs";
// import mongoose from "mongoose";
// import jwt from "jsonwebtoken";
// import { getGridFS } from "./db.js";

// const upload = multer({ storage: multer.memoryStorage() });

// let model: tf.LayersModel;

// export async function loadModel(modelPath: string) {
//   model = await tf.loadLayersModel("file://" + modelPath);
// }

// const Prediction = mongoose.model("Prediction", new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, required: false },
//   ts: { type: Date, default: Date.now },
//   meta: {
//     ndvi: Number, height: Number, state_id: Number, species_id: Number
//   },
//   outputs: Object,
//   imageFileId: mongoose.Schema.Types.ObjectId
// }));

// function efPreprocess(img224: tf.Tensor3D) {
//   return tf.tidy(() => img224.toFloat().div(127.5).sub(1));
// }

// async function to224RGB(buf: Buffer) {
//   const img = tf.node.decodeImage(buf, 3) as tf.Tensor3D;
//   const resized = tf.image.resizeBilinear(img, [224, 224]);
//   const pre = efPreprocess(resized);
//   return pre.expandDims(0);
// }

// export const predict = Router();

// predict.post("/predict", upload.single("file"), async (req, res) => {
//   try {
//     const { ndvi, height, state_id, species_id } = req.body;

//     if (!req.file) {
//       return res.status(400).json({ ok: false, error: "image missing" });
//     }

//     // ---- tensors ----
//     const xImg = await to224RGB(req.file.buffer);
//     const xNdvi = tf.tensor2d([[Number(ndvi)]]);
//     const xHeight = tf.tensor2d([[Number(height)]]);
//     const xState = tf.tensor1d([Number(state_id)], "int32");
//     const xSpecies = tf.tensor1d([Number(species_id)], "int32");

//     const pred = model.predict([xImg, xNdvi, xHeight, xState, xSpecies]) as tf.Tensor;
//     const y = Array.from(await pred.data()) as number[];

//     // safety check for TS + runtime
//     if (y.length < 5) {
//       throw new Error(`Model output too short: expected 5, got ${y.length}`);
//     }

//     // cleanup
//     xImg.dispose(); xNdvi.dispose(); xHeight.dispose(); xState.dispose(); xSpecies.dispose(); pred.dispose();

//     // ---- outputs (force numbers) ----
//     const outputs: Record<string, number> = {
//       "Dry Clover (g)": y[0] ?? 0,
//       "Dry Dead (g)":   y[1] ?? 0,
//       "Dry Green (g)":  y[2] ?? 0,
//       "Dry Total (g)":  y[3] ?? 0,
//       "Wet Total (g)":  y[4] ?? 0,
//     };

//     // now TS knows these are numbers
//     const dryTotal = outputs["Dry Total (g)"] ?? 0;
//     const dryDead  = outputs["Dry Dead (g)"] ?? 0;
//     const recommend = dryTotal >= 40 && dryDead <= 15;


//     // ---- store image ----
//     const bucket = getGridFS();
//     const uploadStream = bucket.openUploadStream(req.file.originalname, {
//       metadata: { contentType: req.file.mimetype }
//     });
//     uploadStream.end(req.file.buffer);
//     const imageFileId = uploadStream.id as mongoose.Types.ObjectId;

//     // ---- optional userId from JWT ----
//     let userId: mongoose.Types.ObjectId | undefined;
//     const authHeader = req.headers.authorization;

//     if (authHeader?.startsWith("Bearer ")) {
//       const authToken = authHeader.split(" ")[1];
//       if (authToken) {
//         const decoded: any = jwt.verify(authToken, process.env.JWT_SECRET!);
//         userId = new mongoose.Types.ObjectId(decoded.uid);
//       }
//     }

//     // ---- do NOT include userId if undefined ----
//     const createPayload: any = {
//       meta: {
//         ndvi: Number(ndvi),
//         height: Number(height),
//         state_id: Number(state_id),
//         species_id: Number(species_id)
//       },
//       outputs: {
//         Dry_Clover_g: outputs["Dry Clover (g)"],
//         Dry_Dead_g:   outputs["Dry Dead (g)"],
//         Dry_Green_g:  outputs["Dry Green (g)"],
//         Dry_Total_g:  outputs["Dry Total (g)"],
//         GDM_g:        outputs["Wet Total (g)"],
//         recommend
//       },
//       imageFileId
//     };

//     if (userId) createPayload.userId = userId;

//     await Prediction.create(createPayload);

//     return res.json({ ok: true, outputs, recommend });

//   } catch (e: any) {
//     console.error(e);
//     return res.status(500).json({ ok: false, error: e.message });
//   }
// });
