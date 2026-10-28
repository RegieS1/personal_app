"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { notify } from "@/lib/notify";

// The running session is stored as an end timestamp, so it survives page changes, reloads and
// background-tab throttling: remaining time is always endAt - now.
type Session = { title: string; endAt: number; minutes: number };
const KEY = "focus:session";
const MINUTES_KEY = "focus:minutes";
const EVENT = "focus-change";
const PRESETS = [15, 25, 45, 60];

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(session: Session | null) {
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch {
    // storage blocked: the session won't survive a page change
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb); // keeps other open tabs in sync
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

// ---- Alarm: synthesized with Web Audio, so there's no sound file to ship ----
// Browsers only allow audio after a user gesture, so the context is created/unlocked when Focus is pressed.
let audio: AudioContext | null = null;
let ringing: ReturnType<typeof setInterval> | undefined;
let ringStop: ReturnType<typeof setTimeout> | undefined;
const RING_EVERY_MS = 1500;
const RING_FOR_MS = 60_000;

function unlockAudio() {
  try {
    audio ??= new AudioContext();
    void audio.resume();
  } catch {
    // no Web Audio: the notification still fires
  }
}

function chime() {
  if (!audio) return;
  void audio.resume(); // after a reload there was no gesture; this may stay silent, the notification still shows
  const t = audio.currentTime;
  [[0, 880], [0.2, 880], [0.4, 1175]].forEach(([offset, freq]) => {
    const osc = audio!.createOscillator();
    const gain = audio!.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t + offset);
    gain.gain.exponentialRampToValueAtTime(0.3, t + offset + 0.02); // short fade in/out avoids clicks
    gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.18);
    osc.connect(gain).connect(audio!.destination);
    osc.start(t + offset);
    osc.stop(t + offset + 0.2);
  });
  navigator.vibrate?.([200, 100, 200]);
}

function startRinging() {
  stopRinging();
  unlockAudio();
  chime();
  ringing = setInterval(chime, RING_EVERY_MS);
  ringStop = setTimeout(stopRinging, RING_FOR_MS);
}

function stopRinging() {
  clearInterval(ringing);
  clearTimeout(ringStop);
  ringing = ringStop = undefined;
}

export function startFocus(title: string) {
  unlockAudio();
  const minutes = Number(read(MINUTES_KEY)) || 25;
  write({ title, minutes, endAt: Date.now() + minutes * 60_000 });
}

// Changing the length restarts the countdown with the new duration, and becomes the default for next time.
function restart(s: Session, n: number) {
  if (!Number.isFinite(n) || n < 1) return;
  const minutes = Math.min(180, Math.round(n));
  try {
    localStorage.setItem(MINUTES_KEY, String(minutes));
  } catch {
    // storage blocked: choice applies to this session only
  }
  write({ ...s, minutes, endAt: Date.now() + minutes * 60_000 });
}

// Rendered once in the app shell, so it stays visible on every page.
export function FocusTimer() {
  const raw = useSyncExternalStore(subscribe, () => read(KEY), () => null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!raw) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    // Notify once when the session ends (only if it hasn't already ended, so reloads don't repeat it).
    let done: ReturnType<typeof setTimeout> | undefined;
    try {
      const { endAt, title } = JSON.parse(raw) as Session;
      const ms = endAt - Date.now();
      if (ms > 0) done = setTimeout(() => {
        startRinging();
        void notify("Focus session complete", title, "focus");
      }, ms);
    } catch {
      // bad session data: the render below ignores it too
    }
    return () => {
      clearTimeout(first);
      clearInterval(t);
      clearTimeout(done);
      stopRinging(); // Close/Stop, a new length, or a new task all end the alarm
    };
  }, [raw]);

  let session: Session | null = null;
  try {
    session = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    session = null;
  }
  if (!session) return null;
  const s = session;

  const choose = (n: number) => restart(s, n);
  const left = now ? Math.max(0, Math.round((s.endAt - now) / 1000)) : s.minutes * 60;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="card fixed right-4 bottom-24 z-40 w-[min(24rem,calc(100vw-2rem))] space-y-3 border-accent p-4 lg:bottom-6">
      <div className="flex items-center justify-between gap-4" role="timer" aria-live="off">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted">{left ? "Focusing on" : "Time's up — nice work"}</p>
          <p className="truncate">{s.title}</p>
        </div>
        <p className="text-3xl font-semibold tabular-nums">{mm}:{ss}</p>
        <button onClick={() => write(null)} className="btn-secondary">{left ? "Stop" : "Stop alarm"}</button>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Focus length">
        {PRESETS.map((n) => (
          <button key={n} type="button" aria-pressed={s.minutes === n} onClick={() => choose(n)} className="chip">{n} min</button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-muted">
          Custom
          <input type="number" min="1" max="180" defaultValue={PRESETS.includes(s.minutes) ? "" : s.minutes} placeholder="min"
            onChange={(e) => choose(Number(e.target.value))} aria-label="Custom minutes" className="input w-20 py-1 text-right" />
        </label>
      </div>
    </div>
  );
}
