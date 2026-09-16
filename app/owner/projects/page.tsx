'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { S, StatusBadge } from '@/lib/data'
import { calculateConstructorRating, getRatingColor, getRatingLabel } from '@/lib/rating'

export default function OwnerProjects() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isPro, setIsPro] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [escrow, setEscrow] = useState<any>(null)
  const [progressList, setProgressList] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [releaseAmount, setReleaseAmount] = useState('')
  const [releasing, setReleasing] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [messagingId, setMessagingId] = useState('')
  const [showRatingForm, setShowRatingForm] = useState(false)
  const [ratingValue, setRatingValue] = useState(80)
  const [ratingReview, setRatingReview] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [existingRating, setExistingRating] = useState<any>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)
      const { data: profile } = await supabase.from('profiles').select('is_pro').eq('id', user.id).single()
      setIsPro(profile?.is_pro || false)
      const { data } = await supabase.from('projects').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
      setProjects(data || [])
      setLoading(false)
    }
    init()
  }, [])

  function showMsg(text: string) { setMsg(text); setTimeout(() => setMsg(''), 5000) }

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

  // ── Message constructor from project header (ongoing/completed) ──
  async function messageConstructorByProject(project: any) {
    if (!user || !project.assigned_constructor_id) return
    setMsg('Opening conversation...')
    const convId = await createOrGetConversation(project.id, user.id, project.assigned_constructor_id)
    if (convId) router.push(`/owner/messages?conv=${convId}`)
    else showMsg('❌ Could not open message. Try again.')
  }

  // ── Message a constructor (from application card) ──────────────
  async function messageConstructor(app: any) {
    if (!user || !selected) return
    setMessagingId(app.id)
    const convId = await createOrGetConversation(selected.id, user.id, app.constructor_id)
    setMessagingId('')
    if (convId) router.push(`/owner/messages?conv=${convId}`)
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
      router.push(`/owner/ai?project=${project.id}&conv=${conv.id}`)
    }
  }

  async function selectProject(project: any) {
    setSelected(project)
    setMsg('')
    setEscrow(null)
    setProgressList([])
    setApplications([])

    if (project.status === 'pending') {
      const { data: apps } = await supabase
        .from('project_applications')
        .select('*')
        .eq('project_id', project.id)
        .eq('status', 'pending')

      if (apps && apps.length > 0) {
        const appsWithProfiles = await Promise.all(
          apps.map(async (app: any) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, city')
              .eq('id', app.constructor_id)
              .single()
            return { ...app, profiles: profile }
          })
        )
        setApplications(appsWithProfiles)
      } else {
        setApplications([])
      }
    }

    if (project.status === 'ongoing') {
      const { data: esc } = await supabase.from('project_escrows').select('*').eq('project_id', project.id).single()
      setEscrow(esc)
      const { data: prog } = await supabase.from('progress_updates').select('*').eq('project_id', project.id).order('created_at', { ascending: false })
      setProgressList(prog || [])
    }

    if (project.status === 'completed' && project.assigned_constructor_id) {
      const { data: rating } = await supabase
        .from('constructor_ratings')
        .select('*')
        .eq('project_id', project.id)
        .single()
      setExistingRating(rating || null)
      if (rating) setRatingValue(rating.rating)
    } else {
      setExistingRating(null)
      setRatingValue(80)
    }
  }

  async function assignConstructor(application: any) {
    if (!user || !selected) return
    setAssigning(true)
    const res = await fetch('/api/escrow/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerId: user.id,
        constructorId: application.constructor_id,
        projectId: selected.id,
        projectBudget: selected.budget,
        projectTitle: selected.title,
        applicationId: application.id
      })
    })
    const data = await res.json()
    if (data.error) { showMsg('❌ ' + data.error); setAssigning(false); return }
    showMsg(`✅ Constructor assigned! LKR ${data.depositAmount?.toLocaleString()} moved to escrow.`)
    const { data: updatedProjects } = await supabase.from('projects').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
    setProjects(updatedProjects || [])
    const updated = updatedProjects?.find((p: any) => p.id === selected.id)
    if (updated) selectProject(updated)
    setAssigning(false)
  }

  async function releasePayment(progressId: string) {
  if (!escrow || !releaseAmount || !user) return
  const amount = parseFloat(releaseAmount)
  if (isNaN(amount) || amount <= 0 || amount > escrow.remaining_balance) { showMsg('❌ Invalid amount'); return }
  setReleasing(true)
  const res = await fetch('/api/escrow/release', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ownerId: user.id,
      escrowId: escrow.id,
      constructorId: escrow.constructor_id,
      projectId: selected.id,
      progressUpdateId: progressId,
      releaseAmount: amount,
    })
  })
  const data = await res.json()
  if (data.error) { showMsg('❌ ' + data.error); setReleasing(false); return }
  showMsg(`✅ Payment confirmation sent to admin! LKR ${amount.toLocaleString()} will be released to constructor after admin approval.`)
  setReleaseAmount('')
  const { data: updatedProgress } = await supabase.from('progress_updates').select('*').eq('project_id', selected.id).order('created_at', { ascending: false })
  setProgressList(updatedProgress || [])
  setReleasing(false)
}

  async function deleteProject(projectId: string) {
  if (!confirm('Delete this project permanently? This cannot be undone.')) return
  await supabase.from('progress_updates').delete().eq('project_id', projectId)
  await supabase.from('project_applications').delete().eq('project_id', projectId)
  await supabase.from('project_escrows').delete().eq('project_id', projectId)
  await supabase.from('conversations').delete().eq('project_id', projectId)
  await supabase.from('projects').delete().eq('id', projectId)
  setProjects(prev => prev.filter(p => p.id !== projectId))
  setSelected(null)
  showMsg('✅ Project deleted successfully.')
}

  async function completeProject(projectId: string) {
  if (!user) return
  await supabase.from('projects').update({ status: 'completed' }).eq('id', projectId)
  showMsg('✅ Project marked as completed!')
  const { data: updatedProjects } = await supabase.from('projects').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
  setProjects(updatedProjects || [])
  const updated = updatedProjects?.find((p: any) => p.id === projectId)
  if (updated) setSelected(updated)
  }

  async function submitRating() {
    if (!selected || !user) return
    setSubmittingRating(true)
    const { error } = await supabase.from('constructor_ratings').upsert({
      constructor_id: selected.assigned_constructor_id,
      owner_id: user.id,
      project_id: selected.id,
      rating: ratingValue,
      review: ratingReview.trim() || null
    }, { onConflict: 'project_id' })
    if (error) {
      showMsg('❌ Failed to submit rating: ' + error.message)
    } else {
      showMsg('✅ Rating submitted successfully!')
      setExistingRating({ rating: ratingValue, review: ratingReview })
      setShowRatingForm(false)
    }
    setSubmittingRating(false)
  }

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}><div style={{ width: '32px', height: '32px', border: '3px solid #1E3A5A', borderTopColor: '#E8622A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /></div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: '20px' }}>

      {/* LEFT: project list */}
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '14px' }}>My Projects</h1>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {['all','pending','ongoing','completed'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ ...f === filter ? S.btnPrimary : S.btnGhost, padding: '5px 10px', fontSize: '12px' }}>{f}</button>
          ))}
        </div>
        {filtered.length === 0 && (
          <p style={{ color: '#64748B', fontSize: '13px' }}>No {filter} projects. <a href="/owner/create-project" style={{ color: '#E8622A' }}>Create one →</a></p>
        )}
        {filtered.map(p => (
          <div key={p.id} onClick={() => selectProject(p)} style={{ ...S.cardSm, cursor: 'pointer', marginBottom: '8px', borderColor: selected?.id === p.id ? '#E8622A' : '#1E3A5A', background: selected?.id === p.id ? '#150F08' : '#111E2E' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '11px', color: '#475569' }}>{p.project_code}</span>
              <StatusBadge status={p.status} />
            </div>
            <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '3px' }}>{p.title}</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>{p.service} · {p.city} · LKR {p.budget?.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* RIGHT: project detail */}
      <div>
        {msg && <div style={{ ...(msg.includes('❌') ? S.alertError : S.alertSuccess), marginBottom: '14px' }}>{msg}</div>}

        {!selected ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#64748B' }}>
            ← Select a project to manage it
          </div>
        ) : (
          <div>
            {/* Project header */}
            <div style={{ ...S.card, marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#475569', marginBottom: '3px' }}>{selected.project_code}</div>
                  <h2 style={{ fontSize: '18px', fontWeight: '700' }}>{selected.title}</h2>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[['Service', selected.service], ['City', selected.city], ['Budget', `LKR ${selected.budget?.toLocaleString()}`], ['Duration', selected.duration], ['Type', selected.project_type], ['Created', new Date(selected.created_at).toLocaleDateString()]].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{k}</div>
                    <div style={{ fontSize: '13px', fontWeight: '500', marginTop: '2px' }}>{v}</div>
                  </div>
                ))}
              </div>
              {selected.description && <p style={{ fontSize: '13px', color: '#94A3B8', marginTop: '12px', lineHeight: '1.6' }}>{selected.description}</p>}

              {/* Action buttons — visible in ALL states */}
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #1E3A5A', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Bass AI button — always visible */}
                <button
                  onClick={() => openBassAI(selected)}
                  style={{ ...S.btnSecondary, padding: '8px 16px', fontSize: '13px', color: '#FB923C', borderColor: '#7C2D12', background: '#2D1A0E' }}
                >
                  🤖 Ask Bass AI
                </button>
                {/* Message button — only when constructor is assigned */}
                {selected.assigned_constructor_id && (
                  <>
                    <button
                      onClick={() => messageConstructorByProject(selected)}
                      style={{ ...S.btnSecondary, padding: '8px 16px', fontSize: '13px' }}
                    >
                      💬 Message Constructor
                    </button>
                    <a href={`/owner/constructor/${selected.assigned_constructor_id}`}
                      style={{ ...S.btnGhost, padding: '8px 16px', fontSize: '13px', textDecoration: 'none' }}>
                      👤 View Profile
                    </a>
                  </>
                )}
                <button
                  onClick={() => deleteProject(selected.id)}
                  style={{ marginLeft: 'auto', background: 'none', border: '1px solid #7F1D1D', color: '#F87171', borderRadius: '6px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer' }}
                >
                  🗑 Delete Project
                </button>
              </div>
            </div>

            {/* PENDING: Applications */}
            {selected.status === 'pending' && (
              <div style={S.card}>
                <h3 style={{ fontWeight: '600', marginBottom: '14px' }}>
                  Constructor Applications ({applications.length})
                </h3>
                {applications.length === 0 ? (
                  <p style={{ color: '#64748B', fontSize: '13px' }}>
                    No applications yet. Constructors will appear here when they apply to this project.
                  </p>
                ) : (
                  applications.map(app => (
                    <div key={app.id} style={{ ...S.cardDark, marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', marginBottom: '2px', fontSize: '15px' }}>
                            {app.profiles?.full_name || 'Constructor'}
                          </div>
                          <a href={`/owner/constructor/${app.constructor_id}`}
                            style={{ fontSize: '11px', color: '#E8622A', textDecoration: 'none', display: 'inline-block', marginBottom: '4px' }}>
                            👤 View Profile →
                          </a>
                          <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>
                            📍 {app.profiles?.city || 'Unknown city'}
                          </div>
                  
                          {app.message && (
                            <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.5', marginBottom: '8px', padding: '8px', background: '#0A1628', borderRadius: '6px', borderLeft: '2px solid #1E3A5A' }}>
                              "{app.message}"
                            </p>
                          )}
                          <div style={{ fontSize: '11px', color: '#475569' }}>
                            Applied {new Date(app.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '14px', flexShrink: 0 }}>
                          <button
                            onClick={() => messageConstructor(app)}
                            disabled={messagingId === app.id}
                            style={{ ...S.btnSecondary, whiteSpace: 'nowrap', padding: '8px 14px', fontSize: '13px' }}
                          >
                            {messagingId === app.id ? 'Opening...' : '💬 Message'}
                          </button>
                          <button
                            onClick={() => assignConstructor(app)}
                            disabled={assigning}
                            style={{ ...S.btnSuccess, whiteSpace: 'nowrap' }}
                          >
                            {assigning ? 'Assigning...' : '✓ Assign & Deposit 50%'}
                          </button>
                          {/* Bass AI button on application card */}
                          <button
                            onClick={() => openBassAI(selected)}
                            style={{ ...S.btnSecondary, whiteSpace: 'nowrap', padding: '8px 14px', fontSize: '13px', color: '#FB923C', borderColor: '#7C2D12', background: '#2D1A0E' }}
                          >
                            🤖 Ask Bass AI
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ONGOING: Escrow + Progress */}
            {selected.status === 'ongoing' && escrow && (
              <>
                <div style={{ ...S.card, marginBottom: '16px', borderColor: '#166534' }}>
                  <h3 style={{ fontWeight: '600', marginBottom: '14px', color: '#4ADE80' }}>💰 Escrow Status</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
                    {[
                      ['Total Budget', `LKR ${escrow.total_amount?.toLocaleString()}`],
                      ['In Escrow', `LKR ${escrow.remaining_balance?.toLocaleString()}`],
                      ['Released to Constructor', `LKR ${escrow.released_amount?.toLocaleString()}`],
                      ['Platform Fees', `LKR ${escrow.platform_fee_collected?.toLocaleString()}`],
                    ].map(([k, v]) => (
                      <div key={k} style={{ background: '#052e16', padding: '10px', borderRadius: '6px', border: '1px solid #166534' }}>
                        <div style={{ fontSize: '11px', color: '#4ADE80', opacity: 0.7 }}>{k}</div>
                        <div style={{ fontWeight: '700', fontSize: '15px', color: '#4ADE80', marginTop: '3px' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: '#1E3A5A', borderRadius: '4px', height: '8px', overflow: 'hidden', marginBottom: '6px' }}>
                    <div style={{ height: '100%', background: '#E8622A', borderRadius: '4px', width: `${Math.min(100, ((escrow.released_amount / escrow.total_amount) * 100))}%`, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                    <p style={{ fontSize: '12px', color: '#475569' }}>
                      {((escrow.released_amount / escrow.total_amount) * 100).toFixed(0)}% paid to constructor
                    </p>
                    <button
                      onClick={() => completeProject(selected.id)}
                      style={{ ...S.btnSuccess, padding: '6px 14px', fontSize: '12px' }}
                    >
                      ✓ Mark as Completed
                    </button>
                </div>
                </div>

                <div style={S.card}>
                  <h3 style={{ fontWeight: '600', marginBottom: '14px' }}>📋 Progress Updates</h3>
                  {progressList.length === 0 ? (
                    <p style={{ color: '#64748B', fontSize: '13px' }}>
                      Waiting for constructor to submit progress updates...
                    </p>
                  ) : (
                    progressList.map(p => (
                      <div key={p.id} style={{ ...S.cardDark, marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ fontWeight: '600', fontSize: '14px' }}>{p.title}</div>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', background: p.status === 'approved' ? '#052e16' : '#422006', color: p.status === 'approved' ? '#4ADE80' : '#FCD34D', border: p.status === 'approved' ? '1px solid #14532D' : '1px solid #78350F' }}>{p.status}</span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.5', marginBottom: '8px' }}>{p.description}</p>
                        <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '10px' }}>
                          Requested: LKR {p.requested_release_amount?.toLocaleString()} · {new Date(p.created_at).toLocaleDateString()}
                        </div>
                        {p.status === 'submitted' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#94A3B8', padding: '8px', background: '#0A1628', borderRadius: '6px', borderLeft: '2px solid #E8622A' }}>
                              💡 Enter the amount to confirm and send to admin for payment release
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <input type="number" placeholder={`Amount (max LKR ${escrow.remaining_balance?.toLocaleString()})`} value={releaseAmount} onChange={e => setReleaseAmount(e.target.value)} style={{ flex: 1 }} />
                              <button onClick={() => releasePayment(p.id)} style={{ ...S.btnSuccess, whiteSpace: 'nowrap' }} disabled={releasing}>
                                {releasing ? 'Sending...' : '✓ Confirm & Notify Admin'}
                              </button>
                            </div>
                          </div>
                        )}
                        {p.status === 'approved' && (
                          <div style={{ fontSize: '12px', color: '#4ADE80', padding: '8px', background: '#052e16', borderRadius: '6px', border: '1px solid #166534' }}>
                            ✅ Payment confirmed — waiting for admin to release funds to constructor
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {selected.status === 'completed' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ ...S.card, textAlign: 'center', padding: '30px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                  <h3 style={{ fontWeight: '700', fontSize: '18px', color: '#4ADE80', marginBottom: '8px' }}>Project Completed!</h3>
                  <p style={{ color: '#64748B' }}>This project has been completed successfully.</p>
                  <button
                    onClick={() => window.open(`/bill/${selected.id}`, '_blank')}
                    style={{ ...S.btnPrimary, padding: '10px 24px', marginTop: '14px' }}
                  >
                    📄 View & Download Bill
                  </button>
                </div>

                {selected.assigned_constructor_id && (
                  <div style={{ ...S.card, borderColor: existingRating ? '#166534' : '#1E3A5A' }}>
                    <h3 style={{ fontWeight: '600', fontSize: '15px', marginBottom: '14px' }}>⭐ Rate Constructor</h3>

                    {existingRating && !showRatingForm ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                          <div style={{ fontSize: '36px', fontWeight: '700', color: getRatingColor(existingRating.rating) }}>
                            {existingRating.rating}%
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: getRatingColor(existingRating.rating) }}>
                              {getRatingLabel(existingRating.rating)}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>Your rating</div>
                          </div>
                        </div>
                        {existingRating.review && (
                          <p style={{ fontSize: '13px', color: '#94A3B8', padding: '8px', background: '#0A1628', borderRadius: '6px', marginBottom: '10px' }}>
                            "{existingRating.review}"
                          </p>
                        )}
                        <button onClick={() => setShowRatingForm(true)}
                          style={{ ...S.btnGhost, fontSize: '13px', padding: '8px 14px' }}>
                          ✏️ Edit Rating
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {!existingRating && (
                          <p style={{ color: '#64748B', fontSize: '13px' }}>
                            How was your experience with this constructor?
                          </p>
                        )}
                        <div>
                          <label style={S.label}>Rating: {ratingValue}%</label>
                          <input type="range" min="0" max="100" value={ratingValue}
                            onChange={e => setRatingValue(parseInt(e.target.value))}
                            style={{ width: '100%', accentColor: getRatingColor(ratingValue) }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                            <span>0%</span>
                            <span style={{ color: getRatingColor(ratingValue), fontWeight: '600' }}>
                              {getRatingLabel(ratingValue)}
                            </span>
                            <span>100%</span>
                          </div>
                        </div>
                        <div>
                          <label style={S.label}>Review (optional)</label>
                          <textarea value={ratingReview} onChange={e => setRatingReview(e.target.value)}
                            placeholder="Share your experience with this constructor..."
                            style={{ minHeight: '70px', resize: 'vertical' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={submitRating} disabled={submittingRating}
                            style={{ ...S.btnPrimary, flex: 1, justifyContent: 'center', padding: '10px' }}>
                            {submittingRating ? 'Submitting...' : '⭐ Submit Rating'}
                          </button>
                          {showRatingForm && (
                            <button onClick={() => setShowRatingForm(false)}
                              style={{ ...S.btnGhost, padding: '10px 14px' }}>
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}