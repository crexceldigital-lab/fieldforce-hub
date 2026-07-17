// Re-export the Supabase client as `db` for feature services that read/write
// tables. Keeps call sites terse (`db.from("territories")`) while still
// pointing at the auto-generated typed client.
export { supabase as db } from "@/integrations/supabase/client";
