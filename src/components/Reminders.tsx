"use client";

import { useEffect } from "react";
import { kindOf } from "@/config/kinds";
import { ymd } from "@/lib/dates";
import { isOverdue, isReviewDue, isRevisitDue, loadAll } from "@/lib/items";
import { notify } from "@/lib/notify";

const KEY = "reminded"; // the local day the daily summary was last shown
const FROM_HOUR = 8;

// One summary a day (from 8am) of what's overdue, due today, and due for review/revisit.
// shortcut: only fires while the app is open in some tab or as an installed app; true background reminders need
// Web Push (VAPID keys + a scheduled server job), add that when reminders must arrive with the app closed.
export function Reminders() {
  useEffect(() => {
    async function check() {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const now = new Date();
      const today = ymd(now);
      let last: string | null = null;
      try {
        last = localStorage.getItem(KEY);
      } catch {
        return;
      }
      if (last === today || now.getHours() < FROM_HOUR) return;

      const items = await loadAll();
      const open = items.filter((i) => i.status === "open" && kindOf(i.kind)?.status && i.due_date);
      const overdue = open.filter((i) => isOverdue(i, today)).length;
      const due = open.filter((i) => i.due_date === today).length;
      const reviews = items.filter((i) => isReviewDue(i, today)).length;
      const revisits = items.filter((i) => isRevisitDue(i, today)).length;
      const parts = [
        due && `${due} due today`,
        overdue && `${overdue} overdue`,
        reviews && `${reviews} learning review${reviews > 1 ? "s" : ""}`,
        revisits && `${revisits} decision${revisits > 1 ? "s" : ""} to revisit`,
      ].filter(Boolean);

      try {
        localStorage.setItem(KEY, today);
      } catch {
        // can't remember it: may notify again on the next check
      }
      if (parts.length) await notify("Today in Be Positive", parts.join(" · "), "daily");
    }

    void check();
    const t = setInterval(check, 15 * 60_000);
    return () => clearInterval(t);
  }, []);

  return null;
}
