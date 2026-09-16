'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { S, StatusBadge } from '@/lib/data'

export default function ConstructorProjects() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isPro, setIsPro] = useState(false)
  const [tab, setTab] = useState<'available' | 'mine'>('available')
  const [available, setAvailable] = useState<any[]>([])
  const [mine, setMine] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [escrow, setEscrow] = useState<any>(null)
  const [progressList, setProgressList] = useState<any[]>([])
  const [applied, setApplied] = useState<string[]>([])
  const [progressForm, setProgressForm] = useState({ title: '', description: '', amount: '' })
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [applying, setApplying] = useState('')
  const [messagingId, setMessagingId] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)
      const { data: profile } = await supabase.from('profiles').select('is_pro').eq('id', user.id).single()
      setIsPro(profile?.is_pro || false)
      await loadProjects(user)
      const { data: myApps } = await supabase.from('project_applications').select('project_id').eq('constructor_id', user.id)
      setApplied(myApps?.map((a: any) => a.project_id) || [])
    }
    init()
  }, [])

  async function loadProjects(u: any) {
    const [{ data: avail }, { data: assigned }] = await Promise.all([
      supabase.from('projects').select('*').eq('status', 'pending').is('assigned_constructor_id', null),
      supabase.from('projects').select('*').eq('assigned_constructor_id', u.id),
    ])
    setAvailable(avail || [])
    setMine(assigned || [])
    setLoading(false)
  }

  function showMsg(text: string) { setMsg(text); setTimeout(() => setMsg(''), 4000) }

  // ── Create or get existing conversation ───────────────────────
  async function createOrGetConversation(projectId: string, ownerId: string, constructorId: string) {
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('project_id', projectId)
      .eq('owner_id', ownerId)
      .eq('constructor_id', constructorId)
      .single()

    if (existing) return existing.id

    const { data: created, error } = await supabase
      .from('conversations')
      .insert({ project_id: projectId, owner_id: ownerId, constructor_id: constructorId })
      .select('id')
      .single()

    if (error) { console.error('Conversation error:', error); return null }
    return created?.id
  }

  // ── Message owner from My Projects detail view ────────────────
  async function messageOwnerFromProject(project: any) {
    if (!user || !project.owner_id) return
    const convId = await createOrGetConversation(project.id, project.owner_id, user.id)
    if (convId) router.push(`/constructor/messages?conv=${convId}`)
    else showMsg('❌ Could not open message. Try again.')
  }

  // ── Message owner from available project card ─────────────────
  async function messageOwner(project: any) {
    if (!user) return
    setMessagingId(project.id)
    const convId = await createOrGetConversation(project.id, project.owner_id, user.id)
    setMessagingId('')
    if (convId) router.push(`/constructor/messages?conv=${convId}`)
    else showMsg('❌ Could not open message. Try again.')
  }

  // ── Open Bass AI with project context ─────────────────────────
  async function openBassAI(project: any) {
    if (!user) return
    const { data: conv } = await supabase
      .from('ai_conversations')
      .insert({ user_id: user.id, title: `${project.title} — AI Assistant` })
      .select()
      .single()
    if (conv) {
      router.push(`/constructor/ai?project=${project.id}&conv=${conv.id}`)
    }
  }

  async function applyToProject(projectId: string) {
    if (!user) return
    setApplying(projectId)
    const { error } = await supabase.from('project_applications').insert({
      project_id: projectId, constructor_id: user.id,
      message: 'I am interested in this project and available to start soon. Please feel free to contact me to discuss details.'
    })
    if (error && error.code === '23505') { showMsg('You already applied to this project.') }
    else if (error) { showMsg('Error: ' + error.message) }
    else { setApplied(prev => [...prev, projectId]); showMsg('✅ Application sent! The owner will review and assign.') }
    setApplying('')
  }

  async function selectMyProject(project: any) {
    setSelectedProject(project)
    setMsg('')
    const { data: esc } = await supabase.from('project_escrows').select('*').eq('project_id', project.id).single()
    setEscrow(esc)
    const { data: prog } = await supabase.from('progress_updates').select('*').eq('project_id', project.id).order('created_at', { ascending: false })
    setProgressList(prog || [])
  }

  async function submitProgress(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProject || !user) return
    setSubmitting(true)
    const { error } = await supabase.from('progress_updates').insert({
      project_id: selectedProject.id,
      constructor_id: user.id,
      title: progressForm.title,
      description: progressForm.description,
      requested_release_amount: parseFloat(progressForm.amount) || 0,
      status: 'submitted'
    })
    if (error) { showMsg('Error: ' + error.message) }
    else {
      showMsg('✅ Progress update submitted! Owner will review and release payment.')
      setProgressForm({ title: '', description: '', amount: '' })
      const { data: prog } = await supabase.from('progress_updates').select('*').eq('project_id', selectedProject.id).order('created_at', { ascending: false })
      setProgressList(prog || [])
    }
    setSubmitting(false)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}><div style={{ width: '32px', height: '32px', border: '3px solid #1E3A5A', borderTopColor: '#E8622A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /></div>

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>Projects</h1>
        <p style={{ color: '#64748B', fontSize: '14px' }}>Browse available projects or manage your assigned ones.</p>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#0D1B2E', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
        <button onClick={() => setTab('available')} style={{ ...tab === 'available' ? S.btnPrimary : S.btnGhost, padding: '8px 16px', fontSize: '13px' }}>
          🔍 Available ({available.length})
        </button>
        <button onClick={() => setTab('mine')} style={{ ...tab === 'mine' ? S.btnPrimary : S.btnGhost, padding: '8px 16px', fontSize: '13px' }}>
          📁 My Projects ({mine.length})
        </button>
      </div>

      {msg && <div style={{ ...(msg.includes('Error') || msg.includes('❌') ? S.alertError : S.alertSuccess), marginBottom: '16px' }}>{msg}</div>}

      {/* AVAILABLE PROJECTS */}
      {tab === 'available' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
          {available.length === 0 && <p style={{ color: '#64748B' }}>No available projects right now. Check back soon!</p>}
          {available.map(p => (
            <div key={p.id} style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: '#475569' }}>{p.project_code}</span>
                <span style={{ background: '#431407', color: '#FB923C', border: '1px solid #7C2D12', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>{p.project_type}</span>
              </div>
              <h3 style={{ fontWeight: '700', fontSize: '15px', marginBottom: '10px' }}>{p.title}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                {[['Service', p.service], ['City', p.city], ['Budget', `LKR ${p.budget?.toLocaleString()}`], ['Duration', p.duration]].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{k}</div>
                    <div style={{ fontSize: '13px', fontWeight: '500', marginTop: '2px' }}>{v}</div>
                  </div>
                ))}
              </div>
              {p.description && <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.5', marginBottom: '12px' }}>{p.description}</p>}
              <div style={{ fontSize: '12px', color: '#475569', marginBottom: '12px' }}>Posted in: {p.city}</div>

              {/* Row 1 — Message + Apply */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button
                  onClick={() => messageOwner(p)}
                  disabled={messagingId === p.id}
                  style={{ ...S.btnSecondary, flex: 1, justifyContent: 'center', padding: '9px', fontSize: '13px' }}
                >
                  {messagingId === p.id ? 'Opening...' : '💬 Message Owner'}
                </button>

                {applied.includes(p.id) ? (
                  <div style={{ flex: 1, background: '#052e16', color: '#4ADE80', border: '1px solid #166534', borderRadius: '6px', padding: '9px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>
                    ✓ Applied
                  </div>
                ) : p.project_type === 'bidding' && !isPro ? (
                  <div style={{ flex: 1, background: '#1A2D45', color: '#475569', border: '1px solid #1E3A5A', borderRadius: '6px', padding: '9px', textAlign: 'center', fontSize: '13px', cursor: 'not-allowed' }}>
                    🔒 Pro Only
                  </div>
                ) : (
                  <button
                    onClick={() => applyToProject(p.id)}
                    style={{ ...S.btnPrimary, flex: 1, justifyContent: 'center', padding: '9px', fontSize: '13px' }}
                    disabled={applying === p.id}
                  >
                    {applying === p.id ? 'Applying...' : '🙋 Apply'}
                  </button>
                )}
              </div>

              {/* Row 2 — Bass AI button */}
              <button
                onClick={() => openBassAI(p)}
                style={{ ...S.btnSecondary, width: '100%', justifyContent: 'center', padding: '9px', fontSize: '13px', color: '#FB923C', borderColor: '#7C2D12', background: '#2D1A0E' }}
              >
                🤖 Ask Bass AI About This Project
              </button>
            </div>
          ))}
        </div>
      )}

      {/* MY PROJECTS */}
      {tab === 'mine' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
          <div>
            {mine.length === 0 && <p style={{ color: '#64748B', fontSize: '13px' }}>No assigned projects yet.</p>}
            {mine.map(p => (
              <div key={p.id} onClick={() => selectMyProject(p)} style={{ ...S.cardSm, cursor: 'pointer', marginBottom: '8px', borderColor: selectedProject?.id === p.id ? '#E8622A' : '#1E3A5A', background: selectedProject?.id === p.id ? '#150F08' : '#111E2E' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '11px', color: '#475569' }}>{p.project_code}</span>
                  <StatusBadge status={p.status} />
                </div>
                <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '3px' }}>{p.title}</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>{p.service} · {p.city}</div>
              </div>
            ))}
          </div>

          <div>
            {!selectedProject ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#64748B' }}>← Select a project</div>
            ) : (
              <div>
                <div style={{ ...S.card, marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#475569', marginBottom: '3px' }}>{selectedProject.project_code}</div>
                      <h2 style={{ fontSize: '16px', fontWeight: '700' }}>{selectedProject.title}</h2>
                    </div>
                    <StatusBadge status={selectedProject.status} />
                  </div>

                  {[['Budget', `LKR ${selectedProject.budget?.toLocaleString()}`], ['City', selectedProject.city], ['Duration', selectedProject.duration]].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1E3A5A', fontSize: '13px' }}>
                      <span style={{ color: '#64748B' }}>{k}</span>
                      <span style={{ fontWeight: '500' }}>{v}</span>
                    </div>
                  ))}

                  {/* Action buttons — visible in ALL project states */}
                  <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => messageOwnerFromProject(selectedProject)}
                      style={{ ...S.btnSecondary, padding: '8px 16px', fontSize: '13px' }}
                    >
                      💬 Message Owner
                    </button>
                    <button
                      onClick={() => openBassAI(selectedProject)}
                      style={{ ...S.btnSecondary, padding: '8px 16px', fontSize: '13px', color: '#FB923C', borderColor: '#7C2D12', background: '#2D1A0E' }}
                    >
                      🤖 Ask Bass AI
                    </button>
                  </div>
                </div>

                {escrow && (
                  <div style={{ ...S.card, marginBottom: '16px', borderColor: '#166534' }}>
                    <h3 style={{ fontWeight: '600', marginBottom: '12px', color: '#4ADE80' }}>💰 Project Earnings</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                      {[
                        ['Total Value', `LKR ${escrow.total_amount?.toLocaleString()}`, '#4ADE80'],
                        ['Received', `LKR ${escrow.released_amount?.toLocaleString()}`, '#60A5FA'],
                        ['Remaining', `LKR ${escrow.remaining_balance?.toLocaleString()}`, '#FB923C'],
                      ].map(([k, v, color]) => (
                        <div key={k} style={{ background: '#052e16', padding: '10px', borderRadius: '6px', border: '1px solid #166634', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '4px' }}>{k}</div>
                          <div style={{ fontWeight: '700', fontSize: '13px', color: color as string }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569', padding: '8px', background: '#0A1628', borderRadius: '6px', borderLeft: '2px solid #1E3A5A' }}>
                      💡 Payments are released by admin after owner confirmation. Check progress updates for payment status.
                    </div>
                  </div>
                )}

                {selectedProject.status === 'ongoing' && (
                  <div style={{ ...S.card, marginBottom: '16px' }}>
                    <h3 style={{ fontWeight: '600', marginBottom: '14px' }}>📤 Submit Progress Update</h3>
                    <form onSubmit={submitProgress} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <label style={S.label}>Update Title *</label>
                        <input value={progressForm.title} onChange={e => setProgressForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Day 3 — Floor tiling 70% complete" required />
                      </div>
                      <div>
                        <label style={S.label}>Description *</label>
                        <textarea value={progressForm.description} onChange={e => setProgressForm(p => ({ ...p, description: e.target.value }))} placeholder="What was done today, materials used, hours worked..." style={{ minHeight: '80px', resize: 'vertical' }} required />
                      </div>
                      <div>
                        <label style={S.label}>Requested Payment Release (LKR)</label>
                        <input type="number" value={progressForm.amount} onChange={e => setProgressForm(p => ({ ...p, amount: e.target.value }))} placeholder="How much to release for this work?" />
                        <p style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>Owner decides final amount — this is your suggestion.</p>
                      </div>
                      <button type="submit" style={{ ...S.btnPrimary, justifyContent: 'center', width: '100%', padding: '10px' }} disabled={submitting}>
                        {submitting ? 'Submitting...' : '📤 Submit Progress Update'}
                      </button>
                    </form>
                  </div>
                )}

                <div style={S.card}>
                  <h3 style={{ fontWeight: '600', marginBottom: '14px' }}>📋 Progress History ({progressList.length})</h3>
                  {progressList.length === 0
                    ? <p style={{ color: '#64748B', fontSize: '13px' }}>No updates submitted yet.</p>
                    : progressList.map(p => (
                      <div key={p.id} style={{ ...S.cardDark, marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <div style={{ fontWeight: '600', fontSize: '13px' }}>{p.title}</div>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', background: p.status === 'approved' ? '#052e16' : '#422006', color: p.status === 'approved' ? '#4ADE80' : '#FCD34D', border: p.status === 'approved' ? '1px solid #14532D' : '1px solid #78350F' }}>{p.status}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>{p.description}</p>
                        <div style={{ fontSize: '11px', color: '#475569' }}>Requested: LKR {p.requested_release_amount?.toLocaleString()} · {new Date(p.created_at).toLocaleDateString()}</div>
                      </div>
                    ))
                  }
                </div>
                {selectedProject.status === 'completed' && (
                  <div style={{ ...S.card, marginTop: '16px', textAlign: 'center', borderColor: '#166534' }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>✅</div>
                    <h3 style={{ fontWeight: '700', fontSize: '16px', color: '#4ADE80', marginBottom: '6px' }}>Project Completed!</h3>
                    <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '16px' }}>Your project has been completed successfully.</p>
                    <button
                      onClick={() => window.open(`/bill/${selectedProject.id}`, '_blank')}
                      style={{ ...S.btnPrimary, padding: '10px 24px', justifyContent: 'center' }}
                    >
                      📄 View & Download Bill
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}