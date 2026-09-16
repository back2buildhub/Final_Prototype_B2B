'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { S } from '@/lib/data'
import { generateCode } from '@/lib/supabase'

const SERVICES = ['All Services', 'Tiling', 'Roofing', 'Painting', 'Plumbing', 'Electrical', 'Renovation', 'Masonry', 'Carpentry', 'Landscaping', 'Other']
const SRI_LANKA_CITIES = ['All Locations', 'Colombo', 'Kandy', 'Galle', 'Gampaha', 'Kurunegala', 'Matara', 'Negombo', 'Anuradhapura', 'Polonnaruwa', 'Badulla', 'Ratnapura', 'Trincomalee', 'Batticaloa', 'Jaffna', 'Kalmunai', 'Ampara']
const PER_PAGE = 6

export default function OwnerGigs() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [gigs, setGigs] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterService, setFilterService] = useState('All Services')
  const [filterLocation, setFilterLocation] = useState('All Locations')
  const [selected, setSelected] = useState<any>(null)
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([])
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const [requestForm, setRequestForm] = useState({
    title: '', description: '', city: '', area: '', budget: ''
  })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)
    }
    init()
  }, [])

  useEffect(() => {
    loadGigs()
  }, [page, filterService, filterLocation])

  async function loadGigs() {
    setLoading(true)

    let query = supabase
      .from('gigs')
      .select('*', { count: 'exact' })
      .eq('is_active', true)

    if (filterService !== 'All Services') query = query.eq('service_category', filterService)
    if (filterLocation !== 'All Locations') query = query.contains('locations', [filterLocation])

    const { data: gigsData, count } = await query
      .order('created_at', { ascending: false })
      .range(page * PER_PAGE, page * PER_PAGE + PER_PAGE - 1)

    setTotalCount(count || 0)

    if (gigsData && gigsData.length > 0) {
      const enriched = await Promise.all(
        gigsData.map(async (g: any) => {
          const [{ data: profile }, { data: photos }] = await Promise.all([
            supabase.from('profiles').select('full_name, city').eq('id', g.constructor_id).single(),
            supabase.from('gig_photos').select('photo_url').eq('gig_id', g.id)
          ])
          return { ...g, constructor_profile: profile, photos: photos || [] }
        })
      )

      const filtered = search
        ? enriched.filter(g =>
            g.title.toLowerCase().includes(search.toLowerCase()) ||
            g.service_category.toLowerCase().includes(search.toLowerCase()) ||
            g.constructor_profile?.full_name?.toLowerCase().includes(search.toLowerCase())
          )
        : enriched

      setGigs(filtered)
    } else {
      setGigs([])
    }
    setLoading(false)
  }

  function handleSearch() { setPage(0); loadGigs() }

  function selectGig(gig: any) {
    setSelected(gig)
    setSelectedPhotos(gig.photos?.map((p: any) => p.photo_url) || [])
    setShowRequestForm(false)
    setMsg('')
    setRequestForm({ title: gig.title + ' — Service Request', description: '', city: '', area: '', budget: '' })
  }

  async function submitServiceRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !selected) return
    setSubmitting(true)
    setMsg('')

    const budget = parseFloat(requestForm.budget)
    if (isNaN(budget) || budget <= 0) { setMsg('❌ Enter a valid budget'); setSubmitting(false); return }

    const { data: project, error } = await supabase.from('projects').insert({
      project_code: generateCode('B2B-PRJ'),
      owner_id: user.id,
      title: requestForm.title,
      description: requestForm.description,
      service: selected.service_category,
      city: requestForm.city,
      budget,
      duration: selected.expected_duration || 'To be discussed',
      project_type: 'direct',
      project_category: 'service_request',
      gig_id: selected.id,
      status: 'pending',
    }).select().single()

    if (error || !project) {
      setMsg('❌ Failed to send request: ' + error?.message)
      setSubmitting(false)
      return
    }

    await supabase.from('project_applications').insert({
      project_id: project.id,
      constructor_id: selected.constructor_id,
      message: `Service request received for your gig: "${selected.title}". The owner is interested in your services.`,
      status: 'pending'
    })

    setMsg('✅ Service request sent! Go to My Projects to assign and start the project.')
    setShowRequestForm(false)
    setSubmitting(false)
    setTimeout(() => setMsg(''), 6000)
  }

  const totalPages = Math.ceil(totalCount / PER_PAGE)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: '20px' }}>

      {/* LEFT */}
      <div>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>Find Constructors</h1>
          <p style={{ color: '#64748B', fontSize: '14px' }}>Browse constructor gigs and send a service request directly</p>
        </div>

        {/* Search + Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search by title, service, or constructor name..."
            style={{ flex: 1, minWidth: '200px' }}
          />
          <select value={filterService} onChange={e => { setFilterService(e.target.value); setPage(0) }} style={{ width: '160px' }}>
            {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterLocation} onChange={e => { setFilterLocation(e.target.value); setPage(0) }} style={{ width: '160px' }}>
            {SRI_LANKA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={handleSearch} style={{ ...S.btnPrimary, padding: '10px 18px' }}>Search</button>
        </div>

        {msg && <div style={{ ...(msg.includes('❌') ? S.alertError : S.alertSuccess), marginBottom: '16px' }}>{msg}</div>}

        <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '14px' }}>
          {loading ? 'Loading...' : `${totalCount} constructor gig${totalCount !== 1 ? 's' : ''} found`}
          {totalPages > 1 && ` · Page ${page + 1} of ${totalPages}`}
        </div>

        {/* Gig cards */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #1E3A5A', borderTopColor: '#E8622A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : gigs.length === 0 ? (
          <div style={{ ...S.card, textAlign: 'center', padding: '50px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <p style={{ color: '#64748B' }}>No gigs found. Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            {gigs.map(gig => (
              <div key={gig.id} onClick={() => selectGig(gig)}
                style={{ ...S.card, cursor: 'pointer', transition: 'border-color 0.15s', borderColor: selected?.id === gig.id ? '#E8622A' : '#1E3A5A', background: selected?.id === gig.id ? '#150F08' : '#111E2E' }}>
                {gig.photos?.[0]?.photo_url ? (
                  <img src={gig.photos[0].photo_url} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px', marginBottom: '12px' }} />
                ) : (
                  <div style={{ width: '100%', height: '100px', background: '#0D1B2E', borderRadius: '6px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🏗️</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontWeight: '700', fontSize: '14px', flex: 1, marginRight: '8px' }}>{gig.title}</h3>
                  <span style={{ background: '#431407', color: '#FB923C', border: '1px solid #7C2D12', padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: '600', flexShrink: 0 }}>{gig.service_category}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>
                  👷 {gig.constructor_profile?.full_name || 'Constructor'} · {gig.constructor_profile?.city || ''}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                  {gig.cost_per_sqft && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>From</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#4ADE80' }}>LKR {gig.cost_per_sqft?.toLocaleString()}/sqft</div>
                    </div>
                  )}
                  {gig.expected_duration && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>Duration</div>
                      <div style={{ fontSize: '12px', fontWeight: '500' }}>{gig.expected_duration}</div>
                    </div>
                  )}
                </div>
                {gig.locations?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {gig.locations.slice(0, 3).map((loc: string) => (
                      <span key={loc} style={{ background: '#082550', color: '#60A5FA', border: '1px solid #1E3A5A', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>📍 {loc}</span>
                    ))}
                    {gig.locations.length > 3 && (
                      <span style={{ background: '#082550', color: '#60A5FA', border: '1px solid #1E3A5A', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>+{gig.locations.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '8px' }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              style={{ ...S.btnGhost, padding: '8px 16px', opacity: page === 0 ? 0.4 : 1 }}>← Previous</button>
            <span style={{ fontSize: '13px', color: '#94A3B8' }}>Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              style={{ ...S.btnGhost, padding: '8px 16px', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Next →</button>
          </div>
        )}
      </div>

      {/* RIGHT — Full gig detail */}
      {selected && (
        <div style={{ position: 'sticky', top: '28px', height: 'fit-content', maxHeight: 'calc(100vh - 56px)', overflowY: 'auto' }}>
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', color: '#475569' }}>{selected.gig_code}</span>
              <button onClick={() => { setSelected(null); setShowRequestForm(false) }}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>

            {selectedPhotos.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <img src={selectedPhotos[0]} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '6px' }} />
                {selectedPhotos.length > 1 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {selectedPhotos.slice(1).map((url, i) => (
                      <img key={i} src={url} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #1E3A5A' }} />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '700', flex: 1, marginRight: '10px' }}>{selected.title}</h2>
              <span style={{ background: '#431407', color: '#FB923C', border: '1px solid #7C2D12', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', flexShrink: 0 }}>{selected.service_category}</span>
            </div>

            <div style={{ ...S.cardDark, marginBottom: '14px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#160E38', border: '1px solid #4E44B0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🏗️</div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{selected.constructor_profile?.full_name || 'Constructor'}</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>{selected.constructor_profile?.city}</div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{selected.constructor_profile?.full_name || 'Constructor'}</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>{selected.constructor_profile?.city}</div>
                <a href={`/owner/constructors/${selected.constructor_id}`}
                  style={{ fontSize: '11px', color: '#E8622A', textDecoration: 'none', marginTop: '4px', display: 'inline-block' }}>
                  👤 View Profile →
                </a>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              {selected.cost_per_sqft && (
                <div style={{ ...S.cardDark }}>
                  <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '3px' }}>Cost per Sq Ft</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#4ADE80' }}>LKR {selected.cost_per_sqft?.toLocaleString()}</div>
                </div>
              )}
              {selected.expected_duration && (
                <div style={{ ...S.cardDark }}>
                  <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '3px' }}>Expected Duration</div>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>{selected.expected_duration}</div>
                </div>
              )}
            </div>

            {selected.locations?.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>📍 Available in</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {selected.locations.map((loc: string) => (
                    <span key={loc} style={{ background: '#082550', color: '#60A5FA', border: '1px solid #1E3A5A', padding: '3px 8px', borderRadius: '10px', fontSize: '11px' }}>{loc}</span>
                  ))}
                </div>
              </div>
            )}

            {selected.description && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>About this service</div>
                <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.6' }}>{selected.description}</p>
              </div>
            )}

            {!showRequestForm ? (
              <button onClick={() => setShowRequestForm(true)}
                style={{ ...S.btnPrimary, width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }}>
                📋 Send Service Request
              </button>
            ) : (
              <div style={{ borderTop: '1px solid #1E3A5A', paddingTop: '16px' }}>
                <h3 style={{ fontWeight: '600', marginBottom: '14px', fontSize: '14px' }}>📋 Service Request Details</h3>
                {msg && <div style={{ ...(msg.includes('❌') ? S.alertError : S.alertSuccess), marginBottom: '12px' }}>{msg}</div>}
                <form onSubmit={submitServiceRequest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={S.label}>Project Title *</label>
                    <input value={requestForm.title} onChange={e => setRequestForm(p => ({ ...p, title: e.target.value }))} required />
                  </div>
                  <div>
                    <label style={S.label}>Your Requirements *</label>
                    <textarea value={requestForm.description} onChange={e => setRequestForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Describe what you need done, materials preferred, any special requirements..."
                      style={{ minHeight: '80px', resize: 'vertical' }} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={S.label}>Your City *</label>
                      <input value={requestForm.city} onChange={e => setRequestForm(p => ({ ...p, city: e.target.value }))} placeholder="e.g. Kandy" required />
                    </div>
                    <div>
                      <label style={S.label}>Area (sq ft)</label>
                      <input type="number" value={requestForm.area} onChange={e => setRequestForm(p => ({ ...p, area: e.target.value }))} placeholder="e.g. 250" />
                    </div>
                  </div>
                  <div>
                    <label style={S.label}>Your Budget (LKR) *</label>
                    <input type="number" value={requestForm.budget} onChange={e => setRequestForm(p => ({ ...p, budget: e.target.value }))} placeholder="e.g. 85000" required />
                    {selected.cost_per_sqft && requestForm.area && parseFloat(requestForm.area) > 0 && (
                      <p style={{ fontSize: '11px', color: '#4ADE80', marginTop: '4px' }}>
                        💡 Estimated: LKR {(selected.cost_per_sqft * parseFloat(requestForm.area)).toLocaleString()} based on {requestForm.area} sq ft
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" style={{ ...S.btnPrimary, flex: 1, justifyContent: 'center', padding: '10px' }} disabled={submitting}>
                      {submitting ? 'Sending...' : '✓ Send Request'}
                    </button>
                    <button type="button" onClick={() => setShowRequestForm(false)} style={{ ...S.btnGhost, padding: '10px 14px' }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}