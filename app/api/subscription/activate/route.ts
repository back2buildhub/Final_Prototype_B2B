import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, userEmail, userName, userRole } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Check wallet balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single()

    if (!wallet || wallet.balance < 1000) {
      return NextResponse.json({
        error: 'Insufficient wallet balance. You need LKR 1,000 to activate Pro. Please top up your wallet first.'
      }, { status: 400 })
    }

    // Deduct LKR 1,000 from wallet
    const { error: walletError } = await supabase
      .from('wallets')
      .update({ balance: wallet.balance - 1000 })
      .eq('user_id', userId)

    if (walletError) {
      return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 })
    }

    // Record the transaction
    await supabase.from('wallet_transactions').insert({
      user_id: userId,
      type: 'subscription',
      amount: -1000,
      description: 'Back2Build Pro subscription — lifetime access',
      reference: 'PRO-' + Date.now()
    })

    // Activate pro status on profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        is_pro: true,
        pro_activated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (profileError) {
      return NextResponse.json({ error: 'Failed to activate Pro' }, { status: 500 })
    }

    // Record subscription
    await supabase.from('subscriptions').insert({
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      user_role: userRole,
      amount: 1000,
      payment_method: 'wallet',
      status: 'active',
      activated_by: 'self'
    })

    return NextResponse.json({
      success: true,
      message: 'Pro activated successfully! You now have lifetime access to all Pro features.'
    })

  } catch (error: any) {
    console.error('Subscription error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}