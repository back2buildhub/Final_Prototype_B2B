import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

// Called when constructor withdraws money from their earnings wallet
export async function POST(request: NextRequest) {
  try {
    const { constructorId, amount, constructorName, bankDetails } = await request.json()
    if (!constructorId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const withdrawAmount = parseFloat(amount)
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    if (withdrawAmount < 1000) {
      return NextResponse.json({ error: 'Minimum withdrawal is LKR 1,000' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Check constructor wallet
    const { data: wallet } = await admin.from('wallets').select('*').eq('user_id', constructorId).single()
    if (!wallet || wallet.balance < withdrawAmount) {
      return NextResponse.json({ error: `Insufficient balance. Available: LKR ${wallet?.balance?.toLocaleString() || 0}` }, { status: 400 })
    }

    // Deduct from wallet
    const newBalance = wallet.balance - withdrawAmount
    await admin.from('wallets').update({
      balance: newBalance,
      updated_at: new Date().toISOString()
    }).eq('user_id', constructorId)

    // Record transaction
    const txCode = 'B2B-TXN-' + Math.floor(10000 + Math.random() * 90000)
    const receiptCode = 'B2B-WDR-' + Math.floor(10000 + Math.random() * 90000)

    await admin.from('wallet_transactions').insert({
      transaction_code: txCode,
      user_id: constructorId,
      amount: withdrawAmount,
      transaction_type: 'refund',
      from_entity: 'constructor_wallet',
      to_entity: 'bank_account',
      description: `Withdrawal to bank account — ${receiptCode}`
    })

    // Return receipt data
    const receipt = {
      receiptCode,
      txCode,
      date: new Date().toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' }),
      time: new Date().toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }),
      constructorName,
      withdrawAmount,
      remainingBalance: newBalance,
      bankDetails: bankDetails || 'Bank transfer processed',
      status: 'Completed'
    }

    return NextResponse.json({ success: true, receipt })
  } catch (error: any) {
    console.error('Withdrawal error:', error)
    return NextResponse.json({ error: error.message || 'Withdrawal failed' }, { status: 500 })
  }
}
