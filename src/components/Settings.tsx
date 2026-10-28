"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { loadAll } from "@/lib/items";
import { toCsv } from "@/lib/export";
import { requestNotifications } from "@/lib/notify";
import { ymd } from "@/lib/dates";
import { SignOutButton } from "./SignOutButton";

const THEME_KEY = "theme"; // read by the pre-paint script in app/layout.tsx
const THEMES = { dark: "Dark", light: "Light", system: "Match device" } as const;
type Theme = keyof typeof THEMES;

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "system" ? t : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(t: Theme) {
  const light = t === "light" || (t === "system" && matchMedia("(prefers-color-scheme: light)").matches);
  if (light) document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const noop = () => () => {};
const permissionNow = () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission);

export function Settings({ email }: { email?: string }) {
  // Browser-only values read through useSyncExternalStore so the server render (defaults) hydrates cleanly.
  const storedTheme = useSyncExternalStore(noop, readTheme, () => "dark" as Theme);
  const storedPermission = useSyncExternalStore(noop, permissionNow, () => "default");
  const [theme, setTheme] = useState<Theme | null>(null);
  const [permission, setPermission] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const current = theme ?? storedTheme;
  const perm = permission ?? storedPermission;

  function chooseTheme(t: Theme) {
    setTheme(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      // storage blocked: applies until reload
    }
    applyTheme(t);
  }

  async function exportAs(format: "json" | "csv") {
    setBusy(true);
    try {
      const items = await loadAll();
      const stamp = ymd(new Date());
      if (format === "json") download(`be-positive-${stamp}.json`, JSON.stringify(items, null, 2), "application/json");
      else download(`be-positive-${stamp}.csv`, toCsv(items), "text/csv;charset=utf-8");
    } finally {
      setBusy(false);
    }
  }

  const section = "card mt-4 space-y-3 p-4";
  const heading = "text-xs font-medium uppercase tracking-wide text-muted";

  return (
    <>
      <h1 className="title">Settings</h1>

      <section className={section}>
        <h2 className={heading}>Appearance</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Theme">
          {(Object.keys(THEMES) as Theme[]).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={current === t} onClick={() => chooseTheme(t)} className="chip">
              {THEMES[t]}
            </button>
          ))}
        </div>
      </section>

      <section className={section}>
        <h2 className={heading}>Reminders</h2>
        <p className="text-sm text-muted">
          A daily summary of what&apos;s due, overdue and up for review, plus a ping when a focus session ends.
          Reminders arrive while the app is open in a tab or installed on your home screen.
        </p>
        {perm === "granted" ? (
          <p className="text-sm text-emerald-400">Reminders are on.</p>
        ) : perm === "denied" ? (
          <p className="text-sm text-red-400">Notifications are blocked. Allow them for this site in your browser settings.</p>
        ) : perm === "unsupported" ? (
          <p className="text-sm text-muted">This browser doesn&apos;t support notifications.</p>
        ) : (
          <button onClick={async () => setPermission((await requestNotifications()) ? "granted" : permissionNow())} className="btn-primary">
            Turn on reminders
          </button>
        )}
      </section>

      <section className={section}>
        <h2 className={heading}>Your data</h2>
        <p className="text-sm text-muted">Download everything you&apos;ve saved, across every area.</p>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => exportAs("json")} className="btn-secondary disabled:opacity-60">Export JSON</button>
          <button disabled={busy} onClick={() => exportAs("csv")} className="btn-secondary disabled:opacity-60">Export CSV (spreadsheet)</button>
        </div>
      </section>

      <section className={section}>
        <h2 className={heading}>Account</h2>
        <p className="truncate text-sm">{email}</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/reset-password" className="btn-secondary">Change password</Link>
          <SignOutButton className="btn-secondary text-red-400" />
        </div>
      </section>
    </>
  );
}
