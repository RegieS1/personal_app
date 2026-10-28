import { AppShell } from "@/components/layout/AppShell";
import { getClaims } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const claims = await getClaims();
  return <AppShell email={claims?.email}>{children}</AppShell>;
}
