import axios from "axios";

export const api = axios.create({
    // In Docker we’ll set VITE_API_URL via env; in dev fallback to localhost
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",

});
