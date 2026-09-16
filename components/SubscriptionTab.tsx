'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function SubscriptionTab({ userId, userEmail, userName, userRole }: {
  userId: string
  userEmail: string
  userName: string
  userRole: string
}) {
  const [isPro, setIsPro] = useState(false)
  const [proDate, setProDate] = useState<string | null>(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: profile }, { data: wallet }, { data: subs }] = await Promise.all([
        supabase.from('profiles').select('is_pro, pro_activated_at').eq('id', userId).single(),
        supabase.from('wallets').select('balance').eq('user_id', userId).single(),
        supabase.from('subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      ])
      setIsPro(profile?.is_pro || false)
      setProDate(profile?.pro_activated_at || null)
      setWalletBalance(wallet?.balance || 0)
      setSubscriptions(subs || [])
      setLoading(false)
    }
    load()
  }, [userId])

  async function activatePro() {
    if (walletBalance < 1000) {
      setMsg('❌ Insufficient balance. Please top up your wallet with at least LKR 1,000 first.')
      return
    }
    if (!confirm('Activate Back2Build Pro for LKR 1,000? This will be deducted from your wallet.')) return
    setActivating(true)
    setMsg('')

    const res = await fetch('/api/subscription/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userEmail, userName, userRole })
    })
    const data = await res.json()

    if (data.error) {
      setMsg('❌ ' + data.error)
    } else {
      setMsg('✅ ' + data.message)
      setIsPro(true)
      setProDate(new Date().toISOString())
      setWalletBalance(prev => prev - 1000)
      setSubscriptions(prev => [{
        id: Date.now(),
        amount: 1000,
        payment_method: 'wallet',
        status: 'active',
        activated_by: 'self',
        created_at: new Date().toISOString()
      }, ...prev])
    }
    setActivating(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
      <div style={{ width: '28px', height: '28px', border: '3px solid #1E3A5A', borderTopColor: '#E8622A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {msg && (
        <div style={{ background: msg.includes('❌') ? '#7F1D1D' : '#052e16', border: `1px solid ${msg.includes('❌') ? '#991B1B' : '#166534'}`, color: msg.includes('❌') ? '#F87171' : '#4ADE80', padding: '12px 16px', borderRadius: '8px' }}>
          {msg}
        </div>
      )}

      {/* Current Plan */}
      <div style={{ background: '#111E2E', border: `1px solid ${isPro ? '#7C2D12' : '#1E3A5A'}`, borderRadius: '10px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Your Plan</h2>
          <span style={{ padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700', background: isPro ? '#431407' : '#1E3A5A', color: isPro ? '#FB923C' : '#64748B', border: `1px solid ${isPro ? '#7C2D12' : '#334155'}` }}>
            {isPro ? '⚡ PRO' : 'FREE'}
          </span>
        </div>

        {isPro ? (
          <div>
            <p style={{ color: '#4ADE80', fontSize: '14px', marginBottom: '8px' }}>
              ✅ You have lifetime Pro access!
            </p>
            {proDate && (
              <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '14px' }}>
                Activated on {new Date(proDate).toLocaleDateString()}
              </p>
            )}
            <button
              onClick={async () => {
                if (!confirm('Cancel your Pro subscription? You will lose access to Bass AI and bidding features immediately.')) return
                const { error } = await supabase
                  .from('profiles')
                  .update({ is_pro: false, pro_activated_at: null })
                  .eq('id', userId)
                if (error) {
                  setMsg('❌ Failed to cancel subscription')
                } else {
                  setIsPro(false)
                  setProDate(null)
                  setMsg('✅ Subscription cancelled. Pro features have been removed.')
                }
              }}
              style={{ background: 'none', border: '1px solid #7F1D1D', color: '#F87171', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}
            >
              Cancel Subscription
            </button>
          </div>
        ) : (
          <div>
            <p style={{ color: '#94A3B8', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
              Upgrade to Pro for lifetime access to all premium features for a one-time payment of LKR 1,000.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748B' }}>Wallet Balance:</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: walletBalance >= 1000 ? '#4ADE80' : '#F87171' }}>
                LKR {walletBalance.toLocaleString()}
              </span>
              {walletBalance < 1000 && (
                <span style={{ fontSize: '12px', color: '#F87171' }}>— Need LKR {(1000 - walletBalance).toLocaleString()} more</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pro Features */}
      <div style={{ background: '#111E2E', border: '1px solid #1E3A5A', borderRadius: '10px', padding: '24px' }}>
        <h3 style={{ fontWeight: '600', marginBottom: '16px', fontSize: '16px' }}>
          {isPro ? '✅ Your Pro Features' : '🔒 Pro Features — LKR 1,000 one-time'}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { icon: '🤖', label: 'Bass AI Construction Assistant', desc: 'Full access to AI-powered construction guidance' },
            { icon: '📋', label: 'Bidding Projects', desc: 'Create and apply to bidding type projects' },
            { icon: '⚡', label: 'Lifetime Access', desc: 'One payment, access forever — no monthly fees' },
            { icon: '🎯', label: 'Priority Support', desc: 'Get faster responses from our team' },
          ].map(feature => (
            <div key={feature.label} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', background: '#0D1B2E', borderRadius: '8px', border: '1px solid #1E3A5A' }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>{feature.icon}</span>
              <div>
                <div style={{ fontWeight: '600', fontSize: '13px', color: isPro ? '#4ADE80' : '#E2E8F0' }}>{feature.label}</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{feature.desc}</div>
              </div>
              {isPro && <span style={{ marginLeft: 'auto', color: '#4ADE80', fontSize: '16px', flexShrink: 0 }}>✓</span>}
            </div>
          ))}
        </div>

        {!isPro && (
          <button
            onClick={activatePro}
            disabled={activating}
            style={{ marginTop: '20px', width: '100%', padding: '14px', background: '#E8622A', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '700', cursor: activating ? 'not-allowed' : 'pointer', opacity: activating ? 0.7 : 1 }}
          >
            {activating ? 'Processing...' : '⚡ Upgrade to Pro — LKR 1,000'}
          </button>
        )}
      </div>

      {/* Payment History */}
      <div style={{ background: '#111E2E', border: '1px solid #1E3A5A', borderRadius: '10px', padding: '24px' }}>
        <h3 style={{ fontWeight: '600', marginBottom: '16px', fontSize: '16px' }}>Payment History</h3>
        {subscriptions.length === 0 ? (
          <p style={{ color: '#64748B', fontSize: '13px' }}>No payments yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {subscriptions.map((sub, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#0D1B2E', borderRadius: '8px', border: '1px solid #1E3A5A' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>Back2Build Pro — Lifetime</div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    {new Date(sub.created_at).toLocaleDateString()} · via {sub.payment_method}
                    {sub.activated_by === 'admin' ? ' · Admin activated' : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#4ADE80' }}>LKR {sub.amount?.toLocaleString()}</div>
                  <div style={{ fontSize: '10px', background: '#052e16', color: '#4ADE80', border: '1px solid #166534', padding: '1px 7px', borderRadius: '10px', marginTop: '3px', display: 'inline-block' }}>{sub.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}