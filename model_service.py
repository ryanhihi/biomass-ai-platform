import io
from typing import Dict

import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import tensorflow as tf

MODEL_PATH = "./export/student_distill_fold2_infer.h5"
IMG_HEIGHT = 224
IMG_WIDTH = 448

TARGET_NAMES = ["Dry_Green_g", "Dry_Dead_g", "Dry_Clover_g", "GDM_g", "Dry_Total_g"]

app = FastAPI(title="Biomass Model Service")

# CORS: allow everything (only the backend calls this)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print(f"Loading Keras model from {MODEL_PATH}")
model = tf.keras.models.load_model(MODEL_PATH, compile=False)
print("Model loaded.")


def preprocess_image(contents: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    img = img.resize((IMG_WIDTH, IMG_HEIGHT))
    arr = np.asarray(img).astype("float32") / 255.0
    arr = np.expand_dims(arr, axis=0)
    return arr


@app.get("/")
def root() -> Dict:
    """Simple root endpoint so hitting / in browser shows something."""
    return {"message": "Biomass model service is running"}


@app.get("/healthz")
def healthz() -> Dict:
    """Health check endpoint."""
    return {"ok": True}


@app.post("/predict")
async def predict(image: UploadFile = File(...)) -> Dict:
    contents = await image.read()
    x = preprocess_image(contents)
    preds = model.predict(x)[0]
    preds = preds.astype(float).tolist()
    result = {name: float(v) for name, v in zip(TARGET_NAMES, preds)}
    return {"predictions": result}
