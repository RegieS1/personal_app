import { LazyCommandPalette } from "@/components/LazyCommandPalette";
import { SearchButton } from "@/components/SearchButton";
import { FocusTimer } from "@/components/FocusTimer";
import { Reminders } from "@/components/Reminders";
import { SignOutButton } from "@/components/SignOutButton";
import { MobileNav } from "./MobileNav";
import { NavLinks } from "./NavLinks";

const Logo = () => (
  <span className="grid size-8 place-items-center rounded-xl bg-linear-to-br from-accent to-accent-2 text-sm font-bold text-white shadow-lg shadow-accent/30" aria-hidden>B</span>
);

export function AppShell({ email, children }: { email?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-border bg-surface/70 p-4 backdrop-blur-xl lg:flex">
        <div>
          <div className="mb-4 flex items-center gap-3 px-3">
            <Logo />
            <p className="text-lg font-semibold tracking-tight">Be Positive</p>
          </div>
          <SearchButton className="mb-4 flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm text-muted transition hover:border-accent/60 hover:text-foreground">
            Search <kbd className="ml-auto rounded border border-border px-1.5 text-xs">Ctrl K</kbd>
          </SearchButton>
          <NavLinks className="flex flex-col gap-1" itemClassName="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition" />
        </div>
        <div className="space-y-1 px-3 text-sm">
          <p className="truncate text-muted">{email}</p>
          <SignOutButton className="text-muted underline hover:text-foreground" />
        </div>
      </aside>

      <main className="mx-auto w-full max-w-3xl flex-1 p-4 pb-24 lg:p-10 lg:pb-10 xl:max-w-5xl">
        {/* Mobile header: brand + search (account actions live in Settings) */}
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-semibold tracking-tight">Be Positive</span>
          </div>
          <SearchButton className="grid size-11 place-items-center rounded-lg text-muted hover:bg-border/50 hover:text-foreground">{null}</SearchButton>
        </div>
        {children}
      </main>

      <FocusTimer />
      <MobileNav />
      <LazyCommandPalette />
      <Reminders />
    </div>
  );
}
