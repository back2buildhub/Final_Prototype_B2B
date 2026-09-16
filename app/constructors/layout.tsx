'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import AccountSwitcher from '@/components/AccountSwitcher'
import { supabase } from '@/lib/supabase'

export default function ConstructorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
      if (!profile || profile.role !== 'constructor') { router.push('/login'); return }
      setName(profile.full_name)
      setEmail(user.email || '')

      // Count unread messages
      const lastSeen = localStorage.getItem('b2b_constructor_messages_seen') || new Date(0).toISOString()
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('constructor_id', user.id)
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

  async function logout() { await supabase.auth.signOut(); router.push('/') }

  if (!ready) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #1E3A5A', borderTopColor: '#E8622A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  const links = [
    { href: '/constructors', label: '📊 Dashboard', exact: true },
    { href: '/constructors/projects', label: '🔍 Find Projects' },
    { href: '/constructors/gigs', label: '🎨 My Gigs' },
    { href: '/constructors/messages', label: '💬 Messages' },
    { href: '/constructors/ai', label: '🤖 Bass AI' },
    { href: '/constructors/profile', label: '👤 My Profile' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: '220px', background: '#0D1B2E', borderRight: '1px solid #1E3A5A', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 10 }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #1E3A5A', fontSize: '20px', fontWeight: '700', color: '#E8622A' }}>Back2Build</div>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1E3A5A' }}>
          <div style={{ fontSize: '11px', color: '#475569', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Constructor</div>
          <div style={{ fontWeight: '600', fontSize: '14px', color: '#E2E8F0' }}>{name}</div>
        </div>
        <nav style={{ padding: '10px 8px', flex: 1 }}>
          {links.map(link => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href)
            return (
              <a key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                <div style={{ padding: '10px 12px', borderRadius: '6px', fontSize: '14px', marginBottom: '2px', background: active ? '#2D1A0E' : 'transparent', color: active ? '#FB923C' : '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{link.label}</span>
                  {link.href === '/constructors/messages' && unreadCount > 0 && (
                    <span style={{ background: '#E8622A', color: '#fff', borderRadius: '10px', fontSize: '10px', fontWeight: '700', padding: '1px 6px', minWidth: '18px', textAlign: 'center' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
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