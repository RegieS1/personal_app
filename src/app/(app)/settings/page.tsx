import { Settings } from "@/components/Settings";
import { getClaims } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const claims = await getClaims();
  return <Settings email={claims?.email} />;
}
