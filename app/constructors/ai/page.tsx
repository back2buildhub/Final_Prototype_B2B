'use client'
import { useState, useRef, useEffect } from 'react'
import { S } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import { ProjectContext } from '@/lib/ai/intentRouter'

type Message = {
  role: 'user' | 'assistant'
  content: string
  intent?: string
  intentLabel?: string
  isProjectAware?: boolean
  followUps?: string[]
}
type Conversation = { id: string; title: string; created_at: string }

const QUICK_PROMPTS = [
  '📐 Calculate materials for tiling a 400 sq ft floor using 60×60cm tiles',
  '📝 Write a professional bid proposal for a bathroom renovation worth LKR 180,000',
  '📋 Generate a daily progress report for Day 4 of a kitchen renovation',
  '💵 What is the current market rate for roofing work per square foot in Colombo?',
  '🔧 What is the correct waterproofing method for a flat roof in a high rainfall area?',
  '🧾 How do I calculate my labor cost and profit margin for a tiling project?',
]

export default function ConstructorAI() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(null)
  const [projectBanner, setProjectBanner] = useState<any>(null)
  const [isPro, setIsPro] = useState<boolean | null>(null)
  const endRef = useRef<any>(null)
  const inputRef = useRef<any>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)
      const { data: profile } = await supabase.from('profiles').select('is_pro').eq('id', user.id).single()
      setIsPro(profile?.is_pro || false)
      await loadConversations(user.id)

      const params = new URLSearchParams(window.location.search)
      const projectId = params.get('project')
      const convId = params.get('conv')

      if (projectId) {
        const { data: project } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single()

        if (project) {
          setProjectBanner(project)

          let escrowBalance, releasedAmount
          if (project.status === 'ongoing') {
            const { data: escrow } = await supabase
              .from('project_escrows')
              .select('remaining_balance, released_amount')
              .eq('project_id', projectId)
              .single()
            if (escrow) {
              escrowBalance = escrow.remaining_balance
              releasedAmount = escrow.released_amount
            }
          }

          setProjectContext({
            title: project.title,
            projectCode: project.project_code,
            service: project.service,
            city: project.city,
            budget: project.budget,
            status: project.status,
            duration: project.duration,
            escrowBalance,
            releasedAmount,
          })
        }
      }

      if (convId) {
        const { data: conv } = await supabase
          .from('ai_conversations')
          .select('*')
          .eq('id', convId)
          .single()
        if (conv) {
          setActiveConvId(conv.id)
          setConversations(prev => {
            if (prev.find(c => c.id === conv.id)) return prev
            return [conv, ...prev]
          })
          const { data: msgs } = await supabase
            .from('ai_messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: true })
          setMessages((msgs || []).map(m => ({ role: m.role, content: m.content })))
        }
      }
    }
    init()
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConversations(userId: string) {
    const { data } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setConversations(data || [])
  }

  async function openConversation(conv: Conversation) {
    setActiveConvId(conv.id)
    setMessages([])
    setProjectContext(null)
    setProjectBanner(null)
    window.history.pushState({}, '', '/constructors/ai')
    const { data } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
    setMessages((data || []).map(m => ({ role: m.role, content: m.content })))
  }

  async function newConversation() {
    if (!user) return
    setProjectContext(null)
    setProjectBanner(null)
    window.history.pushState({}, '', '/constructors/ai')
    const { data } = await supabase
      .from('ai_conversations')
      .insert({ user_id: user.id, title: 'New Conversation' })
      .select()
      .single()
    if (data) {
      setConversations(prev => [data, ...prev])
      setActiveConvId(data.id)
      setMessages([])
    }
  }

  async function deleteConversation(convId: string, e: React.MouseEvent) {
    e.stopPropagation()
    await supabase.from('ai_conversations').delete().eq('id', convId)
    setConversations(prev => prev.filter(c => c.id !== convId))
    if (activeConvId === convId) {
      setActiveConvId(null)
      setMessages([])
      setProjectContext(null)
      setProjectBanner(null)
    }
  }

  function renderMessage(content: string) {
    const lines = content.split('\n')
    return (
      <div>
        {lines.map((line, i) => {
          const trimmed = line.trim()
          if (!trimmed) return <div key={i} style={{ height: '6px' }} />
          const clean = trimmed
            .replace(/\*\*/g, '').replace(/\*/g, '')
            .replace(/^#+\s*/, '').replace(/^-\s/, '• ')
          if (clean.endsWith(':') && clean.length < 80 && !clean.includes('.')) {
            return <div key={i} style={{ fontWeight: '700', fontSize: '15px', color: '#E8622A', marginTop: '14px', marginBottom: '6px' }}>{clean}</div>
          }
          if (/^\d+\./.test(clean)) {
            const num = clean.match(/^\d+\./)?.[0] || ''
            const text = clean.replace(/^\d+\.\s*/, '')
            return (
              <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '5px', paddingLeft: '8px' }}>
                <span style={{ color: '#E8622A', fontWeight: '700', flexShrink: 0, minWidth: '20px' }}>{num}</span>
                <span style={{ lineHeight: '1.6' }}>{text}</span>
              </div>
            )
          }
          if (clean.startsWith('•')) {
            return (
              <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '5px', paddingLeft: '8px' }}>
                <span style={{ color: '#E8622A', fontWeight: '700', flexShrink: 0 }}>•</span>
                <span style={{ lineHeight: '1.6' }}>{clean.replace(/^•\s*/, '')}</span>
              </div>
            )
          }
          return <p key={i} style={{ marginBottom: '6px', lineHeight: '1.7', color: '#E2E8F0' }}>{clean}</p>
        })}
      </div>
    )
  }

  async function sendMessage(text?: string) {
    const msg = (text || input).trim()
    if (!msg || loading) return

    let convId = activeConvId
    if (!convId) {
      const title = projectBanner
        ? `${projectBanner.title} — AI Assistant`
        : msg.slice(0, 50)
      const { data } = await supabase
        .from('ai_conversations')
        .insert({ user_id: user.id, title })
        .select()
        .single()
      if (!data) return
      convId = data.id
      setActiveConvId(convId)
      setConversations(prev => [data, ...prev])
    }

    setInput('')
    setLoading(true)
    const userMessage: Message = { role: 'user', content: msg }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: messages,
          role: 'constructor',
          projectContext: projectContext || undefined
        })
      })
      const data = await res.json()
      const reply = data.reply || 'Sorry, I could not generate a response.'
      const intentLabel = data.intentLabel || 'Construction Q&A'
      const intent = data.intent || 'general'
      const isProjectAware = data.isProjectAware || false
      const followUps = data.followUps || []

      const assistantMessage: Message = { role: 'assistant', content: reply, intent, intentLabel, isProjectAware, followUps }
      setMessages([...updatedMessages, assistantMessage])

      await supabase.from('ai_messages').insert([
        { conversation_id: convId, user_id: user.id, role: 'user', content: msg },
        { conversation_id: convId, user_id: user.id, role: 'assistant', content: reply }
      ])

      if (messages.length === 0) {
        const title = projectBanner
          ? `${projectBanner.title} — AI Assistant`
          : msg.length > 45 ? msg.slice(0, 45) + '...' : msg
        await supabase.from('ai_conversations').update({ title }).eq('id', convId)
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, title } : c))
      }
    } catch {
      setMessages([...updatedMessages, { role: 'assistant', content: '⚠️ Could not connect to Bass AI. Please try again.' }])
    }

    setLoading(false)
    inputRef.current?.focus()
  }

  const activeConv = conversations.find(c => c.id === activeConvId)

  if (isPro === null) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #1E3A5A', borderTopColor: '#E8622A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  if (!isPro) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '500px' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
        <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '10px' }}>Bass AI is a Pro Feature</h2>
        <p style={{ color: '#64748B', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
          Upgrade to Back2Build Pro for lifetime access to Bass AI, bidding projects, and more — for just LKR 1,000.
        </p>
        <a href="/constructors/profile" style={{ background: '#E8622A', color: '#fff', padding: '12px 28px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '15px' }}>
          ⚡ Upgrade to Pro
        </a>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', height: 'calc(100vh - 56px)', background: '#0D1B2E', borderRadius: '10px', overflow: 'hidden', border: '1px solid #1E3A5A' }}>

      {/* LEFT SIDEBAR */}
      <div style={{ borderRight: '1px solid #1E3A5A', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px', borderBottom: '1px solid #1E3A5A', flexShrink: 0 }}>
          <button onClick={newConversation}
            style={{ ...S.btnPrimary, width: '100%', justifyContent: 'center', padding: '10px', fontSize: '13px' }}>
            + New Chat
          </button>
        </div>
        <div style={{ padding: '12px 14px 6px', flexShrink: 0 }}>
          <div style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>
            🤖 Bass AI — Chat History
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: '0' }}>
          {conversations.length === 0 && (
            <p style={{ padding: '16px 14px', color: '#475569', fontSize: '12px', lineHeight: '1.6' }}>
              No conversations yet. Click 🤖 Bass AI on any project or start a new chat.
            </p>
          )}
          {conversations.map(conv => (
            <div key={conv.id} onClick={() => openConversation(conv)}
              style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: activeConvId === conv.id ? '#1A2D45' : 'transparent', borderBottom: '1px solid #0D1B2E', transition: 'background 0.15s' }}
              onMouseEnter={e => { if (activeConvId !== conv.id) e.currentTarget.style.background = '#111E2E' }}
              onMouseLeave={e => { if (activeConvId !== conv.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: activeConvId === conv.id ? '600' : '400', color: activeConvId === conv.id ? '#E2E8F0' : '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {conv.title}
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                  {new Date(conv.created_at).toLocaleDateString()}
                </div>
              </div>
              <button onClick={e => deleteConversation(conv.id, e)}
                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', flexShrink: 0, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid #1E3A5A', flexShrink: 0 }}>
          <p style={{ fontSize: '10px', color: '#334155', textAlign: 'center' }}>
            Powered by Groq — Sri Lankan construction specialist
          </p>
        </div>
      </div>

      {/* RIGHT — chat area */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E3A5A', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: '600', fontSize: '15px' }}>{activeConv ? activeConv.title : '🤖 Bass AI'}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '1px' }}>Construction assistant for professionals</div>
          </div>
          <span style={{ background: '#160E38', color: '#AFA9EC', border: '1px solid #4E44B0', padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
            Constructor
          </span>
        </div>

        {/* Project context banner */}
        {projectBanner && (
          <div style={{ padding: '10px 20px', background: '#150F08', borderBottom: '1px solid #7C2D12', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>📁</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: '#FB923C', fontWeight: '600', marginBottom: '2px' }}>
                Project Context Active
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                {projectBanner.title} — {projectBanner.project_code} · {projectBanner.city} · LKR {projectBanner.budget?.toLocaleString()} · {projectBanner.status}
              </div>
            </div>
            <button
              onClick={() => { setProjectContext(null); setProjectBanner(null) }}
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '13px', padding: '2px 6px' }}
            >× Remove</button>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '0' }}>

          {!activeConvId && (
            <div style={{ textAlign: 'center', paddingTop: '30px' }}>
              <div style={{ fontSize: '52px', marginBottom: '14px' }}>🤖</div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Bass AI for Constructors</h2>
              <p style={{ color: '#64748B', fontSize: '14px', maxWidth: '400px', margin: '0 auto 28px', lineHeight: '1.6' }}>
                Get help with material calculations, bid proposals, progress reports, and construction methods.
                Or click <strong style={{ color: '#FB923C' }}>🤖 Bass AI</strong> on any project for context-aware answers.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '500px', margin: '0 auto' }}>
                {QUICK_PROMPTS.map((p, i) => (
                  <button key={i} onClick={() => sendMessage(p.replace(/^[^\s]+ /, ''))}
                    style={{ background: '#0A1628', border: '1px solid #1E3A5A', borderRadius: '8px', padding: '10px 14px', color: '#94A3B8', cursor: 'pointer', fontSize: '13px', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#E8622A'; e.currentTarget.style.color = '#E2E8F0' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E3A5A'; e.currentTarget.style.color = '#94A3B8' }}
                  >{p}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: '10px', alignItems: 'flex-start' }}>
              {m.role === 'assistant' && (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2D1A0E', border: '1px solid #7C2D12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, marginTop: '2px' }}>🤖</div>
              )}
              <div style={{ padding: '12px 16px', maxWidth: '75%', fontSize: '14px', lineHeight: '1.6', borderRadius: m.role === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px', background: m.role === 'user' ? '#160E38' : '#111E2E', border: m.role === 'user' ? '1px solid #4E44B0' : '1px solid #1E3A5A' }}>
                {m.role === 'assistant' && (
                  <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: '#E8622A', fontWeight: '700', letterSpacing: '0.03em' }}>BASS AI</span>
                    {m.intentLabel && (
                      <span style={{ fontSize: '10px', background: '#2D1A0E', color: '#FB923C', border: '1px solid #7C2D12', padding: '1px 7px', borderRadius: '10px', fontWeight: '600' }}>
                        {m.intentLabel}
                      </span>
                    )}
                    {m.isProjectAware && (
                      <span style={{ fontSize: '10px', background: '#052e16', color: '#4ADE80', border: '1px solid #166534', padding: '1px 7px', borderRadius: '10px', fontWeight: '600' }}>
                        📁 Project Aware
                      </span>
                    )}
                    <span style={{ fontSize: '10px', background: '#160E38', color: '#AFA9EC', border: '1px solid #4E44B0', padding: '1px 7px', borderRadius: '10px', fontWeight: '600' }}>
                      Constructor
                    </span>
                  </div>
                )}
                {m.role === 'assistant' ? renderMessage(m.content) : m.content}

                {/* Follow-up suggestion chips */}
                {m.role === 'assistant' && m.followUps && m.followUps.length > 0 && (
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #1E3A5A', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ width: '100%', fontSize: '10px', color: '#475569', marginBottom: '4px', letterSpacing: '0.04em' }}>
                      SUGGESTED FOLLOW-UPS
                    </div>
                    {m.followUps.map((q, qi) => (
                      <button
                        key={qi}
                        onClick={() => sendMessage(q)}
                        disabled={loading}
                        style={{
                          background: '#2D1A0E', color: '#FB923C',
                          border: '1px solid #7C2D12', borderRadius: '16px',
                          padding: '5px 12px', fontSize: '12px',
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'all 0.15s', lineHeight: '1.4'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#7C2D12' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#2D1A0E' }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#160E38', border: '1px solid #4E44B0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, marginTop: '2px' }}>🏗️</div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2D1A0E', border: '1px solid #7C2D12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🤖</div>
              <div style={{ padding: '12px 16px', background: '#111E2E', border: '1px solid #1E3A5A', borderRadius: '16px 16px 16px 2px' }}>
                <div style={{ fontSize: '11px', color: '#E8622A', fontWeight: '700', marginBottom: '8px', letterSpacing: '0.03em' }}>BASS AI</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: '7px', height: '7px', background: '#E8622A', borderRadius: '50%', animation: `bounce 1.2s infinite ${i * 0.2}s` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #1E3A5A', flexShrink: 0 }}>
          {projectBanner && (
            <div style={{ fontSize: '11px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📁</span>
              <span style={{ color: '#FB923C' }}>Asking about: <strong>{projectBanner.title}</strong></span>
            </div>
          )}
          <form onSubmit={e => { e.preventDefault(); sendMessage() }} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={projectBanner ? `Ask Bass AI about ${projectBanner.title}...` : 'Ask about materials, pricing, bid writing, progress reports... (Enter to send)'}
              disabled={loading} rows={2}
              style={{ flex: 1, resize: 'none', minHeight: '52px', maxHeight: '120px', lineHeight: '1.5', paddingTop: '12px' }}
            />
            <button type="submit" disabled={loading || !input.trim()}
              style={{ ...S.btnPrimary, padding: '14px 20px', flexShrink: 0, height: '52px', opacity: loading || !input.trim() ? 0.5 : 1 }}>
              {loading ? '...' : 'Send →'}
            </button>
          </form>
        </div>
      </div>

      <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0);opacity:0.4} 40%{transform:scale(1);opacity:1} }`}</style>
    </div>
  )
}
