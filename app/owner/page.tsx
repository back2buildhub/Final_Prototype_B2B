'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { S, StatusBadge } from '@/lib/data'

export default function OwnerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [gigs, setGigs] = useState<any[]>([])
  const [msg, setMsg] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUser(user)

    const [{ data: w }, { data: p }, { data: t }, { data: g }] = await Promise.all([
      supabase.from('wallets').select('*').eq('user_id', user.id).single(),
      supabase.from('projects').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('gigs').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(6),
    ])

    setWallet(w)
    setProjects(p || [])
    setTransactions(t || [])
    setGigs(g || [])
    setLoading(false)
  }

  async function topUp() {
    if (!user) return
    const res = await fetch('/api/wallet/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id })
    })
    const data = await res.json()
    if (data.success) {
      setWallet((prev: any) => ({ ...prev, balance: data.newBalance }))
      setMsg('✅ LKR 50,000 added to your wallet!')
      setTimeout(() => setMsg(''), 3000)
      loadData()
    }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}><div style={{ width: '32px', height: '32px', border: '3px solid #1E3A5A', borderTopColor: '#E8622A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /></div>

  const ongoing = projects.filter(p => p.status === 'ongoing').length
  const pending = projects.filter(p => p.status === 'pending').length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Dashboard</h1>
          <p style={{ color: '#64748B', fontSize: '14px', marginTop: '2px' }}>Welcome back, Property Owner</p>
        </div>
        <a href="/owner/create-project">
          <button style={{ ...S.btnPrimary, padding: '10px 18px' }}>➕ Create Project</button>
        </a>
      </div>

      {msg && <div style={S.alertSuccess}>{msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ ...S.cardDark, borderLeft: '3px solid #E8622A' }}>
          <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Wallet Balance</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#4ADE80' }}>LKR {wallet?.balance?.toLocaleString() || '0'}</div>
          <button onClick={topUp} style={{ ...S.btnGhost, marginTop: '10px', fontSize: '12px', padding: '5px 10px' }}>+ Top Up LKR 50k</button>
        </div>
        {[
          { label: 'Total Projects', value: projects.length, color: '#E2E8F0', sub: 'All time' },
          { label: 'Active Projects', value: ongoing, color: '#60A5FA', sub: 'Currently ongoing' },
          { label: 'Pending Response', value: pending, color: '#FCD34D', sub: 'Awaiting constructors' },
        ].map((s, i) => (
          <div key={i} style={{ ...S.cardDark }}>
            <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Recent Projects</h2>
            <a href="/owner/projects" style={{ color: '#E8622A', fontSize: '13px' }}>View all →</a>
          </div>
          {projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <p style={{ color: '#64748B', fontSize: '13px' }}>No projects yet.</p>
              <a href="/owner/create-project"><button style={{ ...S.btnPrimary, fontSize: '13px', padding: '8px 16px', marginTop: '12px' }}>Create your first project</button></a>
            </div>
          ) : projects.map(p => (
            <div key={p.id} onClick={() => window.location.href = '/owner/projects'} style={{ padding: '12px 0', borderBottom: '1px solid #1E3A5A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#0D1B2E'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '2px' }}>{p.title}</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>{p.city} · LKR {p.budget?.toLocaleString()}</div>
              </div>
              <StatusBadge status={p.status} />
            </div>
          ))}
        </div>

        <div style={S.card}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Transaction History</h2>
          {transactions.length === 0 ? (
            <p style={{ color: '#64748B', fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>No transactions yet.</p>
          ) : transactions.map(t => (
            <div key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid #1E3A5A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#E2E8F0' }}>{t.description || t.transaction_type}</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>{new Date(t.created_at).toLocaleDateString()}</div>
              </div>
              <div style={{ fontWeight: '600', color: t.transaction_type === 'wallet_topup' ? '#4ADE80' : '#F87171' }}>
                {t.transaction_type === 'wallet_topup' ? '+' : '-'}LKR {t.amount?.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Find Constructors — Gig Preview */}
      <div style={{ marginTop: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Find Constructors</h2>
            <p style={{ color: '#64748B', fontSize: '13px', marginTop: '2px' }}>Browse constructor gigs and send a service request</p>
          </div>
          <a href="/owner/gigs" style={{ color: '#E8622A', fontSize: '13px', textDecoration: 'none' }}>Browse all →</a>
        </div>
        {gigs.length === 0 ? (
          <div style={{ background: '#111E2E', border: '1px solid #1E3A5A', borderRadius: '10px', padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🏗️</div>
            <p style={{ color: '#64748B', fontSize: '13px' }}>No constructor gigs available yet. Check back soon!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
            {gigs.map((gig: any) => (
              <div key={gig.id} onClick={() => window.location.href = '/owner/gigs'}
                style={{ background: '#111E2E', border: '1px solid #1E3A5A', borderRadius: '10px', padding: '16px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#E8622A')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E3A5A')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', fontSize: '14px', flex: 1, marginRight: '8px' }}>{gig.title}</span>
                  <span style={{ background: '#431407', color: '#FB923C', border: '1px solid #7C2D12', padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', flexShrink: 0 }}>{gig.service_category}</span>
                </div>
                {gig.cost_per_sqft && (
                  <div style={{ fontSize: '13px', color: '#4ADE80', fontWeight: '600', marginBottom: '6px' }}>
                    LKR {gig.cost_per_sqft?.toLocaleString()} / sq ft
                  </div>
                )}
                {gig.locations?.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    📍 {gig.locations.slice(0, 3).join(', ')}{gig.locations.length > 3 ? ' +' + (gig.locations.length - 3) : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
