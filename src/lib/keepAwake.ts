"use client";

/**
 * Optional "keep screen on" (Screen Wake Lock) so the dashboard on a reception tablet never sleeps.
 * Only works while the app is visible; the OS releases the lock when the app is hidden.
 */
const KEY = "medassist.keepAwake";
let lock: WakeLockSentinel | null = null;

export const wakeLockSupported = (): boolean => typeof navigator !== "undefined" && "wakeLock" in navigator;

export function isKeepAwakeOn(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

async function acquire() {
  if (!wakeLockSupported() || document.visibilityState !== "visible" || lock) return;
  try {
    lock = await navigator.wakeLock.request("screen");
    lock.addEventListener("release", () => {
      lock = null;
    });
  } catch {
    lock = null; // denied (e.g. battery saver)
  }
}

export async function setKeepAwake(on: boolean): Promise<void> {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* storage blocked */
  }
  if (on) await acquire();
  else if (lock) {
    await lock.release().catch(() => undefined);
    lock = null;
  }
}

/** Re-acquires the lock whenever the app becomes visible again. Returns a cleanup function. */
export function initKeepAwake(): () => void {
  const onVisible = () => {
    if (isKeepAwakeOn()) void acquire();
  };
  document.addEventListener("visibilitychange", onVisible);
  onVisible();
  return () => document.removeEventListener("visibilitychange", onVisible);
}
