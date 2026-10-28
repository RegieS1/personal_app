// Local-time YYYY-MM-DD (toISOString would give the UTC day).
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const parse = (date: string) => new Date(`${date}T00:00`);
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export type Repeat = "daily" | "weekly" | "monthly";
export const REPEAT_LABEL: Record<Repeat, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };

// shortcut: monthly clamps to the month's last day and keeps that day (Jan 31 -> Feb 28 -> Mar 28); store the anchor day if that matters.
function step(date: string, repeat: Repeat) {
  const d = parse(date);
  if (repeat === "daily") return ymd(addDays(d, 1));
  if (repeat === "weekly") return ymd(addDays(d, 7));
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 2, 0).getDate();
  return ymd(new Date(d.getFullYear(), d.getMonth() + 1, Math.min(d.getDate(), lastDay)));
}

// Next due date after completing a repeating item: one period after `from`, skipping past any dates already gone.
export function nextDue(from: string, repeat: Repeat, today: string) {
  let next = step(from, repeat);
  while (next <= today) next = step(next, repeat);
  return next;
}

// "Today", "Tomorrow", "Friday", or "Mon, 2 Nov" (with the year when it isn't this year).
export function friendlyDate(date: string, today: string) {
  const d = parse(date);
  const diff = Math.round((d.getTime() - parse(today).getTime()) / 864e5);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short",
    ...(date.slice(0, 4) !== today.slice(0, 4) && { year: "numeric" }),
  });
}

// "call mom on friday !high" -> { title: "call mom", due_date: <next friday>, priority: "high" }
// "gym every monday" -> weekly from next Monday; "water plants daily" -> daily from today.
// shortcut: only today/tomorrow/weekday names, daily|weekly|monthly / every day|week|month|<weekday>, and !low|!medium|!high.
export function parseQuickAdd(text: string, now = new Date()) {
  let title = text;
  let due_date: string | undefined;
  let priority: "low" | "medium" | "high" | undefined;
  let repeat: Repeat | undefined;
  const take = (re: RegExp) => {
    const m = title.match(re);
    if (m) title = title.replace(re, " ");
    return m;
  };
  const nextWeekday = (name: string) => ymd(addDays(now, (DAYS.indexOf(name.toLowerCase()) - now.getDay() + 7) % 7 || 7));

  const p = take(/(^|\s)!(low|medium|high)\b/i);
  if (p) priority = p[2].toLowerCase() as typeof priority;

  const every = take(new RegExp(`\\bevery\\s+(day|week|month|${DAYS.join("|")})\\b`, "i"));
  if (every) {
    const unit = every[1].toLowerCase();
    repeat = unit === "day" ? "daily" : unit === "month" ? "monthly" : "weekly";
    if (DAYS.includes(unit)) due_date = nextWeekday(unit);
  } else {
    const r = take(/\b(daily|weekly|monthly)\b/i);
    if (r) repeat = r[1].toLowerCase() as Repeat;
  }

  const lead = "(?:\\b(?:on|by|due)\\s+)?";
  if (due_date) {
    // already set by "every <weekday>"
  } else if (take(new RegExp(`${lead}\\btoday\\b`, "i"))) due_date = ymd(now);
  else if (take(new RegExp(`${lead}\\btomorrow\\b`, "i"))) due_date = ymd(addDays(now, 1));
  else {
    const w = take(new RegExp(`${lead}\\b(${DAYS.join("|")})\\b`, "i"));
    if (w) due_date = nextWeekday(w[1]);
  }
  // A repeating item needs a first due date so it shows up on Today.
  if (repeat && !due_date) due_date = ymd(now);

  title = title.replace(/\s+/g, " ").trim();
  return { title: title || text.trim(), due_date, priority, repeat };
}
