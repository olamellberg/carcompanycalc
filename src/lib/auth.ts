import { supabase } from './supabase'
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js'

export type AuthState = {
  user: User | null
  session: Session | null
  loading: boolean
}

// Dynamisk redirect-URL som fungerar både lokalt och på GitHub Pages
const REDIRECT_URL = `${window.location.origin}${import.meta.env.BASE_URL}`

export async function signInWithMagicLink(email: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: REDIRECT_URL,
    },
  })
  return { error: error ? new Error(error.message) : null }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

export async function getSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange(callback)
}
