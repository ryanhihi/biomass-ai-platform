import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectMongo } from "./db.js";
import { predict, loadModel } from "./predict.js";
import { auth } from "./auth.js";
import { history } from "./history.js";
import { images } from "./images.js";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);

app.use("/auth", auth);
app.use("/", predict);
app.use("/", history);
app.use("/", images);

const PORT = Number(process.env.PORT || 8000);

async function boot() {
  console.log("MONGO_URI set?", !!process.env.MONGO_URI);

  await connectMongo(process.env.MONGO_URI!);
  await loadModel(process.env.MODEL_PATH!);

  app.listen(PORT, () => {
    console.log(`✅ Backend running at http://localhost:${PORT}`);
  });
}

boot().catch((err) => {
  console.error("❌ Boot failed:", err);
  process.exit(1);
});
