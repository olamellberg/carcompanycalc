import { createClient } from '@supabase/supabase-js'

// Supabase configuration - PRODUCTION VALUES
// Updated: 2024-11-30
const SUPABASE_URL = 'https://kdhwwunofelrxdohcajk.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkaHd3dW5vZmVscnhkb2hjYWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MDA3MDcsImV4cCI6MjA3OTk3NjcwN30.iXrpLj4OhaPK6PA_6U-LJfw_WpUCGD3gcILTlLz6HrQ'

console.log('Supabase URL:', SUPABASE_URL)

// Create Supabase client med auth-konfiguration
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Hanterar magic link hash-fragment automatiskt
  },
})

