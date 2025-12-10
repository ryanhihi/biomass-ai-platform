import { useState } from "react";
import { api } from "./api";

const TARGETS = [
  "Dry Clover (g)",
  "Dry Dead (g)",
  "Dry Green (g)",
  "Dry Total (g)",
  "Wet Total (g)",
];

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function predict() {
    if (!file) return;

    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const { data } = await api.post("/predict", form);
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 720 }}>
      <h2>🌱 Biomass Predictor (Image Only)</h2>

      {/* Upload from gallery OR take photo on phone */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      <div style={{ marginTop: 12 }}>
        <button onClick={predict} disabled={!file || loading}>
          {loading ? "Predicting..." : "Predict"}
        </button>
      </div>

      {file && (
        <div style={{ marginTop: 12 }}>
          <img
            src={URL.createObjectURL(file)}
            alt="preview"
            style={{ width: "100%", maxWidth: 420, borderRadius: 8 }}
          />
        </div>
      )}

      {result?.ok && (
        <div style={{ marginTop: 16 }}>
          <h3>Results</h3>
          <div>
            <strong>Recommendation:</strong>{" "}
            {result.recommend ? "✅ Recommend" : "❌ Not recommend"}
          </div>

          <ul>
            {TARGETS.map((t) => (
              <li key={t}>
                <strong>{t}:</strong>{" "}
                {Number(result.outputs?.[t] ?? 0).toFixed(2)} g
              </li>
            ))}
          </ul>
        </div>
      )}

      {result?.ok === false && (
        <div style={{ marginTop: 16, color: "crimson" }}>
          Error: {result.error}
        </div>
      )}
    </div>
  );
}
