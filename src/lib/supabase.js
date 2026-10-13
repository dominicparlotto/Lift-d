import { createClient } from "@supabase/supabase-js";

// Public connection values — safe to ship in the browser. What each user can read or write is enforced
// by Row Level Security in the database, not by keeping these secret.
// Never put a secret / service_role key in this file (or anywhere in the app).
const SUPABASE_URL = "https://hzkoebfqglgcijibuuou.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_6FAVAa--5V0hMKpzKf0Cyg_7G6JzH24";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
