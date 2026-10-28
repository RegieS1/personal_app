import { Today } from "@/components/Today";
import { getClaims } from "@/lib/supabase/server";

export default async function TodayPage() {
  const claims = await getClaims();
  return <Today userId={claims!.sub} />;
}
