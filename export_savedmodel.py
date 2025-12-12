import tensorflow as tf
from pathlib import Path

H5_PATH = Path("export/student_distill_fold2_infer.h5")
OUT_PATH = Path("export/student_distill_fold2_infer_v3.keras")

print("Loading H5 model from:", H5_PATH)
model = tf.keras.models.load_model(H5_PATH, compile=False)
print("Model loaded. Saving Keras v3 model to:", OUT_PATH)

# Save in the new Keras v3 native format
model.save(OUT_PATH)  # .keras format

print("Done. Keras v3 model written to:", OUT_PATH)
