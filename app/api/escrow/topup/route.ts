import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

// Called when property owner adds more money to an ongoing project's escrow
export async function POST(request: NextRequest) {
  try {
    const { ownerId, projectId, escrowId, amount, projectTitle } = await request.json()
    if (!ownerId || !escrowId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const topUpAmount = parseFloat(amount)
    if (isNaN(topUpAmount) || topUpAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Check owner wallet has enough
    const { data: wallet } = await admin.from('wallets').select('*').eq('user_id', ownerId).single()
    if (!wallet || wallet.balance < topUpAmount) {
      return NextResponse.json({ error: `Insufficient wallet balance. You have LKR ${wallet?.balance?.toLocaleString() || 0}` }, { status: 400 })
    }

    // Deduct from owner wallet
    await admin.from('wallets').update({
      balance: wallet.balance - topUpAmount,
      updated_at: new Date().toISOString()
    }).eq('user_id', ownerId)

    // Add to escrow
    const { data: escrow } = await admin.from('project_escrows').select('*').eq('id', escrowId).single()
    if (!escrow) return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })

    await admin.from('project_escrows').update({
      deposited_amount: escrow.deposited_amount + topUpAmount,
      remaining_balance: escrow.remaining_balance + topUpAmount,
    }).eq('id', escrowId)

    // Record transaction
    const txCode = 'B2B-TXN-' + Math.floor(10000 + Math.random() * 90000)
    await admin.from('wallet_transactions').insert({
      transaction_code: txCode,
      user_id: ownerId,
      project_id: projectId,
      escrow_id: escrowId,
      amount: topUpAmount,
      transaction_type: 'move_to_escrow',
      from_entity: 'owner_wallet',
      to_entity: 'project_escrow',
      description: `Escrow top-up for: ${projectTitle}`
    })

    return NextResponse.json({ success: true, txCode, topUpAmount, newEscrowBalance: escrow.remaining_balance + topUpAmount })
  } catch (error: any) {
    console.error('Escrow topup error:', error)
    return NextResponse.json({ error: error.message || 'Top-up failed' }, { status: 500 })
  }
}
