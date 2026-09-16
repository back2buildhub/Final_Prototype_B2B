'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { S } from '@/lib/data'

const SERVICES = ['Tiling', 'Roofing', 'Painting', 'Plumbing', 'Electrical', 'Renovation', 'Masonry', 'Carpentry', 'Landscaping', 'Other']
const SRI_LANKA_CITIES = ['Colombo', 'Kandy', 'Galle', 'Gampaha', 'Kurunegala', 'Matara', 'Negombo', 'Anuradhapura', 'Polonnaruwa', 'Badulla', 'Ratnapura', 'Trincomalee', 'Batticaloa', 'Jaffna', 'Kalmunai', 'Ampara']

export default function ConstructorGigs() {
  const [user, setUser] = useState<any>(null)
  const [gigs, setGigs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [selectedGig, setSelectedGig] = useState<any>(null)
  const [serviceRequests, setServiceRequests] = useState<any[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreview, setPhotoPreview] = useState<string[]>([])
  const fileRef = useRef<any>(null)

  const [form, setForm] = useState({
    title: '',
    service_category: '',
    description: '',
    cost_per_sqft: '',
    expected_duration: '',
  })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)
      await loadGigs(user.id)
    }
    init()
  }, [])

  async function loadGigs(userId: string) {
    const { data: gigsData } = await supabase
      .from('gigs')
      .select('*')
      .eq('constructor_id', userId)
      .order('created_at', { ascending: false })

    if (gigsData && gigsData.length > 0) {
      const withPhotos = await Promise.all(
        gigsData.map(async (g: any) => {
          const { data: photos } = await supabase
            .from('gig_photos')
            .select('photo_url')
            .eq('gig_id', g.id)
          return { ...g, photos: photos || [] }
        })
      )
      setGigs(withPhotos)
    } else {
      setGigs([])
    }
    setLoading(false)
  }

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleLocation(city: string) {
    setSelectedLocations(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    )
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length + photoFiles.length > 5) { setMsg('❌ Maximum 5 photos allowed'); return }
    setPhotoFiles(prev => [...prev, ...files])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => setPhotoPreview(prev => [...prev, ev.target?.result as string])
      reader.readAsDataURL(file)
    })
  }

  function removePhoto(index: number) {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index))
    setPhotoPreview(prev => prev.filter((_, i) => i !== index))
  }

  async function uploadPhotos(gigId: string): Promise<string[]> {
    const urls: string[] = []
    for (const file of photoFiles) {
      const path = `${gigId}/${Date.now()}-${file.name.replace(/\s/g, '_')}`
      const { data, error } = await supabase.storage.from('gig-photos').upload(path, file)
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('gig-photos').getPublicUrl(data.path)
        urls.push(urlData.publicUrl)
      }
    }
    return urls
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (selectedLocations.length === 0) { setMsg('❌ Select at least one location'); return }
    setSaving(true)
    setMsg('')
    const gigCode = 'B2B-GIG-' + Math.floor(1000 + Math.random() * 9000)
    const { data: gig, error } = await supabase.from('gigs').insert({
      gig_code: gigCode,
      constructor_id: user.id,
      title: form.title,
      service_category: form.service_category,
      description: form.description,
      locations: selectedLocations,
      cost_per_sqft: parseFloat(form.cost_per_sqft) || null,
      expected_duration: form.expected_duration,
      is_active: true,
    }).select().single()
    if (error) { setMsg('❌ Failed to create gig: ' + error.message); setSaving(false); return }
    if (photoFiles.length > 0 && gig) {
      const urls = await uploadPhotos(gig.id)
      if (urls.length > 0) {
        await supabase.from('gig_photos').insert(urls.map(url => ({ gig_id: gig.id, photo_url: url })))
      }
    }
    setMsg('✅ Gig created successfully!')
    setForm({ title: '', service_category: '', description: '', cost_per_sqft: '', expected_duration: '' })
    setSelectedLocations([])
    setPhotoFiles([])
    setPhotoPreview([])
    setShowForm(false)
    setSaving(false)
    loadGigs(user.id)
  }

  async function toggleActive(gig: any) {
    await supabase.from('gigs').update({ is_active: !gig.is_active }).eq('id', gig.id)
    setGigs(prev => prev.map(g => g.id === gig.id ? { ...g, is_active: !g.is_active } : g))
  }

  async function selectGig(gig: any) {
    setSelectedGig(gig)
    setLoadingRequests(true)
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('gig_id', gig.id)
      .order('created_at', { ascending: false })
    if (data && data.length > 0) {
      const enriched = await Promise.all(
        data.map(async (p: any) => {
          const { data: profile } = await supabase
            .from('profiles').select('full_name, city').eq('id', p.owner_id).single()
          return { ...p, owner_profile: profile }
        })
      )
      setServiceRequests(enriched)
    } else {
      setServiceRequests([])
    }
    setLoadingRequests(false)
  }

  async function applyToRequest(req: any) {
  if (!user) return
  const { error } = await supabase.from('project_applications').insert({
    project_id: req.id,
    constructor_id: user.id,
    message: 'I am interested in this service request and ready to start.',
    status: 'pending'
  })
  if (error && error.code === '23505') {
    setMsg('✅ You have already applied to this request.')
  } else if (error) {
    setMsg('❌ Error: ' + error.message)
  } else {
    setMsg('✅ Applied successfully! Waiting for owner to assign you.')
  }
}

