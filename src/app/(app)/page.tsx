import { Today } from "@/components/Today";
import { createClient } from "@/lib/supabase/server";

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <Today userId={user!.id} />;
}
