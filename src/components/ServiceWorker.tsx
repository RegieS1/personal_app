"use client";

import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // In dev, any worker on this origin (ours, or one left by another localhost project) would serve stale
      // /_next/static chunks, which makes the dev server force-reload the page in a loop. Remove it and its caches.
      void navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => void r.unregister()));
      if ("caches" in window) void caches.keys().then((keys) => keys.forEach((k) => void caches.delete(k)));
      return;
    }
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // registration failed (e.g. private mode): the app still works online
    });
  }, []);
  return null;
}
