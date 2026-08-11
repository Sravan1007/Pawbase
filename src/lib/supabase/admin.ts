import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Server-only: never import this from a
// Client Component or route that runs in the browser. Used by the public QR
// scan page (src/app/qr/[slug]/page.tsx), which by design must render pet
// emergency info to an unauthenticated visitor with no session.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
