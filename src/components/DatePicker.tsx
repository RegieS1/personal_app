"use client";

import { useEffect, useRef, useState } from "react";
import { ymd } from "@/lib/dates";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const parse = (v: string) => new Date(`${v}T00:00`);

// Calendar that shows only the current month's days (native pickers can't hide neighbouring months).
// The value lives in a hidden input so it posts with the form like a native field. It listens for:
// "restore" (fired by the draft restorer after it sets .value) and the form's "reset".
export function DatePicker({ name, label, defaultValue = "", onPick }: { name: string; label: string; defaultValue?: string; onPick?: () => void }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date | null>(null); // first day of the month on screen
  const hidden = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = hidden.current;
    const form = el?.form;
    const sync = () => setValue(el?.value ?? "");
    const reset = () => setValue("");
    el?.addEventListener("restore", sync);
    form?.addEventListener("reset", reset);
    return () => {
      el?.removeEventListener("restore", sync);
      form?.removeEventListener("reset", reset);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  function toggle() {
    const base = value ? parse(value) : new Date();
    setMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setOpen(!open);
  }

  function pick(v: string) {
    if (hidden.current) hidden.current.value = v; // set now so onPick (draft save) reads the new value
    setValue(v);
    setOpen(false);
    onPick?.();
  }

  const today = ymd(new Date());
  const shown = month ?? new Date();
  const year = shown.getFullYear();
  const m = shown.getMonth();
  const lead = new Date(year, m, 1).getDay();
  const days = new Date(year, m + 1, 0).getDate();
  const cells = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => ymd(new Date(year, m, i + 1)))];

  return (
    <div ref={root} className="relative text-xs text-muted">
      {label}
      <input ref={hidden} type="hidden" name={name} value={value} readOnly />
      <button type="button" onClick={toggle} aria-haspopup="dialog" aria-expanded={open}
        className={`input mt-1 text-left text-base ${value ? "text-foreground" : "text-muted"}`}>
        {value ? parse(value).toLocaleDateString(undefined, { dateStyle: "medium" }) : "Pick a date"}
      </button>

      {open && (
        <div role="dialog" aria-label={label} className="card absolute left-0 top-full z-30 mt-2 w-72 bg-surface p-3 text-foreground shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(year, m - 1, 1))} className="grid size-10 place-items-center rounded-lg hover:bg-border/50">‹</button>
            <p className="text-sm font-medium">{shown.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
            <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(year, m + 1, 1))} className="grid size-10 place-items-center rounded-lg hover:bg-border/50">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((d) => <span key={d} className="py-1 text-xs text-muted">{d}</span>)}
            {cells.map((d, i) =>
              d === null ? (
                <span key={`blank-${i}`} aria-hidden />
              ) : (
                <button key={d} type="button" onClick={() => pick(d)} aria-pressed={d === value}
                  aria-label={parse(d).toLocaleDateString(undefined, { dateStyle: "full" })}
                  className={`grid size-9 place-items-center rounded-lg text-sm tabular-nums transition ${
                    d === value ? "bg-linear-to-br from-accent to-accent-2 font-semibold text-white" : d === today ? "ring-1 ring-accent" : "hover:bg-border/50"
                  }`}>
                  {Number(d.slice(8))}
                </button>
              ),
            )}
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <button type="button" onClick={() => pick("")} className="rounded-lg px-3 py-2 text-muted hover:bg-border/50">Clear</button>
            <button type="button" onClick={() => pick(today)} className="rounded-lg px-3 py-2 text-accent hover:bg-accent/10">Today</button>
          </div>
        </div>
      )}
    </div>
  );
}
