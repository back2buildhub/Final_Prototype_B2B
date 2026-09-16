'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { S } from '@/lib/data'
import SubscriptionTab from '@/components/SubscriptionTab'
import { calculateConstructorRating, getRatingColor, getRatingLabel } from '@/lib/rating'

export default function ConstructorProfile() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [msg, setMsg] = useState('')
  const [activeTab, setActiveTab] = useState<'info' | 'verification' | 'withdraw' | 'transactions' | 'subscription'>('info')
  const [form, setForm] = useState({ full_name: '', city: '', phone: '', bio: '', experience_years: 0 })
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [receipt, setReceipt] = useState<any>(null)
  const receiptRef = useRef<any>(null)
  const [ratings, setRatings] = useState<any[]>([])
  const [verificationDoc, setVerificationDoc] = useState<File | null>(null)
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [constructorRating, setConstructorRating] = useState(0)
  const verDocRef = useRef<any>(null)
  const profileImgRef = useRef<any>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUser(user)

    const [{ data: prof }, { data: w }, { data: txns }] = await Promise.all
    ([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('wallets').select('*').eq('user_id', user.id).single(),
      supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    ])

    const { data: ratingData } = await supabase
    .from('constructor_ratings')
    .select('rating')
    .eq('constructor_id', user.id)

