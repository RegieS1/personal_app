"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/config/nav";

export function NavIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={path} />
    </svg>
  );
}

export const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

export function NavLinks({ className, itemClassName }: { className: string; itemClassName: string }) {
  const pathname = usePathname();
  return (
    <nav className={className}>
      {NAV_ITEMS.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(pathname, href) ? "page" : undefined}
          className={`${itemClassName} ${isActive(pathname, href) ? "bg-accent/15 font-medium text-foreground shadow-[inset_2px_0_0_var(--accent)]" : "text-muted hover:bg-border/50 hover:text-foreground"}`}
        >
          <NavIcon path={icon} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