async function messageRequestOwner(req: any) {
  if (!user) return
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('project_id', req.id)
    .eq('owner_id', req.owner_id)
    .eq('constructor_id', user.id)
    .single()

  let convId = existing?.id

  if (!convId) {
    const { data: created } = await supabase
      .from('conversations')
      .insert({ project_id: req.id, owner_id: req.owner_id, constructor_id: user.id })
      .select('id')
      .single()
    convId = created?.id
  }

  if (convId) window.location.href = `/constructors/messages?conv=${convId}`
}

  async function deleteGig(gigId: string) {
    if (!confirm('Delete this gig? This cannot be undone.')) return
    await supabase.from('gigs').delete().eq('id', gigId)
    setGigs(prev => prev.filter(g => g.id !== gigId))
    if (selectedGig?.id === gigId) { setSelectedGig(null); setServiceRequests([]) }
    setMsg('✅ Gig deleted.')
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}><div style={{ width: '32px', height: '32px', border: '3px solid #1E3A5A', borderTopColor: '#E8622A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /></div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>My Gigs</h1>
          <p style={{ color: '#64748B', fontSize: '14px', marginTop: '2px' }}>Create gigs to showcase your services to property owners</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setMsg('') }} style={{ ...S.btnPrimary, padding: '10px 18px' }}>
          {showForm ? '✕ Cancel' : '+ Create New Gig'}
        </button>
      </div>

      {msg && <div style={{ ...(msg.includes('❌') ? S.alertError : S.alertSuccess), marginBottom: '16px' }}>{msg}</div>}

      {/* Create Gig Form */}
      {showForm && (
        <div style={{ ...S.card, marginBottom: '28px', border: '1px solid #E8622A' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', color: '#E8622A' }}>Create New Gig</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={S.label}>Gig Title *</label>
                <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Professional Tiling Services" required />
              </div>
              <div>
                <label style={S.label}>Service Category *</label>
                <select value={form.service_category} onChange={e => update('service_category', e.target.value)} required>
                  <option value="">Select service...</option>
                  {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={S.label}>Cost per Sq Ft (LKR)</label>
                <input type="number" value={form.cost_per_sqft} onChange={e => update('cost_per_sqft', e.target.value)} placeholder="e.g. 350" />
              </div>
              <div>
                <label style={S.label}>Expected Duration</label>
                <input value={form.expected_duration} onChange={e => update('expected_duration', e.target.value)} placeholder="e.g. 1-2 weeks per 200 sq ft" />
              </div>
            </div>
            <div>
              <label style={S.label}>Description</label>
              <textarea value={form.description} onChange={e => update('description', e.target.value)}
                placeholder="Describe your experience, specializations, quality of work..."
                style={{ minHeight: '100px', resize: 'vertical' }} />
            </div>
            <div>
              <label style={S.label}>Available Locations * — select all cities you serve</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                {SRI_LANKA_CITIES.map(city => (
                  <button key={city} type="button" onClick={() => toggleLocation(city)}
                    style={{ padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', border: 'none', background: selectedLocations.includes(city) ? '#E8622A' : '#1A2D45', color: selectedLocations.includes(city) ? '#fff' : '#94A3B8', transition: 'all 0.15s' }}>
                    {selectedLocations.includes(city) ? '✓ ' : ''}{city}
                  </button>
                ))}
              </div>
              {selectedLocations.length > 0 && <p style={{ fontSize: '12px', color: '#E8622A', marginTop: '6px' }}>Selected: {selectedLocations.join(', ')}</p>}
            </div>
            <div>
              <label style={S.label}>Project Photos (up to 5) — show your past work</label>
              <div onClick={() => fileRef.current?.click()}
                style={{ border: '2px dashed #1E3A5A', borderRadius: '8px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#E8622A')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E3A5A')}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
                <p style={{ color: '#64748B', fontSize: '13px' }}>Click to upload photos of your past projects</p>
                <p style={{ color: '#475569', fontSize: '11px', marginTop: '4px' }}>PNG, JPG up to 5MB each · Max 5 photos</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} style={{ display: 'none' }} />
              {photoPreview.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {photoPreview.map((src, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={src} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #1E3A5A' }} />
                      <button type="button" onClick={() => removePhoto(i)}
                        style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#7F1D1D', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" style={{ ...S.btnPrimary, justifyContent: 'center', width: '100%', padding: '12px' }} disabled={saving}>
              {saving ? 'Creating Gig...' : '🎯 Publish Gig'}
            </button>
          </form>
        </div>
      )}

      {/* Empty state */}
      {gigs.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No Gigs Yet</h2>
          <p style={{ color: '#64748B', marginBottom: '20px' }}>Create your first gig to start receiving service requests from property owners.</p>
          <button onClick={() => setShowForm(true)} style={{ ...S.btnPrimary, padding: '10px 24px' }}>+ Create Your First Gig</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* LEFT — My Gigs list */}
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', color: '#94A3B8' }}>
              My Gigs ({gigs.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {gigs.map(gig => (
                <div key={gig.id} style={{ ...S.card, opacity: gig.is_active ? 1 : 0.6, borderColor: selectedGig?.id === gig.id ? '#E8622A' : '#1E3A5A' }}>
                  {gig.photos?.[0]?.photo_url ? (
                    <img src={gig.photos[0].photo_url} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px', marginBottom: '12px' }} />
                  ) : (
                    <div style={{ width: '100%', height: '90px', background: '#0D1B2E', borderRadius: '6px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🏗️</div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: '#475569', marginBottom: '3px' }}>{gig.gig_code}</div>
                      <h3 style={{ fontWeight: '700', fontSize: '14px' }}>{gig.title}</h3>
                    </div>
                    <span style={{ background: '#431407', color: '#FB923C', border: '1px solid #7C2D12', padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', marginLeft: '8px', flexShrink: 0 }}>{gig.service_category}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    {gig.cost_per_sqft && <div><div style={{ fontSize: '10px', color: '#64748B' }}>Cost/sqft</div><div style={{ fontSize: '13px', fontWeight: '600', color: '#4ADE80' }}>LKR {gig.cost_per_sqft?.toLocaleString()}</div></div>}
                    {gig.expected_duration && <div><div style={{ fontSize: '10px', color: '#64748B' }}>Duration</div><div style={{ fontSize: '12px' }}>{gig.expected_duration}</div></div>}
                  </div>
                  {gig.locations?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                      {gig.locations.slice(0, 3).map((loc: string) => <span key={loc} style={{ background: '#082550', color: '#60A5FA', border: '1px solid #1E3A5A', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>{loc}</span>)}
                      {gig.locations.length > 3 && <span style={{ background: '#082550', color: '#60A5FA', border: '1px solid #1E3A5A', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>+{gig.locations.length - 3}</span>}
                    </div>
                  )}
                  {/* Action buttons — clean set, no duplicates */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => selectGig(gig)}
                      style={{ ...S.btnPrimary, flex: 1, justifyContent: 'center', padding: '7px', fontSize: '12px', background: selectedGig?.id === gig.id ? '#E8622A' : '#1A3050' }}
                    >
                      {selectedGig?.id === gig.id ? '✓ Selected' : '📋 View Requests'}
                    </button>
                    <button onClick={() => toggleActive(gig)}
                      style={{ ...gig.is_active ? S.btnGhost : S.btnSuccess, padding: '7px 10px', fontSize: '11px' }}>
                      {gig.is_active ? '⏸' : '▶'}
                    </button>
                    <button onClick={() => deleteGig(gig.id)}
                      style={{ ...S.btnDanger, padding: '7px 10px', fontSize: '11px' }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Service Requests */}
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px', color: '#94A3B8' }}>
              {selectedGig ? `Requests for "${selectedGig.title}"` : 'Service Requests'}
            </h2>

            {!selectedGig ? (
              <div style={{ ...S.card, textAlign: 'center', padding: '40px 20px', color: '#475569' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>👈</div>
                <p style={{ fontSize: '13px' }}>Click <strong style={{ color: '#E2E8F0' }}>📋 View Requests</strong> on any gig to see service requests received</p>
              </div>
            ) : loadingRequests ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <div style={{ width: '28px', height: '28px', border: '3px solid #1E3A5A', borderTopColor: '#E8622A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              </div>
            ) : serviceRequests.length === 0 ? (
              <div style={{ ...S.card, textAlign: 'center', padding: '40px 20px', color: '#475569' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>📭</div>
                <p style={{ fontSize: '13px' }}>No service requests yet for this gig.</p>
                <p style={{ fontSize: '12px', color: '#334155', marginTop: '6px' }}>When a property owner sends a request, it will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {serviceRequests.map(req => (
                  <div key={req.id} style={S.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#475569', marginBottom: '3px' }}>{req.project_code}</div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{req.title}</div>
                      </div>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                        background: req.status === 'ongoing' ? '#052e16' : req.status === 'completed' ? '#082550' : '#422006',
                        color: req.status === 'ongoing' ? '#4ADE80' : req.status === 'completed' ? '#60A5FA' : '#FCD34D',
                        border: req.status === 'ongoing' ? '1px solid #166534' : req.status === 'completed' ? '1px solid #1E3A5A' : '1px solid #78350F'
                      }}>{req.status}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                      <div><div style={{ fontSize: '11px', color: '#64748B' }}>From</div><div style={{ fontSize: '13px', fontWeight: '500' }}>{req.owner_profile?.full_name || 'Property Owner'}</div></div>
                      <div><div style={{ fontSize: '11px', color: '#64748B' }}>City</div><div style={{ fontSize: '13px', fontWeight: '500' }}>{req.city}</div></div>
                      <div><div style={{ fontSize: '11px', color: '#64748B' }}>Budget</div><div style={{ fontSize: '13px', fontWeight: '600', color: '#4ADE80' }}>LKR {req.budget?.toLocaleString()}</div></div>
                      <div><div style={{ fontSize: '11px', color: '#64748B' }}>Received</div><div style={{ fontSize: '13px' }}>{new Date(req.created_at).toLocaleDateString()}</div></div>
                    </div>
                    {req.description && (
                      <p style={{ fontSize: '12px', color: '#94A3B8', lineHeight: '1.5', padding: '8px', background: '#0A1628', borderRadius: '6px', borderLeft: '2px solid #1E3A5A' }}>
                        "{req.description}"
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #1E3A5A' }}>
                      <button
                        onClick={() => applyToRequest(req)}
                        style={{ ...S.btnSuccess, flex: 1, justifyContent: 'center', padding: '8px', fontSize: '13px' }}
                      >
                        🙋 Apply
                      </button>
                      <button
                        onClick={() => messageRequestOwner(req)}
                        style={{ ...S.btnSecondary, flex: 1, justifyContent: 'center', padding: '8px', fontSize: '13px' }}
                      >
                        💬 Message Owner
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}