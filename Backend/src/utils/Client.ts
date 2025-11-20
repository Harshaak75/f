import { createClient } from "@supabase/supabase-js";

// Get these from your Supabase project settings -> API
const supabaseUrl = process.env.SUPABASE_URL!;
// IMPORTANT: This MUST be the Service Role Key, not the public anon key.
// Find it in Project Settings -> API -> "Project API keys"
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create a single, shared Supabase client for your server
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
