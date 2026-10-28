"use client";

import { useEffect } from "react";
import { hrefOf, KINDS } from "@/config/kinds";
import { NAV_ITEMS } from "@/config/nav";

const PRECACHED_AT = "precached-at";
const EVERY_MS = 6 * 3600_000;

// Every page a tap can lead to: the nav, each Growth tab, and each lesson (read from the device copy).
function appPages() {
  let lessons: { id: string }[] = [];
  try {
    lessons = JSON.parse(localStorage.getItem("items:lesson") ?? "[]");
  } catch {
    // no cached lessons yet
  }
  return [
    ...new Set([
      ...NAV_ITEMS.map((n) => n.href),
      ...KINDS.map(hrefOf),
      ...lessons.map((l) => `/growth?tab=topics&lesson=${l.id}`),
    ]),
  ];
}

// Ask the worker to save every page while online (at most every 6 hours), so offline taps don't fall back to Today.
// Called from the signed-in app shell (OfflinePages), not the root layout: signed out, every page redirects to login.
export async function precache() {
  try {
    if (!navigator.onLine || Date.now() - Number(localStorage.getItem(PRECACHED_AT)) < EVERY_MS) return;
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: "precache", urls: appPages() });
    localStorage.setItem(PRECACHED_AT, String(Date.now()));
  } catch {
    // storage blocked or no worker: pages still get saved as they're visited
  }
}

// Mounted inside the signed-in app shell.
export function OfflinePages() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) void precache();
  }, []);
  return null;
}

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
