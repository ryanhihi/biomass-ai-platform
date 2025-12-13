import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? "http://localhost:8000" // local dev backend
    : "https://biomass-backend.onrender.com"); // Render backend

export const api = axios.create({
  baseURL: API_BASE_URL,
});
