"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_ITEMS } from "@/config/nav";
import { SignOutButton } from "@/components/SignOutButton";
import { isActive, NavIcon } from "./NavLinks";

const MAIN = 4; // bottom bar holds at most 5 tabs: 4 destinations + More
const MORE_ICON = "M5 12h.01 M12 12h.01 M19 12h.01";

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const main = NAV_ITEMS.slice(0, MAIN);
  const more = NAV_ITEMS.slice(MAIN);
  const moreActive = more.some((i) => isActive(pathname, i.href));
  const tab = "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-xs transition";
  const state = (on: boolean) => (on ? "bg-accent/15 font-medium text-foreground" : "text-muted hover:text-foreground");

  return (
    <div className="fixed inset-x-0 bottom-0 lg:hidden">
      {open && (
        <nav className="card mx-2 mb-2 grid grid-cols-3 gap-1 bg-surface p-2 shadow-2xl" aria-label="More sections">
          {more.map(({ href, label, icon }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={isActive(pathname, href) ? "page" : undefined}
              className={`${tab} ${state(isActive(pathname, href))}`}>
              <NavIcon path={icon} />
              {label}
            </Link>
          ))}
          {/* Phones have no sidebar, so sign-out lives here too (also in Settings > Account). */}
          <div className="col-span-3 border-t border-border pt-1">
            <SignOutButton className="min-h-11 w-full rounded-lg text-sm text-red-400 hover:bg-red-500/10" />
          </div>
        </nav>
      )}
      <nav className="flex gap-1 border-t border-border bg-surface/90 p-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur">
        {main.map(({ href, label, icon }) => (
          <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={isActive(pathname, href) ? "page" : undefined}
            className={`${tab} ${state(isActive(pathname, href))}`}>
            <NavIcon path={icon} />
            {label}
          </Link>
        ))}
        <button onClick={() => setOpen(!open)} aria-expanded={open} className={`${tab} ${state(open || moreActive)}`}>
          <NavIcon path={MORE_ICON} />
          More
        </button>
      </nav>
    </div>
  );
}
