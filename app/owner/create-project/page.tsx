'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { generateCode, supabase } from '@/lib/supabase'
import { S } from '@/lib/data'


const SERVICES = ['Tiling','Roofing','Painting','Plumbing','Electrical','Renovation','Masonry','Carpentry','Landscaping','Other']

export default function CreateProject() {
  const router = useRouter()
  const [isBidding, setIsBidding] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', service: '', city: '', budget: '', duration: '', description: '' })

  function update(field: string, value: string) { setForm(prev => ({ ...prev, [field]: value })) }

  useEffect(() => {
    async function checkPro() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('is_pro').eq('id', user.id).single()
      setIsPro(profile?.is_pro || false)
    }
    checkPro()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not logged in'); setLoading(false); return }

    const budget = parseFloat(form.budget)
    if (isNaN(budget) || budget <= 0) { setError('Enter a valid budget'); setLoading(false); return }

    const { error: insertError } = await supabase.from('projects').insert({
      project_code: generateCode('B2B-PRJ'),
      owner_id: user.id,
      title: form.title,
      description: form.description,
      service: form.service,
      city: form.city,
      budget,
      duration: form.duration,
      project_type: isBidding ? 'bidding' : 'direct',
      status: 'pending',
    })

    if (insertError) { setError('Failed: ' + insertError.message); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/owner/projects'), 1500)
  }

  if (success) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '48px' }}>✅</div>
      <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#4ADE80' }}>Project Created!</h2>
      <p style={{ color: '#64748B' }}>Redirecting to your projects...</p>
    </div>
  )

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Create a Project</h1>
        <p style={{ color: '#64748B', fontSize: '14px', marginTop: '4px' }}>Post your construction project for constructors to respond to.</p>
      </div>

      <div style={{ ...S.cardSm, marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: '600', fontSize: '15px' }}>{isBidding ? '📢 Bidding Project' : '📋 Direct Project'}</div>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '3px' }}>
            {isBidding ? 'Constructors submit proposals — you choose the best' : 'Constructors respond — you pick one to assign'}
          </p>
        </div>
        {isPro ? (
          <div onClick={() => setIsBidding(!isBidding)} style={{ width: '48px', height: '26px', borderRadius: '13px', cursor: 'pointer', background: isBidding ? '#E8622A' : '#1E3A5A', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: '3px', left: isBidding ? '25px' : '3px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: 'left 0.2s' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#475569' }}>🔒 Pro Only</span>
            <a href="/owner/profile" style={{ fontSize: '11px', color: '#E8622A', textDecoration: 'none' }}>Upgrade →</a>
          </div>
        )}
      </div>

      {error && <div style={S.alertError}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={S.label}>Project Title *</label>
          <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Bathroom Tiling Renovation" required />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={S.label}>Service Needed *</label>
            <select value={form.service} onChange={e => update('service', e.target.value)} required>
              <option value="">Select...</option>
              {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>City *</label>
            <input value={form.city} onChange={e => update('city', e.target.value)} placeholder="e.g. Kandy" required />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={S.label}>Budget (LKR) *</label>
            <input type="number" value={form.budget} onChange={e => update('budget', e.target.value)} placeholder="e.g. 85000" required />
          </div>
          <div>
            <label style={S.label}>Duration *</label>
            <input value={form.duration} onChange={e => update('duration', e.target.value)} placeholder="e.g. 2 weeks" required />
          </div>
        </div>
        <div>
          <label style={S.label}>Description</label>
          <textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="Describe the work, materials, current condition..." style={{ minHeight: '90px', resize: 'vertical' }} />
        </div>
        <button type="submit" style={{ ...S.btnPrimary, justifyContent: 'center', width: '100%', padding: '12px' }} disabled={loading}>
          {loading ? 'Creating...' : isBidding ? '📢 Post Bidding Project' : '📋 Post Direct Project'}
        </button>
      </form>
    </div>
  )
}
