// Service worker: lets the app open with no connection.
// - Build assets (/_next/static, icons): cache-first; their URLs change on every deploy.
// - Pages: network-first, falling back to the last copy seen (or Today) when offline.
// - Supabase and other origins are untouched; item data has its own offline cache in localStorage.
const CACHE = "be-positive-v4"; // bump to drop every older cache on activate

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  // Dev-server chunks keep the same URL across rebuilds, so caching them serves stale code (and an HMR reload
  // loop). The app unregisters this worker in dev; this guard covers the moment before that happens.
  if (url.pathname.startsWith("/_next/webpack-hmr") || url.pathname.includes("/_next/static/chunks/%5B") || url.pathname.includes("/_next/static/chunks/[")) return;
  if (url.pathname.startsWith("/auth/") || url.pathname === "/sw.js") return;

  const isAsset = url.pathname.startsWith("/_next/static/") || /\.(svg|png|ico|webmanifest|woff2?)$/.test(url.pathname);
  event.respondWith(isAsset ? cacheFirst(req) : networkFirst(req));
});

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    // Don't store redirects (e.g. to /login) under the page's URL. Skip ?_rsc= page-data requests too: each
    // navigation uses a new value, so caching them would grow forever. Offline, Next falls back to a full page
    // load, which is cached.
    if (res.ok && !res.redirected && !new URL(req.url).searchParams.has("_rsc")) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  } catch {
    const hit = await caches.match(req);
    if (hit) return hit;
    if (req.mode === "navigate") {
      // Not saved with this exact query (e.g. /tasks?q=…): the same page without it beats falling back to Today.
      const page = (await caches.match(req, { ignoreSearch: true })) ?? (await caches.match("/"));
      if (page) return page;
    }
    return new Response("You're offline and this page hasn't been opened before.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

// The app sends its page list while online, so pages work offline even if they were never opened.
// Page HTML holds no user data (lists load from the device copy), so saving it ahead of time is safe.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "precache" || !Array.isArray(event.data.urls)) return;
  event.waitUntil(precache(event.data.urls));
});

async function precache(urls) {
  const cache = await caches.open(CACHE);
  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { credentials: "same-origin" });
        if (res.ok && !res.redirected) await cache.put(url, res); // signed out: /login redirect, skip
      } catch {
        // offline or server hiccup: try again next time
      }
    }),
  );
}

// Tapping a reminder opens (or focuses) the app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) =>
      windows.length ? windows[0].focus() : self.clients.openWindow("/"),
    ),
  );
});
