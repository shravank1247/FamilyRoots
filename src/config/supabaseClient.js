// src/config/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// These variables will be pulled from your .env file locally 
// and from Vercel's Environment Variables settings in production.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables are missing!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);