setRatings(ratingData || [])
const ratingValues = (ratingData || []).map((r: any) => r.rating)
setConstructorRating(calculateConstructorRating(ratingValues, prof?.is_verified || false))

    setProfile(prof)
    setWallet(w)
    setTransactions(txns || [])
    if (prof) setForm({ full_name: prof.full_name, city: prof.city || '', phone: prof.phone || '', bio: prof.bio || '', experience_years: prof.experience_years || 0 })
    setLoading(false)
  }

  function showMsg(text: string) { setMsg(text); setTimeout(() => setMsg(''), 5000) }

    async function uploadProfileImage() {
    if (!profileImage || !user) return
    setUploadingImg(true)
    const path = `${user.id}/profile.${profileImage.name.split('.').pop()}`
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(path, profileImage, { upsert: true })
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('profile-images').getPublicUrl(data.path)
      await supabase.from('profiles').update({ profile_image_url: urlData.publicUrl }).eq('id', user.id)
      setProfile((prev: any) => ({ ...prev, profile_image_url: urlData.publicUrl }))
      showMsg('✅ Profile image updated!')
    } else {
      showMsg('❌ Failed to upload image')
    }
    setUploadingImg(false)
    setProfileImage(null)
  }

  async function uploadVerificationDoc() {
    if (!verificationDoc || !user) return
    setUploadingDoc(true)
    const path = `${user.id}/verification.${verificationDoc.name.split('.').pop()}`
    const { data, error } = await supabase.storage
      .from('verification-docs')
      .upload(path, verificationDoc, { upsert: true })
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('verification-docs').getPublicUrl(data.path)
      await supabase.from('profiles').update({
        verification_doc_url: urlData.publicUrl,
        verification_status: 'pending'
      }).eq('id', user.id)
      setProfile((prev: any) => ({ ...prev, verification_status: 'pending', verification_doc_url: urlData.publicUrl }))
      showMsg('✅ Verification document submitted! Admin will review shortly.')
    } else {
      showMsg('❌ Failed to upload document')
    }
    setUploadingDoc(false)
    setVerificationDoc(null)
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      city: form.city,
      phone: form.phone,
      bio: form.bio,
      experience_years: form.experience_years,
    }).eq('id', user.id)
    if (error) showMsg('❌ Save failed: ' + error.message)
    else showMsg('✅ Profile updated successfully!')
    setSaving(false)
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !withdrawAmount || !bankName || !accountNo) return
    setWithdrawing(true)

    const res = await fetch('/api/wallet/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        constructorId: user.id,
        amount: withdrawAmount,
        constructorName: profile?.full_name,
        bankDetails: `${bankName} — Account: ${accountNo}`
      })
    })
    const data = await res.json()

    if (data.error) {
      showMsg('❌ ' + data.error)
    } else {
      setReceipt(data.receipt)
      setWallet((prev: any) => ({ ...prev, balance: data.receipt.remainingBalance }))
      setWithdrawAmount('')
      setBankName('')
      setAccountNo('')
      loadData()
    }
    setWithdrawing(false)
  }

  function printReceipt() {
    const printContent = receiptRef.current?.innerHTML
    if (!printContent) return
    const win = window.open('', '_blank', 'width=500,height=700')
    if (!win) return
    win.document.write(`
      <html><head><title>Back2Build Withdrawal Receipt</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 40px; color: #1a1a1a; background: #fff; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #E8622A; padding-bottom: 20px; }
        .logo { font-size: 28px; font-weight: 700; color: #E8622A; }
        .title { font-size: 16px; color: #666; margin-top: 4px; }
        .receipt-code { font-size: 13px; color: #999; margin-top: 8px; }
        .amount-box { background: #f0f9f0; border: 2px solid #166534; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }
        .amount-label { font-size: 13px; color: #666; margin-bottom: 4px; }
        .amount-value { font-size: 36px; font-weight: 700; color: #166534; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        td { padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; }
        td:first-child { color: #666; }
        td:last-child { font-weight: 500; text-align: right; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
        .status { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 13px; }
      </style></head>
      <body>${printContent}</body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  const tabs = [
    { key: 'info', label: '👤 Personal Info' },
    { key: 'verification', label: '🏅 Verification & Rating' },
    { key: 'withdraw', label: '💸 Withdraw' },
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

      {/* Wallet card */}
      <div style={{ ...S.cardDark, borderLeft: '3px solid #4ADE80', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Available Balance</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#4ADE80' }}>LKR {wallet?.balance?.toLocaleString() || '0'}</div>
            <p style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>Ready to withdraw</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <button onClick={() => setActiveTab('withdraw')} style={{ ...S.btnSuccess, padding: '12px 24px', fontSize: '15px' }}>
              💸 Withdraw Money
            </button>
          </div>
        </div>
      </div>

      {msg && <div style={{ ...(msg.includes('❌') ? S.alertError : S.alertSuccess), marginBottom: '16px' }}>{msg}</div>}

      {/* Receipt modal */}
      {receipt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '0', maxWidth: '480px', width: '100%', overflow: 'hidden' }}>
            {/* Receipt content for printing */}
            <div ref={receiptRef}>
              <div className="header" style={{ textAlign: 'center', padding: '28px 28px 20px', borderBottom: '2px solid #E8622A' }}>
                <div className="logo" style={{ fontSize: '26px', fontWeight: '700', color: '#E8622A' }}>Back2Build</div>
                <div className="title" style={{ fontSize: '15px', color: '#666', marginTop: '4px' }}>Withdrawal Receipt</div>
                <div className="receipt-code" style={{ fontSize: '12px', color: '#999', marginTop: '6px' }}>{receipt.receiptCode}</div>
              </div>

              <div style={{ padding: '24px 28px' }}>
                <div className="amount-box" style={{ background: '#f0f9f0', border: '2px solid #166534', borderRadius: '10px', padding: '20px', textAlign: 'center', margin: '0 0 24px' }}>
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Amount Withdrawn</div>
                  <div style={{ fontSize: '36px', fontWeight: '700', color: '#166534' }}>LKR {receipt.withdrawAmount?.toLocaleString()}</div>
                  <span className="status" style={{ display: 'inline-block', background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '20px', fontWeight: '600', fontSize: '13px', marginTop: '8px' }}>
                    ✓ {receipt.status}
                  </span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  {[
                    ['Receipt Code', receipt.receiptCode],
                    ['Transaction Code', receipt.txCode],
                    ['Constructor Name', receipt.constructorName],
                    ['Bank Details', receipt.bankDetails],
                    ['Remaining Balance', `LKR ${receipt.remainingBalance?.toLocaleString()}`],
                    ['Date', receipt.date],
                    ['Time', receipt.time],
                    ['Platform', 'Back2Build — Construction Marketplace'],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ padding: '8px 0', borderBottom: '1px solid #eee', color: '#666', fontSize: '13px' }}>{k}</td>
                      <td style={{ padding: '8px 0', borderBottom: '1px solid #eee', fontWeight: '500', textAlign: 'right', fontSize: '13px', color: '#1a1a1a' }}>{v}</td>
                    </tr>
                  ))}
                </table>

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#999', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                  <p>This is an official Back2Build withdrawal receipt.</p>
                  <p style={{ marginTop: '4px' }}>Thank you for building with us!</p>
                </div>
              </div>
            </div>

            {/* Action buttons - these don't print */}
            <div style={{ padding: '16px 28px', borderTop: '1px solid #eee', display: 'flex', gap: '10px', background: '#f9fafb' }}>
              <button onClick={printReceipt} style={{ ...S.btnPrimary, flex: 1, justifyContent: 'center', padding: '12px', background: '#E8622A', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
                🖨️ Print Receipt
              </button>
              <button onClick={() => setReceipt(null)} style={{ ...S.btnGhost, flex: 1, justifyContent: 'center', padding: '12px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
              <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required />
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
              <input value="Constructor" disabled style={{ opacity: 0.5 }} />
            </div>
            <button type="submit" style={{ ...S.btnPrimary, justifyContent: 'center', width: '100%', padding: '12px' }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Verification and Rating Tab */}
      {activeTab === 'verification' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Rating Card */}
          <div style={{ ...S.card, textAlign: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Your Rating</h2>
            <div style={{ fontSize: '64px', fontWeight: '700', color: getRatingColor(constructorRating), marginBottom: '8px' }}>
              {constructorRating}%
            </div>
            <div style={{ fontSize: '16px', color: getRatingColor(constructorRating), marginBottom: '16px' }}>
              {getRatingLabel(constructorRating)}
            </div>
            <div style={{ background: '#1E3A5A', borderRadius: '4px', height: '10px', overflow: 'hidden', marginBottom: '12px', maxWidth: '300px', margin: '0 auto 16px' }}>
              <div style={{ height: '100%', background: getRatingColor(constructorRating), borderRadius: '4px', width: `${constructorRating}%`, transition: 'width 0.3s' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxWidth: '300px', margin: '0 auto' }}>
              <div style={{ background: '#0D1B2E', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>Owner Reviews</div>
                <div style={{ fontSize: '20px', fontWeight: '700' }}>{ratings.length}</div>
              </div>
              <div style={{ background: '#0D1B2E', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>Verification</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: profile?.is_verified ? '#4ADE80' : '#64748B' }}>
                  {profile?.is_verified ? '✓ Verified' : 'Unverified'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '14px', lineHeight: '1.6' }}>
              Rating = (Avg Owner Ratings × 0.8) + (Verified × 20)
            </div>
          </div>

          {/* Profile Image Upload */}
          <div style={S.card}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Profile Image</h2>
            {profile?.profile_image_url && (
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <img src={profile.profile_image_url} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #E8622A' }} />
              </div>
            )}
            <div onClick={() => profileImgRef.current?.click()}
              style={{ border: '2px dashed #1E3A5A', borderRadius: '8px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#E8622A')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E3A5A')}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📸</div>
              <p style={{ color: '#64748B', fontSize: '13px' }}>Click to upload profile photo</p>
              <p style={{ color: '#475569', fontSize: '11px', marginTop: '4px' }}>JPG or PNG, max 2MB</p>
            </div>
            <input ref={profileImgRef} type="file" accept="image/*" onChange={e => setProfileImage(e.target.files?.[0] || null)} style={{ display: 'none' }} />
            {profileImage && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#94A3B8', flex: 1 }}>📎 {profileImage.name}</span>
                <button onClick={uploadProfileImage} disabled={uploadingImg}
                  style={{ ...S.btnPrimary, padding: '8px 16px', fontSize: '13px' }}>
                  {uploadingImg ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            )}
          </div>

          {/* Bio and Experience */}
          <div style={S.card}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Professional Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={S.label}>Years of Experience</label>
                <input type="number" value={form.experience_years || ''} onChange={e => setForm((p: any) => ({ ...p, experience_years: e.target.value }))} placeholder="e.g. 5" />
              </div>
              <div>
                <label style={S.label}>Bio / About You</label>
                <textarea value={form.bio || ''} onChange={e => setForm((p: any) => ({ ...p, bio: e.target.value }))}
                  placeholder="Describe your experience, specializations, and what makes you stand out..."
                  style={{ minHeight: '80px', resize: 'vertical' }} />
              </div>
              <button onClick={async () => {
                if (!user) return
                setSaving(true)
                const { error } = await supabase.from('profiles').update({
                  bio: form.bio,
                  experience_years: form.experience_years,
                }).eq('id', user.id)
                if (error) showMsg('❌ Save failed: ' + error.message)
                else showMsg('✅ Details saved!')
                setSaving(false)
              }} disabled={saving} style={{ ...S.btnPrimary, justifyContent: 'center', padding: '10px' }}>
                {saving ? 'Saving...' : 'Save Details'}
              </button>
            </div>
          </div>

          {/* Verification Document Upload */}
          <div style={{ ...S.card, borderColor: profile?.is_verified ? '#166534' : profile?.verification_status === 'pending' ? '#78350F' : '#1E3A5A' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>CIDA Certification</h2>
              {profile?.is_verified && <span style={{ background: '#052e16', color: '#4ADE80', border: '1px solid #166534', padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>✓ Verified — +20 points</span>}
              {profile?.verification_status === 'pending' && <span style={{ background: '#422006', color: '#FCD34D', border: '1px solid #78350F', padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>⏳ Pending Review</span>}
              {profile?.verification_status === 'rejected' && <span style={{ background: '#7F1D1D', color: '#F87171', border: '1px solid #991B1B', padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600' }}>✕ Rejected</span>}
            </div>
            <p style={{ color: '#64748B', fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
              Upload your CIDA registration certificate or any professional construction certification. Once verified by admin you receive +20 rating points.
            </p>
            {!profile?.is_verified && (
              <>
                <div onClick={() => verDocRef.current?.click()}
                  style={{ border: '2px dashed #1E3A5A', borderRadius: '8px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#E8622A')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E3A5A')}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📄</div>
                  <p style={{ color: '#64748B', fontSize: '13px' }}>Click to upload certification document</p>
                  <p style={{ color: '#475569', fontSize: '11px', marginTop: '4px' }}>PDF or image, max 5MB</p>
                </div>
                <input ref={verDocRef} type="file" accept=".pdf,image/*" onChange={e => setVerificationDoc(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                {verificationDoc && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#94A3B8', flex: 1 }}>📎 {verificationDoc.name}</span>
                    <button onClick={uploadVerificationDoc} disabled={uploadingDoc}
                      style={{ ...S.btnPrimary, padding: '8px 16px', fontSize: '13px' }}>
                      {uploadingDoc ? 'Uploading...' : 'Submit for Review'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      )}  

      {/* Withdraw Tab */}
      {activeTab === 'withdraw' && (
        <div style={S.card}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>Withdraw Money</h2>
          <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '20px', lineHeight: '1.6' }}>
            Withdraw your earnings to your bank account. Minimum withdrawal is LKR 1,000.
            A receipt will be generated for your records.
          </p>

          {/* Balance info */}
          <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: '8px', padding: '14px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#4ADE80', opacity: 0.7, marginBottom: '3px' }}>Available to Withdraw</div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#4ADE80' }}>LKR {wallet?.balance?.toLocaleString() || '0'}</div>
            </div>
            <div style={{ fontSize: '28px' }}>💰</div>
          </div>

          <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={S.label}>Withdrawal Amount (LKR) *</label>
              <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="e.g. 25000" required min="1000" max={wallet?.balance || 0} />
              <p style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>Minimum: LKR 1,000 · Maximum: LKR {wallet?.balance?.toLocaleString() || '0'}</p>
            </div>
            <div>
              <label style={S.label}>Bank Name *</label>
              <select value={bankName} onChange={e => setBankName(e.target.value)} required>
                <option value="">Select your bank...</option>
                {['Commercial Bank', 'Sampath Bank', 'HNB', 'BOC', 'Peoples Bank', 'NTB', 'DFCC Bank', 'Seylan Bank', 'NSB', 'Other'].map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>Account Number *</label>
              <input value={accountNo} onChange={e => setAccountNo(e.target.value)} placeholder="e.g. 1234567890" required />
            </div>

            <div style={{ background: '#0D1B2E', border: '1px solid #1E3A5A', borderRadius: '8px', padding: '12px' }}>
              <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.6' }}>
                🔒 <strong style={{ color: '#94A3B8' }}>Demo Mode:</strong> No real bank transfer happens. This simulates the withdrawal process and generates a receipt for demonstration purposes.
              </p>
            </div>

            <button type="submit" style={{ ...S.btnSuccess, justifyContent: 'center', width: '100%', padding: '14px', fontSize: '15px' }} disabled={withdrawing}>
              {withdrawing ? 'Processing...' : '💸 Withdraw & Get Receipt'}
            </button>
          </form>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div style={S.card}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Transaction History</h2>
          {transactions.length === 0 ? (
            <p style={{ color: '#64748B', textAlign: 'center', padding: '30px 0' }}>No transactions yet.</p>
          ) : transactions.map(t => {
            const isIncoming = t.transaction_type === 'payment_release'
            return (
              <div key={t.id} style={{ padding: '12px 0', borderBottom: '1px solid #1E3A5A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#E2E8F0', marginBottom: '2px' }}>
                    {t.description || t.transaction_type}
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>
                    {t.transaction_code} · {new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: isIncoming ? '#4ADE80' : '#F87171' }}>
                  {isIncoming ? '+' : '-'}LKR {t.amount?.toLocaleString()}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {/* Subscription Tab */}
      {activeTab === 'subscription' && user && (
        <SubscriptionTab
          userId={user.id}
          userEmail={user.email || ''}
          userName={form.full_name}
          userRole="constructor"
        />
      )}
    </div>
  )
}
