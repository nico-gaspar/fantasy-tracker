"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "GUEST_ENDPOINT_FAILED" || data.code === "GUEST_NETWORK_ERROR") {
          setError("La Liga auth service is currently unreachable. You can still use the tracker with public data.");
        } else if (data.code === "LOGIN_FAILED") {
          setError("Incorrect email or password.");
        } else {
          setError(data.error ?? "Login failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0b0b0b",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "'DM Mono', monospace",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 380,
        background: "#111",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 36,
      }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 10,
            color: "rgba(200,255,87,0.6)",
            letterSpacing: "0.15em",
            marginBottom: 10,
          }}>
            LA LIGA FANTASY · 2025/26
          </div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 800,
            color: "#fff",
            fontFamily: "'Syne', sans-serif",
            marginBottom: 8,
          }}>
            Connect account
          </h1>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
            Link your La Liga Fantasy account to access personal team data.
            Public stats work without login.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{
              display: "block",
              fontSize: 10,
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.1em",
              marginBottom: 6,
            }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                display: "block",
                width: "100%",
                padding: "11px 14px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                color: "#fff",
                fontSize: 13,
                fontFamily: "'DM Mono', monospace",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label style={{
              display: "block",
              fontSize: 10,
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.1em",
              marginBottom: 6,
            }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                display: "block",
                width: "100%",
                padding: "11px 14px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                color: "#fff",
                fontSize: 13,
                fontFamily: "'DM Mono', monospace",
                outline: "none",
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(255,77,77,0.08)",
              border: "1px solid rgba(255,77,77,0.2)",
              color: "#FF7A7A",
              fontSize: 11,
              lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6,
              width: "100%",
              padding: "13px 0",
              background: loading ? "rgba(200,255,87,0.06)" : "rgba(200,255,87,0.12)",
              border: "1px solid rgba(200,255,87,0.35)",
              borderRadius: 10,
              color: loading ? "rgba(200,255,87,0.4)" : "#C8FF57",
              fontSize: 12,
              fontFamily: "'DM Mono', monospace",
              fontWeight: 700,
              letterSpacing: "0.08em",
              cursor: loading ? "not-allowed" : "pointer",
              textAlign: "center",
            }}
          >
            {loading ? "CONNECTING..." : "CONNECT ACCOUNT"}
          </button>
        </form>

        <div style={{
          marginTop: 24,
          paddingTop: 20,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
        }}>
          <a
            href="/"
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.25)",
              textDecoration: "none",
              letterSpacing: "0.06em",
            }}
          >
            Continue without login →
          </a>
        </div>
      </div>
    </div>
  );
}
