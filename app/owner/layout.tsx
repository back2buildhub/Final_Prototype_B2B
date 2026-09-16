'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import AccountSwitcher from '@/components/AccountSwitcher'
import { supabase } from '@/lib/supabase'

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [name, setName] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [email, setEmail] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
      if (!profile || profile.role !== 'property_owner') { router.push('/login'); return }
      setName(profile.full_name)
      setEmail(user.email || '')
      // Count unread messages
      const lastSeen = localStorage.getItem('b2b_owner_messages_seen') || new Date(0).toISOString()
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('owner_id', user.id)
      if (convs && convs.length > 0) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', convs.map((c: any) => c.id))
          .neq('sender_id', user.id)
          .gt('created_at', lastSeen)
        setUnreadCount(count || 0)
      }
      setReady(true)
    }
    checkAuth()
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!ready) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #1E3A5A', borderTopColor: '#E8622A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  const links = [
    { href: '/owner', label: '📊 Dashboard', exact: true },
    { href: '/owner/gigs', label: '🔍 Find Constructors' },
    { href: '/owner/projects', label: '📁 My Projects' },
    { href: '/owner/create-project', label: '➕ Create Project' },
    { href: '/owner/messages', label: '💬 Messages' },
    { href: '/owner/ai', label: '🤖 Bass AI' },
    { href: '/owner/profile', label: '👤 My Profile' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: '220px', background: '#0D1B2E', borderRight: '1px solid #1E3A5A', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 10 }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #1E3A5A', fontSize: '20px', fontWeight: '700', color: '#E8622A' }}>Back2Build</div>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1E3A5A' }}>
          <div style={{ fontSize: '11px', color: '#475569', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Property Owner</div>
          <div style={{ fontWeight: '600', fontSize: '14px', color: '#E2E8F0' }}>{name}</div>
        </div>
        <nav style={{ padding: '10px 8px', flex: 1 }}>
          {links.map(link => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href)
            return (
              <a key={link.href} href={link.href} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderRadius: '6px', marginBottom: '2px', textDecoration: 'none', fontSize: '14px', background: active ? '#1A2D45' : 'transparent', color: active ? '#E2E8F0' : '#94A3B8', fontWeight: active ? '600' : '400' }}>
                <span style={{ flex: 1 }}>{link.label}</span>
                {link.href === '/owner/messages' && unreadCount > 0 && (
                  <span style={{ background: '#E8622A', color: '#fff', borderRadius: '10px', fontSize: '10px', fontWeight: '700', padding: '1px 6px', minWidth: '18px', textAlign: 'center' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </a>
            )
          })}
        </nav>
        <AccountSwitcher currentEmail={email} />
        <div style={{ padding: '10px 8px', borderTop: '1px solid #1E3A5A' }}>
          <button onClick={logout} style={{ padding: '10px 12px', borderRadius: '6px', fontSize: '14px', color: '#F87171', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            🚪 Sign Out
          </button>
        </div>
      </aside>
      <main style={{ marginLeft: '220px', flex: 1, padding: '28px', minHeight: '100vh' }}>{children}</main>
    </div>
  )
}
