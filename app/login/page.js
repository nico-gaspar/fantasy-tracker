"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const errorParam   = searchParams.get("error");

  const errorMessages = {
    no_code:                  "No authorisation code received. Please try again.",
    token_exchange_failed:    "Could not complete login — La Liga auth returned an error.",
    network_error:            "Network error during login. Check your connection and try again.",
    client_id_not_configured: "Server configuration error (client_id missing).",
    access_denied:            "Access denied. You may need a La Liga Fantasy account.",
  };
  const errorMsg = errorParam
    ? (errorMessages[errorParam] ?? decodeURIComponent(errorParam))
    : null;

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
        {/* Header */}
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
            margin: "0 0 8px",
          }}>
            Connect account
          </h1>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.6, margin: 0 }}>
            Link your La Liga Fantasy account to access personal team data.
            Public stats work without login.
          </p>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div style={{
            marginBottom: 20,
            padding: "10px 14px",
            borderRadius: 8,
            background: "rgba(255,77,77,0.08)",
            border: "1px solid rgba(255,77,77,0.2)",
            color: "#FF7A7A",
            fontSize: 11,
            lineHeight: 1.5,
          }}>
            {errorMsg}
          </div>
        )}

        {/* Single sign-in button */}
        <a
          href="/api/auth/login"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding: "14px 0",
            background: "#E8002D",
            border: "1px solid rgba(232,0,45,0.5)",
            borderRadius: 10,
            color: "#fff",
            fontSize: 12,
            fontFamily: "'DM Mono', monospace",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textDecoration: "none",
            transition: "opacity 0.15s",
            boxSizing: "border-box",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          SIGN IN WITH LA LIGA FANTASY
        </a>

        <p style={{
          marginTop: 14,
          fontSize: 10,
          color: "rgba(255,255,255,0.18)",
          textAlign: "center",
          lineHeight: 1.6,
          margin: "14px 0 0",
        }}>
          You&apos;ll be redirected to the official La Liga login page.
        </p>

        {/* Skip */}
        <div style={{
          marginTop: 24,
          paddingTop: 20,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
        }}>
          <a href="/" style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.25)",
            textDecoration: "none",
            letterSpacing: "0.06em",
          }}>
            Continue without login →
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
