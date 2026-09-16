'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminPanel() {
  const [tab, setTab] = useState<'stats' | 'users' | 'subscriptions'>('stats')
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [token, setToken] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setToken(session.access_token)
      await loadStats(session.access_token)
    }
    init()
  }, [])

  async function adminFetch(url: string, options: any = {}) {
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
  }

  async function loadStats(t?: string) {
    const tk = t || token
    setLoading(true)
    const res = await fetch('/api/admin?type=stats', {
      headers: { 'Authorization': `Bearer ${tk}` }
    })
    const data = await res.json()
    if (data.error) { window.location.href = '/'; return }
    setStats(data)
    setLoading(false)
  }

  async function loadUsers() {
    setLoading(true)
    const res = await adminFetch('/api/admin?type=users')
    const data = await res.json()
    setUsers(data.data || [])
    setLoading(false)
  }

  async function loadSubscriptions() {
    setLoading(true)
    const res = await adminFetch('/api/admin?type=subscriptions')
    const data = await res.json()
    setSubscriptions(data.data || [])
    setLoading(false)
  }

  async function activatePro(userId: string) {
    const res = await adminFetch('/api/admin', {
      method: 'POST',
      body: JSON.stringify({ action: 'activate_pro', userId })
    })
    const data = await res.json()
    if (data.success) {
      setMsg('✅ Pro activated!')
      loadUsers()
    } else {
      setMsg('❌ ' + data.error)
    }
    setTimeout(() => setMsg(''), 3000)
  }

  async function deactivatePro(userId: string) {
    const res = await adminFetch('/api/admin', {
      method: 'POST',
      body: JSON.stringify({ action: 'deactivate_pro', userId })
    })
    const data = await res.json()
    if (data.success) {
      setMsg('✅ Pro deactivated!')
      loadUsers()
    } else {
      setMsg('❌ ' + data.error)
    }
    setTimeout(() => setMsg(''), 3000)
  }

  async function deleteUser(userId: string, name: string) {
    if (!confirm(`Delete ${name} permanently? This cannot be undone.`)) return
    const res = await adminFetch('/api/admin', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete_user', userId })
    })
    const data = await res.json()
    if (data.success) {
      setMsg('✅ User deleted!')
      loadUsers()
    } else {
      setMsg('❌ ' + data.error)
    }
    setTimeout(() => setMsg(''), 3000)
  }

  function switchTab(t: 'stats' | 'users' | 'subscriptions') {
    setTab(t)
    if (t === 'users') loadUsers()
    if (t === 'subscriptions') loadSubscriptions()
  }

  const cardStyle: any = { background: '#111E2E', border: '1px solid #1E3A5A', borderRadius: '10px', padding: '20px' }
  const btnPrimary: any = { background: '#E8622A', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }
  const btnDanger: any = { background: '#7F1D1D', color: '#F87171', border: '1px solid #991B1B', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }
  const btnGhost: any = { background: 'transparent', color: '#94A3B8', border: '1px solid #1E3A5A', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }

  return (
    <div style={{ minHeight: '100vh', background: '#0A1628', color: '#E2E8F0', padding: '28px', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#E8622A', marginBottom: '4px' }}>
            🏗️ Back2Build Admin
          </h1>
          <p style={{ color: '#64748B', fontSize: '14px' }}>Manage users, subscriptions, and platform revenue</p>
        </div>
        <a href="/owner" style={{ color: '#64748B', fontSize: '13px', textDecoration: 'none' }}>← Back to App</a>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: '#0D1B2E', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
        {(['stats', 'users', 'subscriptions'] as const).map(t => (
          <button key={t} onClick={() => switchTab(t)}
            style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', background: tab === t ? '#E8622A' : 'transparent', color: tab === t ? '#fff' : '#94A3B8' }}>
            {t === 'stats' ? '📊 Stats' : t === 'users' ? '👥 Users' : '💳 Subscriptions'}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ background: msg.includes('❌') ? '#7F1D1D' : '#052e16', border: `1px solid ${msg.includes('❌') ? '#991B1B' : '#166534'}`, color: msg.includes('❌') ? '#F87171' : '#4ADE80', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
          {msg}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #1E3A5A', borderTopColor: '#E8622A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      )}

      {/* STATS TAB */}
      {tab === 'stats' && !loading && stats && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            {[
              { label: 'Total Revenue', value: `LKR ${stats.totalRevenue?.toLocaleString()}`, color: '#4ADE80' },
              { label: 'Total Users', value: stats.totalUsers, color: '#60A5FA' },
              { label: 'Pro Users', value: stats.proUsers, color: '#FB923C' },
              { label: 'Property Owners', value: stats.owners, color: '#A78BFA' },
              { label: 'Constructors', value: stats.constructors, color: '#F472B6' },
              { label: 'Free Users', value: stats.totalUsers - stats.proUsers, color: '#94A3B8' },
            ].map(stat => (
              <div key={stat.label} style={cardStyle}>
                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>{stat.label}</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            <h3 style={{ fontWeight: '600', marginBottom: '14px' }}>Pro Conversion Rate</h3>
            <div style={{ background: '#1E3A5A', borderRadius: '4px', height: '10px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ height: '100%', background: '#E8622A', borderRadius: '4px', width: `${stats.totalUsers > 0 ? (stats.proUsers / stats.totalUsers * 100).toFixed(0) : 0}%`, transition: 'width 0.3s' }} />
            </div>
            <p style={{ fontSize: '13px', color: '#64748B' }}>
              {stats.totalUsers > 0 ? (stats.proUsers / stats.totalUsers * 100).toFixed(1) : 0}% of users have upgraded to Pro
            </p>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {tab === 'users' && !loading && (
        <div>
          <div style={{ marginBottom: '14px', fontSize: '13px', color: '#64748B' }}>
            {users.length} total users
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {users.map(user => (
              <div key={user.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: user.role === 'constructor' ? '#160E38' : '#2D1A0E', border: `1px solid ${user.role === 'constructor' ? '#4E44B0' : '#7C2D12'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    {user.role === 'constructor' ? '🏗️' : '🏠'}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {user.full_name}
                      {user.is_pro && <span style={{ background: '#431407', color: '#FB923C', border: '1px solid #7C2D12', padding: '1px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: '700' }}>PRO</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                      {user.role === 'property_owner' ? 'Property Owner' : 'Constructor'} · {user.city}
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                      Joined {new Date(user.created_at).toLocaleDateString()}
                      {user.pro_activated_at && ` · Pro since ${new Date(user.pro_activated_at).toLocaleDateString()}`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {user.is_pro ? (
                    <button onClick={() => deactivatePro(user.id)} style={btnGhost}>
                      Deactivate Pro
                    </button>
                  ) : (
                    <button onClick={() => activatePro(user.id)} style={btnPrimary}>
                      Activate Pro
                    </button>
                  )}
                  <button onClick={() => deleteUser(user.id, user.full_name)} style={btnDanger}>
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBSCRIPTIONS TAB */}
      {tab === 'subscriptions' && !loading && (
        <div>
          <div style={{ marginBottom: '14px', fontSize: '13px', color: '#64748B' }}>
            {subscriptions.length} total subscriptions · Total Revenue: LKR {subscriptions.reduce((s, sub) => s + sub.amount, 0).toLocaleString()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {subscriptions.length === 0 && (
              <div style={{ ...cardStyle, textAlign: 'center', padding: '40px', color: '#64748B' }}>
                No subscriptions yet
              </div>
            )}
            {subscriptions.map(sub => (
              <div key={sub.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                    {sub.user_name || 'User'}
                    <span style={{ marginLeft: '8px', fontSize: '11px', color: '#64748B' }}>
                      {sub.user_role === 'property_owner' ? '🏠 Owner' : '🏗️ Constructor'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    {sub.user_email} · {new Date(sub.created_at).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                    via {sub.payment_method} · {sub.activated_by === 'admin' ? '👤 Admin activated' : '💳 Self activated'}
                    {sub.notes && ` · ${sub.notes}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#4ADE80' }}>
                    LKR {sub.amount?.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', background: '#052e16', color: '#4ADE80', border: '1px solid #166534', padding: '2px 8px', borderRadius: '10px', marginTop: '4px', display: 'inline-block' }}>
                    {sub.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}