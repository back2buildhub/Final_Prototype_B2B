'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { S } from '@/lib/data'

export default function ConstructorMessages() {
  const [user, setUser] = useState<any>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [unreadConvs, setUnreadConvs] = useState<Set<string>>(new Set())
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)
  const [deletedMsgIds, setDeletedMsgIds] = useState<Set<string>>(new Set())
  const imgRef = useRef<any>(null)
  const endRef = useRef<any>(null)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)
      const convs = await loadConversations(user.id)
      await checkUnread(convs, user.id)
      localStorage.setItem('b2b_constructor_messages_seen', new Date().toISOString())

      // Auto-select from URL param
      const params = new URLSearchParams(window.location.search)
      const convId = params.get('conv')
      if (convId) {
        const found = convs.find((c: any) => c.id === convId)
        if (found) {
          openConversation(found)
        } else {
          // Load directly if not in list yet
          const { data: single } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', convId)
            .single()
          if (single) {
            const enriched = await enrichConversation(single)
            setConversations(prev => [enriched, ...prev])
            openConversation(enriched)
          }
        }
      }
    }
    init()
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConversations(userId: string) {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('constructor_id', userId)
      .order('created_at', { ascending: false })

    if (error || !data) { setLoading(false); return [] }

    const enriched = await Promise.all(data.map(enrichConversation))
    const hidden = JSON.parse(localStorage.getItem(`b2b_hidden_convs_${userId}`) || '[]')
    const visible = enriched.filter((c: any) => !hidden.includes(c.id))
    setConversations(visible)
    setLoading(false)
    return enriched
  }

  async function checkUnread(convs: any[], userId: string) {
  const unreadSet = new Set<string>()
  for (const conv of convs) {
    const lastSeen = localStorage.getItem(`b2b_conv_seen_${conv.id}`) || new Date(0).toISOString()
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .neq('sender_id', userId)
      .gt('created_at', lastSeen)
    if (count && count > 0) unreadSet.add(conv.id)
  }
  setUnreadConvs(unreadSet)
}

async function deleteMessage(msgId: string) {
  if (!confirm('Delete this message for you only?')) return
  const newDeleted = new Set(deletedMsgIds)
  newDeleted.add(msgId)
  setDeletedMsgIds(newDeleted)
  if (selected) {
    localStorage.setItem(
      `b2b_deleted_msgs_${user?.id}_${selected.id}`,
      JSON.stringify([...newDeleted])
    )
  }
}

async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file || !selected || !user) return
  const path = `messages/${Date.now()}-${file.name.replace(/\s/g, '_')}`
  const { data, error } = await supabase.storage.from('gig-photos').upload(path, file)
  if (!error && data) {
    const { data: urlData } = supabase.storage.from('gig-photos').getPublicUrl(data.path)
    await supabase.from('messages').insert({
      conversation_id: selected.id,
      sender_id: user.id,
      body: `[IMAGE]${urlData.publicUrl}`
    })
  }
  e.target.value = ''
}

