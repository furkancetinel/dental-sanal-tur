"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      setError("Şifre yanlış");
    }
    setLoading(false);
  }

  return (
    <div style={{ fontFamily: "Poppins, sans-serif" }} className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm">
        <img src="/turuncu360-logo.svg" alt="Turuncu360" className="h-8 mb-6" />
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Admin Girişi</h1>
        <p className="text-sm text-gray-400 mb-6">Sanal tur yönetim paneli</p>
        <input
          type="password"
          placeholder="Şifre"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mb-3 focus:outline-none focus:border-orange-400"
        />
        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-opacity disabled:opacity-60"
          style={{ background: "#f0851b" }}
        >
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </div>
    </div>
  );
}
