#import libraries
import io
from typing import Dict

import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import tensorflow as tf

#configurations
MODEL_PATH = "./export/student_distill_fold2_infer.h5"
TARGET_NAMES = ["Dry_Green_g", "Dry_Dead_g", "Dry_Clover_g", "GDM_g", "Dry_Total_g"]
IMG_HEIGHT = 224
IMG_WIDTH = 448

#app setups using FastAPI
app = FastAPI(title="Biomass Model Service")

#middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#load the model once the app startup
print("Loading Keras model from", MODEL_PATH)
model = tf.keras.models.load_model(MODEL_PATH, compile=False)
print("Model loaded.")


#method to preprocess image
def preprocess_image(contents: bytes) -> np.ndarray:
    """Decode, resize, normalize to match training pipeline."""
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    # PIL uses (width, height)
    img = img.resize((IMG_WIDTH, IMG_HEIGHT))
    arr = np.asarray(img).astype("float32") / 255.0
    arr = np.expand_dims(arr, axis=0)  # (1, H, W, 3)
    return arr

#POST for predict
@app.post("/predict")
async def predict(image: UploadFile = File(...)) -> Dict:
    """Receive an image, return biomass predictions."""
    contents = await image.read()
    x = preprocess_image(contents)

    preds = model.predict(x)[0]  # (5,)
    preds = preds.astype(float).tolist()

    result = {name: float(v) for name, v in zip(TARGET_NAMES, preds)}

    return {
        "predictions": result,
    }