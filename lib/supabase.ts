import { createClient } from '@supabase/supabase-js'

// ── Browser client (used in all 'use client' pages) ───────────
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Admin client (used in API routes only - bypasses RLS) ─────
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── Helpers ───────────────────────────────────────────────────
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export async function getWallet(userId: string) {
  const { data } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data
}

// Generates codes like B2B-PRJ-4821
export function generateCode(prefix: string) {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${num}`
}
