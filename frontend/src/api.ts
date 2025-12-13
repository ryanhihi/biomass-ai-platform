// frontend/src/api.ts
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? "http://localhost:8000"                // for local dev
    : "https://biomass-pred.onrender.com");  // REPLACE with your Render backend URL

export const api = axios.create({
  baseURL: API_BASE_URL,
});
