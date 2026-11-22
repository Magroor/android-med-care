/* MedAssist service worker: push notifications only. No fetch handler, no caching. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "MedAssist";
  const tag = data.tag || undefined;
  const urgent = typeof tag === "string" && tag.startsWith("urgent");
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag,
      renotify: Boolean(tag),
      requireInteraction: urgent,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client && client.url !== target) {
            try {
              await client.navigate(target);
            } catch {
              /* uncontrolled client: ignore */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(target);
    })(),
  );
});

/* Best-effort background check (Chrome on Android, installed app only; the browser decides when it runs).
   Real-time alerts come from Web Push above; this is a safety net if a push was missed. */
self.addEventListener("periodicsync", (event) => {
  if (event.tag !== "check-alerts") return;
  event.waitUntil(
    (async () => {
      try {
        const res = await fetch("/api/alerts", { credentials: "same-origin", cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        for (const u of (data.urgent || []).slice(0, 3)) {
          await self.registration.showNotification("🚨 Urgent patient message", {
            body: "New urgent patient message. Tap to open.",
            tag: "urgent-" + u.id,
            requireInteraction: true,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            data: { url: "/patients/" + u.patientId },
          });
        }
      } catch {
        /* offline or signed out: nothing to do */
      }
    })(),
  );
});
