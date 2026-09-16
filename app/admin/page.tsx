'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminPanel() {
  const [tab, setTab] = useState<'stats' | 'users' | 'subscriptions' | 'escrow' | 'verifications'>('stats')
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [confirmations, setConfirmations] = useState<any[]>([])
  const [verifications, setVerifications] = useState<any[]>([])
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

  async function loadConfirmations() {
  setLoading(true)
  const res = await adminFetch('/api/admin?type=confirmations')
  const data = await res.json()
  setConfirmations(data.data || [])
  setLoading(false)
}

  async function loadVerifications() {
  setLoading(true)
  const res = await adminFetch('/api/admin?type=verifications')
  const data = await res.json()
  setVerifications(data.data || [])
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

  async function releasePayment(confirmationId: string, amount: number, constructorId: string, escrowId: string, projectId: string) {
  if (!confirm(`Release LKR ${amount.toLocaleString()} to constructor?`)) return
  const res = await adminFetch('/api/admin', {
    method: 'POST',
    body: JSON.stringify({ action: 'release_payment', confirmationId, amount, constructorId, escrowId, projectId })
  })
  const data = await res.json()
  if (data.success) {
    setMsg('✅ Payment released to constructor!')
    loadConfirmations()
  } else {
    setMsg('❌ ' + data.error)
  }
  setTimeout(() => setMsg(''), 3000)
}

  async function verifyConstructor(userId: string, name: string) {
  if (!confirm(`Verify ${name} as a certified constructor?`)) return
  const res = await adminFetch('/api/admin', {
    method: 'POST',
    body: JSON.stringify({ action: 'verify_constructor', userId })
  })
  const data = await res.json()
  if (data.success) { setMsg('✅ Constructor verified! +20 rating points added.'); loadVerifications() }
  else setMsg('❌ ' + data.error)
  setTimeout(() => setMsg(''), 3000)
}

async function rejectVerification(userId: string, name: string) {
  if (!confirm(`Reject ${name}'s verification request?`)) return
  const res = await adminFetch('/api/admin', {
    method: 'POST',
    body: JSON.stringify({ action: 'reject_verification', userId })
  })
  const data = await res.json()
  if (data.success) { setMsg('✅ Verification rejected.'); loadVerifications() }
  else setMsg('❌ ' + data.error)
  setTimeout(() => setMsg(''), 3000)
}

  function switchTab(t: 'stats' | 'users' | 'subscriptions' | 'escrow' | 'verifications') {
    setTab(t)
    if (t === 'users') loadUsers()
    if (t === 'subscriptions') loadSubscriptions()
    if (t === 'escrow') loadConfirmations()
    if (t === 'verifications') loadVerifications()
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
        {(['stats', 'users', 'subscriptions', 'escrow', 'verifications'] as const).map(t => (
        <button key={t} onClick={() => switchTab(t)}
          style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', background: tab === t ? '#E8622A' : 'transparent', color: tab === t ? '#fff' : '#94A3B8' }}>
          {t === 'stats' ? '📊 Stats' : t === 'users' ? '👥 Users' : t === 'subscriptions' ? '💳 Subscriptions' : t === 'escrow' ? '💰 Escrow' : '🏅 Verifications'}
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

      {/* ESCROW TAB */}
      {tab === 'escrow' && !loading && (
        <div>
          <div style={{ marginBottom: '14px', fontSize: '13px', color: '#64748B' }}>
            {confirmations.filter(c => c.status === 'pending_admin').length} pending payments ·
            {confirmations.filter(c => c.status === 'paid').length} paid
          </div>

          {confirmations.length === 0 && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '40px', color: '#64748B' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>💰</div>
              <p>No payment confirmations yet</p>
            </div>
          )}

          {/* Pending payments first */}
          {confirmations.filter(c => c.status === 'pending_admin').length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#FB923C', marginBottom: '12px' }}>
                ⏳ Pending Admin Release
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {confirmations.filter(c => c.status === 'pending_admin').map(conf => (
                  <div key={conf.id} style={{ ...cardStyle, borderColor: '#7C2D12' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                          Payment Confirmation
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          {new Date(conf.created_at).toLocaleDateString()} · {new Date(conf.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '22px', fontWeight: '700', color: '#FB923C' }}>
                          LKR {conf.amount?.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', background: '#431407', color: '#FB923C', border: '1px solid #7C2D12', padding: '1px 8px', borderRadius: '10px', marginTop: '4px', display: 'inline-block' }}>
                          pending
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ background: '#0A1628', padding: '8px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '3px' }}>From Owner</div>
                        <div style={{ fontSize: '12px', fontWeight: '500' }}>{conf.owner_name || conf.owner_id?.slice(0, 8)}</div>
                      </div>
                      <div style={{ background: '#0A1628', padding: '8px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '3px' }}>To Constructor</div>
                        <div style={{ fontSize: '12px', fontWeight: '500' }}>{conf.constructor_name || conf.constructor_id?.slice(0, 8)}</div>
                      </div>
                    </div>
                    {conf.note && (
                      <p style={{ fontSize: '12px', color: '#94A3B8', padding: '8px', background: '#0A1628', borderRadius: '6px', marginBottom: '12px' }}>
                        Note: {conf.note}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => releasePayment(conf.id, conf.amount, conf.constructor_id, conf.escrow_id, conf.project_id)}
                        style={{ ...btnPrimary, flex: 1, textAlign: 'center' }}
                      >
                        ✓ Release Payment to Constructor
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Reject this payment confirmation?')) return
                          const res = await adminFetch('/api/admin', {
                            method: 'POST',
                            body: JSON.stringify({ action: 'reject_payment', confirmationId: conf.id })
                          })
                          const data = await res.json()
                          if (data.success) { setMsg('✅ Payment rejected'); loadConfirmations() }
                          else setMsg('❌ ' + data.error)
                          setTimeout(() => setMsg(''), 3000)
                        }}
                        style={{ ...btnDanger, padding: '7px 16px' }}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paid payments */}
          {confirmations.filter(c => c.status === 'paid').length > 0 && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#4ADE80', marginBottom: '12px' }}>
                ✅ Released Payments
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {confirmations.filter(c => c.status === 'paid').map(conf => (
                  <div key={conf.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '3px' }}>
                        Payment Released
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {new Date(conf.released_at || conf.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#4ADE80' }}>
                        LKR {conf.amount?.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '10px', background: '#052e16', color: '#4ADE80', border: '1px solid #166534', padding: '1px 7px', borderRadius: '10px', marginTop: '3px', display: 'inline-block' }}>
                        paid
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VERIFICATIONS TAB */}
      {tab === 'verifications' && !loading && (
        <div>
          <div style={{ marginBottom: '14px', fontSize: '13px', color: '#64748B' }}>
            {verifications.filter(v => v.verification_status === 'pending').length} pending ·
            {verifications.filter(v => v.verification_status === 'verified').length} verified ·
            {verifications.filter(v => v.verification_status === 'rejected').length} rejected
          </div>

          {verifications.length === 0 && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '40px', color: '#64748B' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🏅</div>
              <p>No verification requests yet</p>
            </div>
          )}

          {/* Pending verifications */}
          {verifications.filter(v => v.verification_status === 'pending').length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#FB923C', marginBottom: '12px' }}>
                ⏳ Pending Verification Requests
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {verifications.filter(v => v.verification_status === 'pending').map(v => (
                  <div key={v.id} style={{ ...cardStyle, borderColor: '#78350F' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '4px' }}>{v.full_name}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          📍 {v.city} · Submitted {new Date(v.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <span style={{ background: '#422006', color: '#FCD34D', border: '1px solid #78350F', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600' }}>
                        pending
                      </span>
                    </div>
                    {v.verification_doc_url && (
                      <a href={v.verification_doc_url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#082550', color: '#60A5FA', border: '1px solid #1E3A5A', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', textDecoration: 'none', marginBottom: '12px' }}>
                        📄 View Document →
                      </a>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => verifyConstructor(v.id, v.full_name)}
                        style={{ ...btnPrimary, flex: 1, textAlign: 'center' }}>
                        ✓ Verify Constructor
                      </button>
                      <button onClick={() => rejectVerification(v.id, v.full_name)}
                        style={{ ...btnDanger, padding: '7px 16px' }}>
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verified constructors */}
          {verifications.filter(v => v.verification_status === 'verified').length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#4ADE80', marginBottom: '12px' }}>
                ✅ Verified Constructors
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {verifications.filter(v => v.verification_status === 'verified').map(v => (
                  <div key={v.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{v.full_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>📍 {v.city}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ background: '#052e16', color: '#4ADE80', border: '1px solid #166534', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600' }}>
                        ✓ Verified
                      </span>
                      <button onClick={() => rejectVerification(v.id, v.full_name)}
                        style={{ ...btnGhost, padding: '5px 10px', fontSize: '11px' }}>
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected verifications */}
          {verifications.filter(v => v.verification_status === 'rejected').length > 0 && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#F87171', marginBottom: '12px' }}>
                ✕ Rejected Requests
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {verifications.filter(v => v.verification_status === 'rejected').map(v => (
                  <div key={v.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{v.full_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>📍 {v.city}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ background: '#7F1D1D', color: '#F87171', border: '1px solid #991B1B', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600' }}>
                        ✕ Rejected
                      </span>
                      <button onClick={() => verifyConstructor(v.id, v.full_name)}
                        style={{ ...btnGhost, padding: '5px 10px', fontSize: '11px' }}>
                        Approve Instead
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}