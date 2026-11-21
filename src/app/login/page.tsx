"use client";

import { useState } from "react";
import { api, hardNavigate } from "@/lib/client";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/login", { method: "POST", json: { pin } });
      // Full reload so the app shell and every poll start fresh with the new session cookie.
      hardNavigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-b from-teal-700 to-teal-900 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-teal-600 text-2xl text-white">✚</div>
        <h1 className="text-center text-xl font-bold">MedAssist</h1>
        <p className="mb-5 text-center text-sm text-slate-500">Enter your doctor PIN to view patient data.</p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-teal-600"
        />
        {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
        <button disabled={busy || !pin} className="mt-4 w-full rounded-xl bg-teal-600 py-3 font-semibold text-white disabled:opacity-50">
          {busy ? "Checking…" : "Unlock"}
        </button>
      </form>
      <p className="fixed bottom-4 text-center text-xs text-teal-100/80">Designed &amp; developed by Muhammad Aun</p>
    </div>
  );
}
