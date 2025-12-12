import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import logo from "./assets/logo.png";

const TARGETS = [
  { label: "Dry Clover (g)", key: "Dry_Clover_g" },
  { label: "Dry Dead (g)", key: "Dry_Dead_g" },
  { label: "Dry Green (g)", key: "Dry_Green_g" },
  { label: "Dry Total (g)", key: "Dry_Total_g" },
  { label: "Wet Total (g)", key: "GDM_g" },
];

type HistoryItem = {
  _id: string;
  ts: string;
  outputs: Record<string, number>;
  recommend: boolean;
  imageFileId: string;
  originalName?: string;
};

type PredictResponseBackend = {
  ok?: boolean;
  // Some versions of the backend might return `outputs` keyed by label,
  // others might return `predictions` keyed by snake_case.
  outputs?: Record<string, number>;
  predictions?: Record<string, number>;
  recommend?: boolean;
  imageFileId?: string;
};

type UiResult = {
  outputs: Record<string, number>;
  recommend: boolean | null;
};

export default function App() {
  const [mode, setMode] = useState<"predict" | "history">("predict");

  const [email, setEmail] = useState("demo@demo.com");
  const [password, setPassword] = useState("demo123");
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [predictError, setPredictError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [authError, setAuthError] = useState<string | null>(null);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token]
  );

  async function register() {
    setAuthError(null);
    try {
      const { data } = await api.post("/auth/register", { email, password });
      if (!data.ok) {
        throw new Error(data.error || "Register failed");
      }
      // Auto-login after register
      await login();
    } catch (err: any) {
      console.error("Register error:", err);
      setAuthError(err?.message || "Register failed");
    }
  }

  async function login() {
    setAuthError(null);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.ok && data.token) {
        setToken(data.token);
        localStorage.setItem("token", data.token);
      } else {
        throw new Error(data.error || "Login failed");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setAuthError(err?.message || "Login failed");
    }
  }

  function logout() {
    setToken(null);
    localStorage.removeItem("token");
  }

  async function predict() {
    if (!file) return;
    setLoading(true);
    setPredictError(null);
    setResult(null);

    try {
      const form = new FormData();
      // Backend expects field name "image"
      form.append("image", file);

      // NOTE: backend route is /predict (no /api prefix)
      const { data } = await api.post<PredictResponseBackend>("/predict", form, {
        headers: {
          ...(authHeaders || {}),
          // Let browser set boundary; axios will override if needed
        },
      });

      // Choose outputs object: prefer data.outputs, fallback to data.predictions
      const rawOutputs: Record<string, number> =
        (data.outputs as any) || (data.predictions as any) || {};

      // Map to UI labels, supporting both label-keys and snake_case keys
      const mapped: Record<string, number> = {};
      TARGETS.forEach((t) => {
        const byLabel = rawOutputs[t.label]; // e.g. "Dry Clover (g)"
        const byKey = rawOutputs[t.key]; // e.g. "Dry_Clover_g"
        const value =
          typeof byLabel === "number"
            ? byLabel
            : typeof byKey === "number"
            ? byKey
            : 0;
        mapped[t.label] = value;
      });

      setResult({
        outputs: mapped,
        recommend:
          typeof data.recommend === "boolean" ? data.recommend : null,
      });
    } catch (err: any) {
      console.error("Predict error:", err);
      setPredictError(err?.message || "Prediction failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const { data } = await api.get("/history?limit=20", {
        headers: authHeaders,
      });
      setHistory(data.items || []);
    } catch (err) {
      console.error("History error:", err);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (mode === "history") loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, token]);

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "system-ui, sans-serif",
        maxWidth: 820,
      }}
    >
      

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <img
          src={logo}
          alt="Biomass App logo"
          style={{ width: 56, height: 56, borderRadius: 12 }}
        />
        <h2>🌱 Pature-GURU Biomass App </h2>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setMode("predict")}>Predict</button>
        <button onClick={() => setMode("history")} disabled={!token}>
          History
        </button>
      </div>

      {/* Auth block */}
      <div
        style={{
          border: "1px solid #ddd",
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
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
            {authError && (
              <div style={{ color: "crimson", marginTop: 8 }}>
                Auth error: {authError}
              </div>
            )}
            <small>Tip: use demo@demo.com / demo123 for testing.</small>
          </>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>✅ Logged in as {email}</span>
            <button onClick={logout}>Logout</button>
          </div>
        )}
      </div>

      {/* Predict mode */}
      {mode === "predict" && (
        <>
          <p>Upload or take a photo. On phone, this opens the camera.</p>

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

          {predictError && (
            <div style={{ marginTop: 16, color: "crimson" }}>
              Error: {predictError}
            </div>
          )}

          {result && (
            <div style={{ marginTop: 16 }}>
              <h3>Results</h3>
              {result.recommend !== null && (
                <div style={{ marginBottom: 8 }}>
                  <strong>Recommendation:</strong>{" "}
                  {result.recommend ? "✅ Recommend" : "❌ Not recommend"}
                </div>
              )}
              <ul>
                {TARGETS.map((t) => (
                  <li key={t.label}>
                    <strong>{t.label}:</strong>{" "}
                    {Number(result.outputs[t.label] ?? 0).toFixed(2)} g
                  </li>
                ))}
              </ul>
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
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: 12,
                }}
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
                      {TARGETS.map((t) => {
                        const val =
                          item.outputs?.[t.label] ??
                          item.outputs?.[t.key] ??
                          0;
                        return (
                          <li key={t.label}>
                            <strong>{t.label}:</strong>{" "}
                            {Number(val).toFixed(2)} g
                          </li>
                        );
                      })}
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
