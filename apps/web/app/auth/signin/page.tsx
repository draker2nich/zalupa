"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Star } from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("dev@test.com");
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDevLogin() {
    if (!email || !agreed) return;
    setLoading(true);
    setError("");
    try {
      await signIn("credentials", {
        email,
        callbackUrl: "/",
        redirect: true,
      });
    } catch {
      setError("Ошибка входа. Проверьте email.");
    }
    setLoading(false);
  }

  async function handleGoogle() {
    if (!agreed) return;
    await signIn("google", { callbackUrl: "/" });
  }

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: "120px 24px 24px", minHeight: "100vh" }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", marginBottom: 20 }}>
        <Star size={24} />
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6, letterSpacing: "-0.02em" }}>Psyche Mirror</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 32, fontSize: 14, lineHeight: 1.5 }}>
        AI-дневник рефлексии. Войди чтобы начать.
      </p>

      {error && (
        <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, marginBottom: 16, fontSize: 13, color: "#DC2626" }}>
          {error}
        </div>
      )}

      {/* Dev login */}
      <div style={{ padding: 16, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10, fontWeight: 500 }}>Dev Login</div>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleDevLogin(); }}
          placeholder="Email"
          style={{ width: "100%", padding: "10px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", fontSize: 14, outline: "none", fontFamily: "inherit", marginBottom: 10 }}
        />
        <button
          onClick={handleDevLogin}
          disabled={!email || !agreed || loading}
          style={{
            width: "100%", padding: "10px", background: "var(--accent)",
            color: "#fff", border: "none", borderRadius: 10, fontSize: 14,
            fontWeight: 500, cursor: email && agreed && !loading ? "pointer" : "default",
            opacity: email && agreed && !loading ? 1 : 0.5,
            transition: "all 0.15s",
          }}
        >
          {loading ? "Входим..." : "Войти"}
        </button>
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>или</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>

      {/* Google */}
      <button
        onClick={handleGoogle}
        disabled={!agreed}
        style={{
          width: "100%", padding: "12px", background: "var(--surface)",
          border: "1px solid var(--border)", borderRadius: 10, fontSize: 14,
          cursor: agreed ? "pointer" : "default", opacity: agreed ? 1 : 0.5,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          marginBottom: 16, transition: "all 0.15s",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Войти через Google
      </button>

      {/* Consent */}
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 3, accentColor: "var(--accent)" }} />
        <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Я соглашаюсь с{" "}
          <a href="/legal/privacy" style={{ color: "var(--accent)", textDecoration: "underline" }}>Политикой конфиденциальности</a>{" "}
          и{" "}
          <a href="/legal/terms" style={{ color: "var(--accent)", textDecoration: "underline" }}>Условиями использования</a>.
        </span>
      </label>
    </div>
  );
}