// Escape hatch for tables not yet present in the generated Database types.
// Once Lovable regenerates src/integrations/supabase/types.ts to include the
// Milestone 1 tables, imports of `db` can be swapped back to `supabase`.
import { supabase } from "./client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;
