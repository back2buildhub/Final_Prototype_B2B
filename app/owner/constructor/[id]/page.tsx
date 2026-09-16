'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { S } from '@/lib/data'
import { calculateConstructorRating, getRatingColor, getRatingLabel } from '@/lib/rating'

export default function ConstructorPublicProfile() {
  const params = useParams()
  const router = useRouter()
  const constructorId = params.id as string
  const [profile, setProfile] = useState<any>(null)
  const [gigs, setGigs] = useState<any[]>([])
  const [ratings, setRatings] = useState<any[]>([])
  const [finalRating, setFinalRating] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: prof }, { data: gigsData }, { data: ratingsData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', constructorId).single(),
        supabase.from('gigs').select('*').eq('constructor_id', constructorId).eq('is_active', true),
        supabase.from('constructor_ratings').select('*').eq('constructor_id', constructorId).order('created_at', { ascending: false })
      ])
      setProfile(prof)
      setGigs(gigsData || [])
      setRatings(ratingsData || [])
      const ratingValues = (ratingsData || []).map((r: any) => r.rating)
      setFinalRating(calculateConstructorRating(ratingValues, prof?.is_verified || false))
      setLoading(false)
    }
    load()
  }, [constructorId])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #1E3A5A', borderTopColor: '#E8622A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  if (!profile) return (
    <div style={{ textAlign: 'center', padding: '60px', color: '#64748B' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>😕</div>
      <p>Constructor profile not found.</p>
    </div>
  )

  return (
    <div style={{ maxWidth: '800px' }}>
      <button onClick={() => router.back()} style={{ ...S.btnGhost, padding: '8px 14px', fontSize: '13px', marginBottom: '20px' }}>
        ← Back
      </button>

      {/* Profile Header */}
      <div style={{ ...S.card, marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#160E38', border: '2px solid #4E44B0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', flexShrink: 0, overflow: 'hidden' }}>
            {profile.profile_image_url
              ? <img src={profile.profile_image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '🏗️'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '700' }}>{profile.full_name}</h1>
              {profile.is_verified && (
                <span style={{ background: '#052e16', color: '#4ADE80', border: '1px solid #166534', padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' }}>
                  ✓ Verified
                </span>
              )}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
              🏗️ Constructor · 📍 {profile.city || 'Sri Lanka'}
              {profile.experience_years > 0 && ` · ${profile.experience_years} years experience`}
            </div>
            {profile.bio && <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.6' }}>{profile.bio}</p>}
          </div>

          {/* Rating */}
          <div style={{ textAlign: 'center', background: '#0D1B2E', padding: '14px 20px', borderRadius: '10px', border: `1px solid ${getRatingColor(finalRating)}`, flexShrink: 0 }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: getRatingColor(finalRating) }}>{finalRating}%</div>
            <div style={{ fontSize: '12px', color: getRatingColor(finalRating), fontWeight: '600', marginBottom: '4px' }}>{getRatingLabel(finalRating)}</div>
            <div style={{ fontSize: '11px', color: '#475569' }}>{ratings.length} review{ratings.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Rating Score', value: `${finalRating}%`, color: getRatingColor(finalRating) },
          { label: 'Owner Reviews', value: ratings.length, color: '#60A5FA' },
          { label: 'Active Gigs', value: gigs.length, color: '#FB923C' },
        ].map(stat => (
          <div key={stat.label} style={{ ...S.card, textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: stat.color, marginBottom: '4px' }}>{stat.value}</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Active Gigs */}
      {gigs.length > 0 && (
        <div style={{ ...S.card, marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Active Gigs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {gigs.map(gig => (
              <div key={gig.id} style={{ background: '#0D1B2E', border: '1px solid #1E3A5A', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{gig.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    {gig.service_category}
                    {gig.cost_per_sqft && ` · LKR ${gig.cost_per_sqft?.toLocaleString()}/sqft`}
                    {gig.expected_duration && ` · ${gig.expected_duration}`}
                  </div>
                  {gig.locations?.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                      📍 {gig.locations.slice(0, 3).join(', ')}{gig.locations.length > 3 ? ` +${gig.locations.length - 3}` : ''}
                    </div>
                  )}
                </div>
                <span style={{ background: '#431407', color: '#FB923C', border: '1px solid #7C2D12', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', flexShrink: 0, marginLeft: '10px' }}>
                  {gig.service_category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Owner Reviews */}
      <div style={S.card}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Owner Reviews ({ratings.length})</h2>
        {ratings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>⭐</div>
            <p style={{ fontSize: '13px' }}>No reviews yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ratings.map(r => (
              <div key={r.id} style={{ background: '#0D1B2E', border: '1px solid #1E3A5A', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: getRatingColor(r.rating) }}>{r.rating}%</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                {r.review && <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.5' }}>"{r.review}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}