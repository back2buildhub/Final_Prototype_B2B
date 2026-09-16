'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getOtherAccounts, SavedAccount } from '@/lib/accounts'

export default function AccountSwitcher({ currentEmail }: { currentEmail: string }) {
  const router = useRouter()
  const [others, setOthers] = useState<SavedAccount[]>([])
  const [switching, setSwitching] = useState('')

  useEffect(() => {
    // Load other saved accounts on mount
    setOthers(getOtherAccounts(currentEmail))
  }, [currentEmail])

  if (others.length === 0) return null

  async function switchTo(account: SavedAccount) {
    setSwitching(account.email)

    // Sign out of current account
    await supabase.auth.signOut()

    // Sign in to the selected account
    const { error } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    })

    if (error) {
      alert('Could not switch account: ' + error.message)
      setSwitching('')
      return
    }

    // Redirect to correct dashboard
    router.push(account.role === 'constructor' ? '/constructor' : '/owner')
  }

  return (
    <div style={{ borderTop: '1px solid #1E3A5A', padding: '10px 8px 4px' }}>
      <div style={{ fontSize: '10px', color: '#475569', padding: '0 4px 6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>
        Switch Account
      </div>
      {others.map(acc => (
        <button
          key={acc.email}
          onClick={() => switchTo(acc)}
          disabled={switching === acc.email}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
            background: switching === acc.email ? '#1A2D45' : 'transparent',
            marginBottom: '2px', transition: 'background 0.15s', textAlign: 'left',
          }}
          onMouseEnter={e => { if (switching !== acc.email) (e.currentTarget as HTMLButtonElement).style.background = '#1A2D45' }}
          onMouseLeave={e => { if (switching !== acc.email) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        >
          {/* Role icon */}
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
            background: acc.role === 'property_owner' ? '#2D1A0E' : '#160E38',
            border: `1px solid ${acc.role === 'property_owner' ? '#7C2D12' : '#4E44B0'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
          }}>
            {acc.role === 'property_owner' ? '🏠' : '🏗️'}
          </div>

          {/* Account info */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {switching === acc.email ? 'Switching...' : acc.name}
            </div>
            <div style={{ fontSize: '10px', color: acc.role === 'property_owner' ? '#FB923C' : '#AFA9EC' }}>
              {acc.role === 'property_owner' ? 'Property Owner' : 'Constructor'}
            </div>
          </div>

          {/* Arrow */}
          {switching !== acc.email && (
            <div style={{ fontSize: '12px', color: '#475569' }}>→</div>
          )}
        </button>
      ))}
    </div>
  )
}
