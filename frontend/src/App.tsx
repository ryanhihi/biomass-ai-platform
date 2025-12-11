import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

const TARGETS = [
  "Dry Clover (g)",
  "Dry Dead (g)",
  "Dry Green (g)",
  "Dry Total (g)",
  "Wet Total (g)",
];

type HistoryItem = {
  _id: string;
  ts: string;
  outputs: Record<string, number>;
  recommend: boolean;
  imageFileId: string;
  originalName?: string;
};

export default function App() {
  const [mode, setMode] = useState<"predict" | "history">("predict");

  const [email, setEmail] = useState("demo@demo.com");
  const [password, setPassword] = useState("demo123");
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token]
  );

  async function register() {
    const { data } = await api.post("/auth/register", { email, password });
    if (!data.ok) throw new Error(data.error || "Register failed");
    return login();
  }

  async function login() {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.ok && data.token) {
      setToken(data.token);
      localStorage.setItem("token", data.token);
    } else {
      throw new Error(data.error || "Login failed");
    }
  }

  function logout() {
    setToken(null);
    localStorage.removeItem("token");
  }

  async function predict() {
    if (!file) return;
    setLoading(true);
    setResult(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const { data } = await api.post("/predict", form, { headers: authHeaders });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const { data } = await api.get("/history?limit=20", { headers: authHeaders });
      setHistory(data.items || []);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (mode === "history") loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, token]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 820 }}>
      <h2>🌱 Biomass App (Image Only)</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setMode("predict")}>Predict</button>
        <button onClick={() => setMode("history")} disabled={!token}>
          History
        </button>
      </div>

      {/* Auth block */}
      <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8, marginBottom: 16 }}>
        {!token ? (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                placeholder="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                placeholder="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button onClick={login}>Login</button>
              <button onClick={register}>Register</button>
            </div>
            <small>
              Tip: create a real demo account once your DB user is ready.
            </small>
          </>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>✅ Logged in</span>
            <button onClick={logout}>Logout</button>
          </div>
        )}
      </div>

      {/* Predict mode */}
      {mode === "predict" && (
        <>
          <p> 
            Upload or take a photo. On phone, this opens the camera.
          </p>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          {file && (
            <div style={{ marginTop: 12 }}>
              <img
                src={URL.createObjectURL(file)}
                alt="preview"
                style={{ width: "100%", maxWidth: 420, borderRadius: 8 }}
              />
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <button onClick={predict} disabled={!file || loading}>
              {loading ? "Predicting..." : "Predict"}
            </button>
          </div>

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
        </>
      )}

      {/* History mode */}
      {mode === "history" && (
        <>
          {historyLoading && <div>Loading history...</div>}

          {!historyLoading && history.length === 0 && (
            <div>No history yet.</div>
          )}

          <div style={{ display: "grid", gap: 12 }}>
            {history.map((item) => (
              <div
                key={item._id}
                style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}
              >
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <img
                    src={`${api.defaults.baseURL}/images/${item.imageFileId}`}
                    alt="history"
                    style={{ width: 180, borderRadius: 6 }}
                  />
                  <div>
                    <div>
                      <strong>Date:</strong>{" "}
                      {new Date(item.ts).toLocaleString()}
                    </div>
                    <div>
                      <strong>Recommendation:</strong>{" "}
                      {item.recommend ? "✅ Recommend" : "❌ Not recommend"}
                    </div>

                    <ul>
                      {TARGETS.map((t) => (
                        <li key={t}>
                          <strong>{t}:</strong>{" "}
                          {Number(item.outputs?.[t] ?? 0).toFixed(2)} g
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
