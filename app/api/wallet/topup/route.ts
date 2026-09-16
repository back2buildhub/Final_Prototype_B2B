import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const admin = createAdminClient()
    const topUpAmount = 50000

    // Get current wallet
    const { data: wallet, error: walletError } = await admin
      .from('wallets').select('*').eq('user_id', userId).single()

    if (walletError || !wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    // Add balance
    const newBalance = wallet.balance + topUpAmount
    await admin.from('wallets').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', userId)

    // Record transaction
    const txCode = 'B2B-TXN-' + Math.floor(10000 + Math.random() * 90000)
    await admin.from('wallet_transactions').insert({
      transaction_code: txCode,
      user_id: userId,
      amount: topUpAmount,
      transaction_type: 'wallet_topup',
      from_entity: 'demo_top_up',
      to_entity: 'owner_wallet',
      description: 'Demo wallet top-up'
    })

    return NextResponse.json({ success: true, newBalance })
  } catch (error) {
    console.error('Topup error:', error)
    return NextResponse.json({ error: 'Top-up failed' }, { status: 500 })
  }
}
