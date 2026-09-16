'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { S } from '@/lib/data'
import SubscriptionTab from '@/components/SubscriptionTab'

export default function OwnerProfile() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const [ongoingProjects, setOngoingProjects] = useState<any[]>([])
  const [escrows, setEscrows] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [activeTab, setActiveTab] = useState<'info' | 'escrow' | 'transactions' | 'subscription'>('info')
  const [topupProject, setTopupProject] = useState('')
  const [topupAmount, setTopupAmount] = useState('')
  const [topupLoading, setTopupLoading] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [form, setForm] = useState({ full_name: '', city: '', phone: '' })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUser(user)

    const [{ data: prof }, { data: w }, { data: proj }, { data: txns }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('wallets').select('*').eq('user_id', user.id).single(),
      supabase.from('projects').select('*').eq('owner_id', user.id).eq('status', 'ongoing'),
      supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    ])

    setProfile(prof)
    setWallet(w)
    setOngoingProjects(proj || [])
    setTransactions(txns || [])
    if (prof) setForm({ full_name: prof.full_name, city: prof.city || '', phone: prof.phone || '' })

    // Load escrows for ongoing projects
    if (proj && proj.length > 0) {
      const escrowMap: Record<string, any> = {}
      await Promise.all(proj.map(async (p: any) => {
        const { data: esc } = await supabase.from('project_escrows').select('*').eq('project_id', p.id).single()
        if (esc) escrowMap[p.id] = esc
      }))
      setEscrows(escrowMap)
    }
    setLoading(false)
  }

  function showMsg(text: string) { setMsg(text); setTimeout(() => setMsg(''), 4000) }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      city: form.city,
      phone: form.phone,
    }).eq('id', user.id)
    if (error) showMsg('❌ Save failed: ' + error.message)
    else showMsg('✅ Profile updated successfully!')
    setSaving(false)
  }

  async function topUpEscrow(e: React.FormEvent) {
    e.preventDefault()
    if (!topupProject || !topupAmount || !user) return
    setTopupLoading(true)

    const project = ongoingProjects.find(p => p.id === topupProject)
    const escrow = escrows[topupProject]
    if (!escrow) { showMsg('❌ Escrow not found for this project'); setTopupLoading(false); return }

    const res = await fetch('/api/escrow/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerId: user.id,
        projectId: topupProject,
        escrowId: escrow.id,
        amount: topupAmount,
        projectTitle: project?.title
      })
    })
    const data = await res.json()
    if (data.error) { showMsg('❌ ' + data.error) }
    else {
      showMsg(`✅ LKR ${parseFloat(topupAmount).toLocaleString()} added to escrow! New balance: LKR ${data.newEscrowBalance?.toLocaleString()}`)
      setTopupAmount('')
      setTopupProject('')
      loadData()
    }
    setTopupLoading(false)
  }

  function txColor(type: string) {
    if (type === 'wallet_topup') return '#4ADE80'
    if (type === 'move_to_escrow') return '#F87171'
    return '#94A3B8'
  }
  function txSign(type: string) { return type === 'wallet_topup' ? '+' : '-' }

  const tabs = [
    { key: 'info', label: '👤 Personal Info' },
    { key: 'escrow', label: '🔒 Add to Escrow' },
    { key: 'transactions', label: '📊 Transactions' },
    { key: 'subscription', label: '⚡ Subscription' },
  ]

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}><div style={{ width: '32px', height: '32px', border: '3px solid #1E3A5A', borderTopColor: '#E8622A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /></div>

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>My Profile</h1>
        <p style={{ color: '#64748B', fontSize: '14px', marginTop: '2px' }}>{user?.email}</p>
      </div>

      {/* Wallet balance card */}
      <div style={{ ...S.cardDark, borderLeft: '3px solid #4ADE80', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Wallet Balance</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#4ADE80' }}>LKR {wallet?.balance?.toLocaleString() || '0'}</div>
        </div>
        <button onClick={async () => {
          const res = await fetch('/api/wallet/topup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id }) })
          const data = await res.json()
          if (data.success) { setWallet((prev: any) => ({ ...prev, balance: data.newBalance })); showMsg('✅ LKR 50,000 added!') }
        }} style={{ ...S.btnGhost, padding: '10px 18px' }}>
          + Top Up LKR 50k
        </button>
      </div>

      {msg && <div style={{ ...(msg.includes('❌') ? S.alertError : S.alertSuccess), marginBottom: '16px' }}>{msg}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#0D1B2E', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            style={{ ...activeTab === t.key ? S.btnPrimary : S.btnGhost, padding: '8px 16px', fontSize: '13px' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Personal Info Tab */}
      {activeTab === 'info' && (
        <div style={S.card}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>Personal Information</h2>
          <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={S.label}>Full Name</label>
              <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Your full name" required />
            </div>
            <div>
              <label style={S.label}>Email Address</label>
              <input value={user?.email || ''} disabled style={{ opacity: 0.5 }} />
              <p style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>Email cannot be changed in demo mode</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={S.label}>City</label>
                <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="e.g. Kandy" />
              </div>
              <div>
                <label style={S.label}>Phone Number</label>
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="07X XXX XXXX" />
              </div>
            </div>
            <div>
              <label style={S.label}>Role</label>
              <input value="Property Owner" disabled style={{ opacity: 0.5 }} />
            </div>
            <button type="submit" style={{ ...S.btnPrimary, justifyContent: 'center', width: '100%', padding: '12px' }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Escrow Top-Up Tab */}
      {activeTab === 'escrow' && (
        <div style={S.card}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>Add Money to Escrow</h2>
          <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '20px' }}>
            Add more funds to an ongoing project's escrow to ensure the constructor can be paid for their work.
          </p>

          {ongoingProjects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
              <p>No ongoing projects. Escrow is only available for projects with an assigned constructor.</p>
            </div>
          ) : (
            <>
              {/* Ongoing projects escrow status */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#94A3B8' }}>Current Escrow Status</h3>
                {ongoingProjects.map(p => {
                  const esc = escrows[p.id]
                  return (
                    <div key={p.id} style={{ ...S.cardDark, marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px' }}>{p.title}</div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>{p.project_code}</div>
                        </div>
                        <span style={{ background: '#082550', color: '#60A5FA', border: '1px solid #1E3A5A', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>ongoing</span>
                      </div>
                      {esc ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                          {[
                            ['Total Budget', `LKR ${esc.total_amount?.toLocaleString()}`],
                            ['In Escrow', `LKR ${esc.remaining_balance?.toLocaleString()}`],
                            ['Released', `LKR ${esc.released_amount?.toLocaleString()}`],
                          ].map(([k, v]) => (
                            <div key={k} style={{ background: '#0A1628', padding: '8px', borderRadius: '6px' }}>
                              <div style={{ fontSize: '10px', color: '#475569' }}>{k}</div>
                              <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '2px', color: '#E2E8F0' }}>{v}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '12px', color: '#475569' }}>Escrow data loading...</p>
                      )}
                    </div>
                  )
                })}
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #1E3A5A', margin: '20px 0' }} />

              {/* Top-up form */}
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '14px', color: '#94A3B8' }}>Add Funds to Escrow</h3>
              <form onSubmit={topUpEscrow} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={S.label}>Select Project</label>
                  <select value={topupProject} onChange={e => setTopupProject(e.target.value)} required>
                    <option value="">Choose an ongoing project...</option>
                    {ongoingProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.title} — {p.project_code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Amount to Add (LKR)</label>
                  <input type="number" value={topupAmount} onChange={e => setTopupAmount(e.target.value)}
                    placeholder="e.g. 25000" required min="1000" />
                  <p style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                    Your wallet balance: LKR {wallet?.balance?.toLocaleString() || '0'}
                  </p>
                </div>
                <button type="submit" style={{ ...S.btnPrimary, justifyContent: 'center', width: '100%', padding: '12px' }} disabled={topupLoading}>
                  {topupLoading ? 'Processing...' : '🔒 Add to Escrow'}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div style={S.card}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Transaction History</h2>
          {transactions.length === 0 ? (
            <p style={{ color: '#64748B', textAlign: 'center', padding: '30px 0' }}>No transactions yet.</p>
          ) : (
            <div>
              {transactions.map(t => (
                <div key={t.id} style={{ padding: '12px 0', borderBottom: '1px solid #1E3A5A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#E2E8F0', marginBottom: '2px' }}>
                      {t.description || t.transaction_type}
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569' }}>
                      {t.transaction_code} · {new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: txColor(t.transaction_type) }}>
                    {txSign(t.transaction_type)}LKR {t.amount?.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Subscription Tab */}
      {activeTab === 'subscription' && user && (
        <SubscriptionTab
          userId={user.id}
          userEmail={user.email || ''}
          userName={form.full_name}
          userRole="property_owner"
        />
      )}
    </div>
  )
}
