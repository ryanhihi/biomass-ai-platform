import { useState } from "react";
import { api } from "./api";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);

  async function login(email: string, password: string) {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
  }

  async function predict() {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);  // IMAGE ONLY

    const { data } = await api.post("/predict", form, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    setResult(data);
  }

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h2>🌱 Biomass Distilled (Student) Predictor Model</h2>

      {!token && (
        <button onClick={() => login("demo@demo.com", "demo123")}>
          User Login
        </button>
      )}

      <div style={{ marginTop: 16 }}>
        <input
          type="file"
          accept="image/*"
          onChange={e => setFile(e.target.files?.[0] || null)}
        />
      </div>

      <button
        style={{ marginTop: 12 }}
        onClick={predict}
        disabled={!file}
      >
        Predict
      </button>

      {result && (
        <div style={{ marginTop: 16 }}>
          <h3>Prediction</h3>
          <pre>{JSON.stringify(result.outputs || result, null, 2)}</pre>
          <div>
            <strong>Recommendation:</strong>{" "}
            {result.recommend ? "✅ Recommend" : "❌ Not recommend"}
          </div>
        </div>
      )}
    </div>
  );
}
