import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import logo from "./assets/logo.png";
import "./App.css";

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
  outputs?: Record<string, number>;      // label-based keys
  predictions?: Record<string, number>;  // snake_case keys
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
      form.append("image", file); // backend expects "image"

      const { data } = await api.post<PredictResponseBackend>("/predict", form, {
        headers: {
          ...(authHeaders || {}),
        },
      });

      const rawOutputs: Record<string, number> =
        (data.outputs as any) || (data.predictions as any) || {};

      const mapped: Record<string, number> = {};
      TARGETS.forEach((t) => {
        const byLabel = rawOutputs[t.label];
        const byKey = rawOutputs[t.key];
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
    <div className="app-root">
      <div className="app-shell">
        {/* LEFT / HERO SIDE */}
        <aside className="hero-pane">
          <div className="hero-logo-wrap">
            <img src={logo} alt="Pasture-GURU logo" className="hero-logo" />
          </div>
          <h1 className="hero-title">Pasture-GURU Biomass App</h1>
          <p className="hero-tagline">
            Image-only pasture biomass estimates in the field, powered by deep
            learning.
          </p>

          <ul className="hero-bullets">
            <li>Upload or snap a plot photo</li>
            <li>Model returns 5 biomass targets in grams</li>
            <li>Simple recommendation flag for quick decisions</li>
          </ul>

          <div className="hero-footnote">
            Backed by a student-distilled EfficientNet model trained on CSIRO
            Biomass data.
          </div>
        </aside>

        {/* RIGHT / INTERACTIVE SIDE */}
        <main className="main-pane">
          {/* Brand row (for narrow screens) */}
          <header className="brand-row">
            <div className="brand-left">
              <img src={logo} alt="Pasture-GURU logo" className="brand-logo" />
              <div>
                <h2 className="brand-title">Pasture-GURU Biomass App</h2>
                <p className="brand-subtitle">
                  Field-side prediction & decision support
                </p>
              </div>
            </div>

            <div className="mode-toggle">
              <button
                className={`mode-btn ${
                  mode === "predict" ? "mode-btn--active" : ""
                }`}
                onClick={() => setMode("predict")}
              >
                Predict
              </button>
              <button
                className={`mode-btn ${
                  mode === "history" ? "mode-btn--active" : ""
                }`}
                onClick={() => setMode("history")}
                disabled={!token}
              >
                History
              </button>
            </div>
          </header>

          {/* Auth card */}
          <section className="card auth-card">
            {!token ? (
              <>
                <div className="auth-row">
                  <input
                    className="field-input"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <input
                    className="field-input"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button className="btn btn-primary" onClick={login}>
                    Login
                  </button>
                  <button className="btn btn-ghost" onClick={register}>
                    Register
                  </button>
                </div>
                {authError && (
                  <div className="msg msg-error">
                    Auth error: {authError}
                  </div>
                )}
                <small className="hint">
                  Tip: use <code>demo@demo.com</code> /{" "}
                  <code>demo123</code> for testing.
                </small>
              </>
            ) : (
              <div className="auth-logged-in">
                <span>✅ Logged in as {email}</span>
                <button className="btn btn-ghost" onClick={logout}>
                  Logout
                </button>
              </div>
            )}
          </section>

          {/* Main content card */}
          <section className="card main-card">
            {mode === "predict" ? (
              <>
                <h3 className="card-title">Capture & predict</h3>
                <p className="card-subtitle">
                  Upload a pasture image or use your phone camera. The model
                  estimates biomass per plot.
                </p>

                <div className="file-picker">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>

                {file && (
                  <div className="preview-wrap">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="preview"
                      className="preview-image"
                    />
                    <div className="preview-meta">
                      <div className="preview-name">{file.name}</div>
                      <div className="preview-size">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                )}

                <div className="actions-row">
                  <button
                    className="btn btn-primary"
                    onClick={predict}
                    disabled={!file || loading}
                  >
                    {loading ? "Predicting…" : "Run prediction"}
                  </button>
                </div>

                {predictError && (
                  <div className="msg msg-error">
                    Error: {predictError}
                  </div>
                )}

                {result && (
                  <div className="results-block">
                    {result.recommend !== null && (
                      <div className="recommend-badge">
                        {result.recommend ? "✅ Recommend" : "❌ Not recommend"}
                      </div>
                    )}
                    <ul className="results-list">
                      {TARGETS.map((t) => (
                        <li key={t.label}>
                          <span className="result-label">{t.label}</span>
                          <span className="result-value">
                            {Number(result.outputs[t.label] ?? 0).toFixed(2)} g
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 className="card-title">Recent field runs</h3>

                {historyLoading && <div>Loading history…</div>}

                {!historyLoading && history.length === 0 && (
                  <div className="msg msg-muted">No history yet.</div>
                )}

                <div className="history-grid">
                  {history.map((item) => (
                    <div key={item._id} className="history-card">
                      <div className="history-main">
                        <img
                          src={`${api.defaults.baseURL}/images/${item.imageFileId}`}
                          alt="history"
                          className="history-image"
                        />
                        <div className="history-body">
                          <div className="history-row">
                            <span className="history-date">
                              {new Date(item.ts).toLocaleString()}
                            </span>
                            <span className="history-pill">
                              {item.recommend
                                ? "✅ Recommend"
                                : "❌ Not recommend"}
                            </span>
                          </div>
                          <ul className="results-list compact">
                            {TARGETS.map((t) => {
                              const val =
                                item.outputs?.[t.label] ??
                                item.outputs?.[t.key] ??
                                0;
                              return (
                                <li key={t.label}>
                                  <span className="result-label">
                                    {t.label}
                                  </span>
                                  <span className="result-value">
                                    {Number(val).toFixed(2)} g
                                  </span>
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
          </section>
        </main>
      </div>
    </div>
  );
}
