'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { S } from '@/lib/data'

export default function OwnerPublicProfile() {
  const params = useParams()
  const router = useRouter()
  const ownerId = params.id as string
  const [profile, setProfile] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: prof }, { data: projectsData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', ownerId).single(),
        supabase.from('projects').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(10)
      ])
      setProfile(prof)
      setProjects(projectsData || [])
      setLoading(false)
    }
    load()
  }, [ownerId])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #1E3A5A', borderTopColor: '#E8622A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  if (!profile) return (
    <div style={{ textAlign: 'center', padding: '60px', color: '#64748B' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>😕</div>
      <p>Owner profile not found.</p>
    </div>
  )

  const completedProjects = projects.filter(p => p.status === 'completed').length
  const ongoingProjects = projects.filter(p => p.status === 'ongoing').length

  return (
    <div style={{ maxWidth: '700px' }}>
      <button onClick={() => router.back()} style={{ ...S.btnGhost, padding: '8px 14px', fontSize: '13px', marginBottom: '20px' }}>
        ← Back
      </button>

      {/* Profile Header */}
      <div style={{ ...S.card, marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#0B2924', border: '2px solid #0F6B52', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', flexShrink: 0, overflow: 'hidden' }}>
            {profile.profile_image_url
              ? <img src={profile.profile_image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '🏠'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '700' }}>{profile.full_name}</h1>
              {profile.is_pro && (
                <span style={{ background: '#431407', color: '#FB923C', border: '1px solid #7C2D12', padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' }}>
                  ⚡ Pro
                </span>
              )}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
              🏠 Property Owner · 📍 {profile.city || 'Sri Lanka'}
            </div>
            {profile.phone && (
              <div style={{ fontSize: '13px', color: '#94A3B8' }}>
                📞 {profile.phone}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Projects', value: projects.length, color: '#60A5FA' },
          { label: 'Completed', value: completedProjects, color: '#4ADE80' },
          { label: 'Ongoing', value: ongoingProjects, color: '#FB923C' },
        ].map(stat => (
          <div key={stat.label} style={{ ...S.card, textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: stat.color, marginBottom: '4px' }}>{stat.value}</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Project History */}
      <div style={S.card}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Project History</h2>
        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📋</div>
            <p style={{ fontSize: '13px' }}>No projects yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {projects.map(p => (
              <div key={p.id} style={{ background: '#0D1B2E', border: '1px solid #1E3A5A', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{p.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    {p.service} · {p.city} · LKR {p.budget?.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '3px' }}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', flexShrink: 0, marginLeft: '10px',
                  background: p.status === 'completed' ? '#052e16' : p.status === 'ongoing' ? '#082550' : '#422006',
                  color: p.status === 'completed' ? '#4ADE80' : p.status === 'ongoing' ? '#60A5FA' : '#FCD34D',
                  border: p.status === 'completed' ? '1px solid #166534' : p.status === 'ongoing' ? '1px solid #1E3A5A' : '1px solid #78350F'
                }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}