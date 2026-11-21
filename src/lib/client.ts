"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Full-page navigation (drops all client state and re-runs the auth check on the server).
 * Used outside React event flow (e.g. from `api()` on a 401), where the Next router is unavailable.
 */
export function hardNavigate(path: string) {
  window.location.assign(new URL(path, window.location.origin));
}

function redirectToLogin() {
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) hardNavigate("/login");
}

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: { "Content-Type": "application/json", ...(rest.headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    redirectToLogin();
    throw new Error("Unauthorized");
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

type PollState<T> = { data: T | null; error: string | null; settledUrl: string | null };

/**
 * Polls a JSON endpoint. The interval and in-flight request are cleaned up on unmount or when the
 * URL changes. `reload()` refetches the *current* URL immediately and restarts the interval.
 */
export function usePoll<T>(url: string | null, intervalMs = 5000) {
  const [state, setState] = useState<PollState<T>>({ data: null, error: null, settledUrl: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!url) return;
    const ctrl = new AbortController();
    let inFlight = false;

    const load = async () => {
      if (inFlight) return; // don't stack requests when the server is slower than the interval
      inFlight = true;
      try {
        const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
        if (res.status === 401) {
          redirectToLogin();
          return;
        }
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
        if (!ctrl.signal.aborted) setState({ data: json as T, error: null, settledUrl: url });
      } catch (e) {
        if (ctrl.signal.aborted || (e as Error).name === "AbortError") return;
        setState((s) => ({ ...s, error: e instanceof Error ? e.message : "Failed to load", settledUrl: url }));
      } finally {
        inFlight = false;
      }
    };

    load();
    const t = setInterval(load, intervalMs);
    return () => {
      ctrl.abort();
      clearInterval(t);
    };
  }, [url, intervalMs, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  // Loading until the current URL has produced a response (success or error). Previous data is kept
  // while a new URL loads so search-as-you-type lists don't flash empty.
  const loading = url !== null && state.settledUrl !== url;
  return { data: state.data, error: state.error, loading, reload };
}

export function fmtDateTime(iso: string | Date, tz?: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function fmtTime(iso: string | Date, tz?: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function fmtDay(iso: string | Date, tz?: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
}

export function timeAgo(iso: string | Date | null) {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function displayName(p: { name?: string | null; phone: string }) {
  return p.name || `+${p.phone}`;
}

export const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-600",
  completed: "bg-sky-100 text-sky-800",
  no_show: "bg-rose-100 text-rose-800",
};
