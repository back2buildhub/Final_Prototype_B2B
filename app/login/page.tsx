'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { saveAccount } from '@/lib/accounts'
import { S } from '@/lib/data'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError || !data.user) {
      setError(authError?.message || 'Login failed')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles').select('role, full_name').eq('id', data.user.id).single()

    // Save credentials for quick switching
    if (profile) {
      saveAccount({ email, password, name: profile.full_name || email, role: profile.role as 'property_owner' | 'constructor' })
    }

    router.push(profile?.role === 'constructor' ? '/constructor' : '/owner')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <a href="/" style={{ fontSize: '26px', fontWeight: '700', color: '#E8622A', display: 'block' }}>Back2Build</a>
          <p style={{ color: '#64748B', fontSize: '14px', marginTop: '6px' }}>Sign in to your account</p>
        </div>
        <div style={S.card}>
          {error && <div style={S.alertError}>{error}</div>}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={S.label}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <label style={S.label}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required />
            </div>
            <button type="submit" style={{ ...S.btnPrimary, justifyContent: 'center', width: '100%', padding: '12px' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#64748B' }}>
            No account? <a href="/register" style={{ color: '#E8622A' }}>Register here</a>
          </p>
        </div>
      </div>
    </div>
  )
}
