# biomass_pred

End-to-end biomass prediction system built around the CSIRO Pasture Biomass dataset.  
It includes:

- A Python model service (TensorFlow / Keras) that predicts 5 biomass targets from a pasture image.
- A Node.js / Express backend (TypeScript) that handles auth, stores images & predictions, and calls the model.
- A React frontend (Vite) for web.
- An Expo mobile app that talks to the same backend for “phone demo” capture + prediction.

---

## 1. Project architecture

**High-level flow**

1. User logs into the app (web or mobile).
2. User captures / uploads a pasture image.
3. Backend:
   - Stores the image in MongoDB via GridFS.
   - Sends the same image to the Python model service.
4. Model service:
   - Loads a trained Keras model  
     (`student_distill_fold2` exported as `student_distill_fold2_saved`)
   - Returns 5 regression outputs:
     - `Dry_Clover_g`
     - `Dry_Dead_g`
     - `Dry_Green_g`
     - `Dry_Total_g`
     - `GDM_g` (wet/green total)
5. Backend:
   - Maps raw outputs to human-readable labels.
   - Applies a simple rule to generate a recommendation (e.g. recommend if `Dry Total (g) < 100`).
   - Saves a prediction document in MongoDB.
6. Frontend / mobile:
   - Shows predicted values and recommendation.
   - Users can view past predictions in a “History” view.

**Services**

- `model`  
  Python 3.10 + TensorFlow  
  - Exposes: `POST /predict` (FastAPI + Uvicorn)
  - Loads the exported Keras model from `/app/export/student_distill_fold2_saved`
  - Accepts `multipart/form-data` with `image` field

- `backend`  
  Node.js 20, Express, TypeScript  
  - Exposes:
    - `POST /auth/register`
    - `POST /auth/login`
    - `POST /predict` (auth + image upload + model call + DB save)
    - `GET  /history` (auth, latest predictions for a user)
    - `GET  /images/:id` (serves stored images from GridFS)
  - Talks to:
    - MongoDB Atlas for users, predictions, and GridFS (images)
    - Python model service for predictions

- `frontend`  
  React + Vite  
  - Web UI for login/register, upload image, see prediction, and history.
  - Calls backend via `VITE_API_BASE_URL`.

- `mobile` (Expo app)  
  - Uses the camera or gallery on a phone.
  - Sends the image to the same backend `/predict` endpoint.
  - Displays the same outputs and recommendation as the web app.

---

## 2. Data & storage

### Images

Images are stored in MongoDB Atlas using **GridFS**:

- Files collection: `images.files`
- Chunks collection: `images.chunks`

Backend uses `GridFSBucket` with bucket name `"images"`.

Each stored file includes:

- `filename` (originalName)
- `metadata.contentType`
- `metadata.userId` (optional)

### Predictions

Predictions are stored in the `predictions` collection.

Each document includes:

- `userId` (optional, ObjectId)
- `ts` (timestamp)
- `outputs` (object with the 5 labeled targets)
  - `"Dry Clover (g)"`
  - `"Dry Dead (g)"`
  - `"Dry Green (g)"`
  - `"Dry Total (g)"`
  - `"Wet Total (g)"` (mapped from `GDM_g`)
- `recommend` (boolean)
- `imageFileId` (GridFS id)
- `originalName`
- `mimeType`

### Users

Users are stored in the `users` collection:

- `email` (unique)
- `hash` (bcrypt password hash)
- `createdAt`, `updatedAt`

Auth: JWT (`Authorization: Bearer <token>`).

---

## 3. Environment configuration

Create `backend/.env`:

```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority&appName=...
JWT_SECRET=dev_secret

# The model service endpoint the backend should call
MODEL_URL=http://model:8001/predict

# CORS origin for web frontend
CORS_ORIGIN=http://localhost:5173


# Build and run all services (model, backend, frontend)
docker compose up --build

# Stop all services
docker compose down

# Model service only (local, no Docker)
python -m uvicorn model_service:app --host 0.0.0.0 --port 8001

# Backend only (local)
cd backend
npm install
npm run dev

# Frontend only (local)
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173

# Mobile app (Expo)
cd <expo-app-folder>
npm install
npx expo start
