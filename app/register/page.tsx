'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { saveAccount } from '@/lib/accounts'
import { S } from '@/lib/data'

export default function RegisterPage() {
  const router = useRouter()
  const [role, setRole] = useState('property_owner')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const r = params.get('role')
    if (r === 'constructor' || r === 'property_owner') setRole(r)
  }, [])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError || !data.user) {
      setError(signUpError?.message || 'Registration failed')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: name,
      role,
      city,
    })

    if (profileError) {
      setError('Profile save failed: ' + profileError.message)
      setLoading(false)
      return
    }

    // Save credentials for quick account switching
    saveAccount({ email, password, name, role: role as 'property_owner' | 'constructor' })

    router.push(role === 'constructor' ? '/constructors' : '/owner')
  }

  const roleCard = (value: string, icon: string, label: string, desc: string) => (
    <div onClick={() => setRole(value)} style={{
      padding: '14px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
      border: `2px solid ${role === value ? '#E8622A' : '#1E3A5A'}`,
      background: role === value ? '#2D1A0E' : '#0D1B2E', transition: 'all 0.15s'
    }}>
      <div style={{ fontSize: '20px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontWeight: '600', fontSize: '14px', color: role === value ? '#FB923C' : '#E2E8F0' }}>{label}</div>
      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>{desc}</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '460px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <a href="/" style={{ fontSize: '26px', fontWeight: '700', color: '#E8622A', display: 'block' }}>Back2Build</a>
          <p style={{ color: '#64748B', fontSize: '14px', marginTop: '6px' }}>Create your account</p>
        </div>
        <div style={S.card}>
          {error && <div style={S.alertError}>{error}</div>}
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={S.label}>I am a...</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {roleCard('property_owner', '🏠', 'Property Owner', 'I want to hire constructors')}
                {roleCard('constructor', '🏗️', 'Constructor', 'I want to find projects')}
              </div>
            </div>
            <div>
              <label style={S.label}>Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required />
            </div>
            <div>
              <label style={S.label}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <label style={S.label}>City</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Kandy" />
            </div>
            <div>
              <label style={S.label}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" required />
            </div>
            <div>
              <label style={S.label}>Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required />
            </div>
            <button type="submit" style={{ ...S.btnPrimary, justifyContent: 'center', width: '100%', padding: '12px' }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#64748B' }}>
            Already have an account? <a href="/login" style={{ color: '#E8622A' }}>Sign in</a>
          </p>
        </div>
        <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: '#475569' }}>
          🎓 Demo — starts with LKR 100,000 wallet balance
        </p>
      </div>
    </div>
  )
}