function renderBody(body: string) {
  if (body.startsWith('[IMAGE]')) {
    const url = body.replace('[IMAGE]', '')
    return <img src={url} style={{ maxWidth: '220px', maxHeight: '200px', borderRadius: '8px', cursor: 'pointer', display: 'block' }} onClick={() => window.open(url, '_blank')} />
  }
  return <span>{body}</span>
}

  async function enrichConversation(conv: any) {
    const [{ data: project }, { data: profile }] = await Promise.all([
      supabase.from('projects').select('title, project_code, status').eq('id', conv.project_id).single(),
      supabase.from('profiles').select('full_name, city').eq('id', conv.owner_id).single(),
    ])
    return { ...conv, project, owner_profile: profile }
  }

  function openConversation(conv: any) {
    setSelected(conv)
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    loadMessages(conv.id)
    localStorage.setItem(`b2b_conv_seen_${conv.id}`, new Date().toISOString())
    setUnreadConvs(prev => { const next = new Set(prev); next.delete(conv.id); return next })
    window.history.pushState({}, '', `/owner/messages?conv=${conv.id}`)
  }

  async function loadMessages(convId: string) {
    const stored = localStorage.getItem(`b2b_deleted_msgs_${user?.id}_${convId}`)
    const deletedSet = stored ? new Set<string>(JSON.parse(stored)) : new Set<string>()
    setDeletedMsgIds(deletedSet)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages(data || [])

    const channel = supabase.channel(`con-${convId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        payload => setMessages(prev => [...prev, payload.new as any]))
      .subscribe()
    channelRef.current = channel
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !selected || !user) return
    setSending(true)
    await supabase.from('messages').insert({
      conversation_id: selected.id,
      sender_id: user.id,
      body: input.trim()
    })
    setInput('')
    setSending(false)
  }

  const ownerName = (conv: any) => conv?.owner_profile?.full_name || 'Property Owner'

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '280px 1fr',
      height: 'calc(100vh - 56px)', background: '#0D1B2E',
      borderRadius: '10px', overflow: 'hidden', border: '1px solid #1E3A5A'
    }}>

      {/* LEFT — conversation list */}
      <div style={{ borderRight: '1px solid #1E3A5A', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #1E3A5A', fontWeight: '600', fontSize: '15px', flexShrink: 0 }}>
          💬 Messages
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
              <div style={{ width: '24px', height: '24px', border: '2px solid #1E3A5A', borderTopColor: '#E8622A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            </div>
          )}

          {!loading && conversations.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>💬</div>
              <p style={{ color: '#64748B', fontSize: '13px', lineHeight: '1.6' }}>
                No conversations yet. Go to Find Projects and click <strong style={{ color: '#E2E8F0' }}>💬 Message Owner</strong> to start chatting.
              </p>
            </div>
          )}

          {conversations.map(conv => {
            const hasUnread = unreadConvs.has(conv.id)
            return (
              <div key={conv.id} onClick={() => openConversation(conv)}
                style={{ padding: '13px 16px', cursor: 'pointer', background: selected?.id === conv.id ? '#1A2D45' : 'transparent', borderBottom: '1px solid #1E3A5A', transition: 'background 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2D1A0E', border: '1px solid #7C2D12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>🏗️</div>
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div style={{ fontWeight: hasUnread ? '700' : '600', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: hasUnread ? '#E2E8F0' : '#94A3B8' }}>
                      {ownerName(conv)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.project?.title || 'Project'}</div>
                  </div>
                  {hasUnread && <div style={{ width: '9px', height: '9px', background: '#E8622A', borderRadius: '50%', flexShrink: 0 }} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* RIGHT — chat area */}
      {!selected ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748B', gap: '10px' }}>
          <div style={{ fontSize: '40px' }}>💬</div>
          <p style={{ fontSize: '14px' }}>Select a conversation to start chatting</p>
          <p style={{ fontSize: '12px', color: '#475569', textAlign: 'center', maxWidth: '260px', lineHeight: '1.6' }}>
            Or click <strong style={{ color: '#E2E8F0' }}>💬 Message Owner</strong> on any available project card
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>

          {/* Chat header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E3A5A', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#0B2924', border: '1px solid #0F6B52', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
              🏠
            </div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '15px' }}>{ownerName(selected)}</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '1px' }}>
                {selected.project?.title} · {selected.project?.project_code}
              </div>
              <a href={`/constructor/owner/${selected.owner_id}`}
                style={{ fontSize: '11px', color: '#E8622A', textDecoration: 'none', marginTop: '2px', display: 'inline-block' }}>
                👤 View Profile →
              </a>
            </div>
            <button
              onClick={() => {
                if (!confirm('Hide this conversation from your view?')) return
                // Store hidden conversation ID in localStorage — only hides for this user
                const hidden = JSON.parse(localStorage.getItem(`b2b_hidden_convs_${user?.id}`) || '[]')
                hidden.push(selected.id)
                localStorage.setItem(`b2b_hidden_convs_${user?.id}`, JSON.stringify(hidden))
                setConversations(prev => prev.filter(c => c.id !== selected.id))
                setSelected(null)
                setMessages([])
                window.history.pushState({}, '', '/constructor/messages')
              }}
              style={{ marginLeft: 'auto', background: 'none', border: '1px solid #7F1D1D', color: '#F87171', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}
              title="Delete conversation"
            >
              🗑 Delete Chat
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', paddingTop: '50px', color: '#64748B' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>👋</div>
                <p style={{ fontSize: '14px', marginBottom: '6px' }}>Start the conversation!</p>
                <p style={{ fontSize: '13px', color: '#475569' }}>Introduce yourself to {ownerName(selected)}.</p>
              </div>
            )}
            {messages.filter(m => !deletedMsgIds.has(m.id)).map((m, i) => (
              <div key={m.id}
                onMouseEnter={() => setHoveredMsgId(m.id)}
                onMouseLeave={() => setHoveredMsgId(null)}
                style={{ display: 'flex', justifyContent: m.sender_id === user?.id ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '6px' }}>
                {m.sender_id === user?.id && hoveredMsgId === m.id && (
                  <button onClick={() => deleteMessage(m.id)}
                    style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', fontSize: '13px', padding: '2px 4px', flexShrink: 0, opacity: 0.7 }}>🗑</button>
                )}
                <div style={{
                  padding: m.body.startsWith('[IMAGE]') ? '6px' : '10px 14px',
                  maxWidth: '72%', fontSize: '14px', lineHeight: '1.5',
                  borderRadius: m.sender_id === user?.id ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  background: m.sender_id === user?.id ? '#160E38' : '#111E2E',
                  border: m.sender_id === user?.id ? 'none' : '1px solid #4E44B0',
                }}>
                  {renderBody(m.body)}
                  {!m.body.startsWith('[IMAGE]') && (
                    <div style={{ fontSize: '11px', opacity: 0.4, marginTop: '4px', textAlign: m.sender_id === user?.id ? 'right' : 'left' }}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} style={{ padding: '14px 20px', borderTop: '1px solid #1E3A5A', display: 'flex', gap: '8px', alignItems: 'flex-end', flexShrink: 0 }}>
            <button type="button" onClick={() => imgRef.current?.click()}
              style={{ ...S.btnGhost, padding: '10px 12px', flexShrink: 0, fontSize: '18px', height: '44px' }}
              title="Send image">📷</button>
            <input ref={imgRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e) } }}
              placeholder={`Message ${ownerName(selected)}...`}
              style={{ flex: 1 }}
            />
            <button type="submit" style={{ ...S.btnPrimary, padding: '10px 18px', flexShrink: 0 }} disabled={sending || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
