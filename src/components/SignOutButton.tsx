"use client";

import { signOut } from "@/app/(auth)/login/actions";

// Clears this device's cached pages and item copies so the next person on a shared device can't read them offline.
// The outbox is kept: it holds unsynced edits and syncs when the same account signs in again.
function clearLocal() {
  try {
    for (const key of Object.keys(localStorage)) {
      // precached-at too, so the next account's pages are saved for offline right after it signs in.
      if (/^(items:|draft:|focus:|budget|reminded$|precached-at$)/.test(key)) localStorage.removeItem(key);
    }
  } catch {
    // storage blocked: nothing cached to clear
  }
  if ("caches" in window) void caches.keys().then((keys) => keys.forEach((k) => void caches.delete(k)));
}

export function SignOutButton({ className }: { className: string }) {
  return (
    <form action={signOut} onSubmit={clearLocal}>
      <button className={className}>Sign out</button>
    </form>
  );
}
