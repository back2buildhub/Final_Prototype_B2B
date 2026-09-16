'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { S, StatusBadge } from '@/lib/data'

export default function ConstructorDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const [myProjects, setMyProjects] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)

      const [{ data: prof }, { data: w }, { data: p }, { data: t }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('wallets').select('*').eq('user_id', user.id).single(),
        supabase.from('projects').select('*, profiles:owner_id(full_name)').eq('assigned_constructor_id', user.id).order('created_at', { ascending: false }),
        supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
      ])

      setProfile(prof)
      setWallet(w)
      setMyProjects(p || [])
      setTransactions(t || [])
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}><div style={{ width: '32px', height: '32px', border: '3px solid #1E3A5A', borderTopColor: '#E8622A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /></div>

  const ongoing = myProjects.filter(p => p.status === 'ongoing').length
  const completed = myProjects.filter(p => p.status === 'completed').length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Dashboard</h1>
          <p style={{ color: '#64748B', fontSize: '14px', marginTop: '2px' }}>Welcome back, {profile?.full_name}</p>
        </div>
        <a href="/constructors/projects"><button style={{ ...S.btnPrimary, padding: '10px 18px' }}>🔍 Find Projects</button></a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ ...S.cardDark, borderLeft: '3px solid #4ADE80' }}>
          <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Wallet Balance</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#4ADE80' }}>LKR {wallet?.balance?.toLocaleString() || '0'}</div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>Available earnings</div>
        </div>
        {[
          { label: 'Ongoing Projects', value: ongoing, color: '#60A5FA', sub: 'Active now' },
          { label: 'Completed', value: completed, color: '#4ADE80', sub: 'All time' },
          { label: 'City', value: profile?.city || '—', color: '#E2E8F0', sub: 'Your location' },
        ].map((s, i) => (
          <div key={i} style={S.cardDark}>
            <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600' }}>My Projects</h2>
            <a href="/constructors/projects" style={{ color: '#E8622A', fontSize: '13px' }}>View all →</a>
          </div>
          {myProjects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <p style={{ color: '#64748B', fontSize: '13px' }}>No projects yet.</p>
              <a href="/constructors/projects"><button style={{ ...S.btnPrimary, fontSize: '13px', padding: '8px 16px', marginTop: '12px' }}>Browse available projects</button></a>
            </div>
          ) : myProjects.slice(0, 5).map(p => (
            <div key={p.id} style={{ padding: '12px 0', borderBottom: '1px solid #1E3A5A', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '2px' }}>{p.title}</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>{p.city} · LKR {p.budget?.toLocaleString()}</div>
                <div style={{ fontSize: '12px', color: '#475569' }}>Owner: {p.profiles?.full_name}</div>
              </div>
              <StatusBadge status={p.status} />
            </div>
          ))}
        </div>

        <div style={S.card}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Earnings History</h2>
          {transactions.length === 0 ? (
            <p style={{ color: '#64748B', fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>No earnings yet. Complete a project to see your payments here.</p>
          ) : transactions.map(t => (
            <div key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid #1E3A5A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#E2E8F0' }}>{t.description || t.transaction_type}</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>{new Date(t.created_at).toLocaleDateString()}</div>
              </div>
              <div style={{ fontWeight: '600', color: '#4ADE80' }}>+LKR {t.amount?.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
