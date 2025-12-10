import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectMongo } from "./db.js";
import { auth } from "./auth.js";
// import { predict, loadModel } from "./predict.js";

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

app.use("/auth", auth);
// app.use("/", predict);

const PORT = process.env.PORT || 8000;

(async () => {

// console.log("MONGO_URI set?", !!process.env.MONGO_URI);

  await connectMongo(process.env.MONGO_URI!);
//   await loadModel(process.env.MODEL_PATH!);
  app.listen(PORT, () => console.log("Backend on", PORT));
})();
