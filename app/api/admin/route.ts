import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Admin email — change this to your own email
const ADMIN_EMAIL = 'dinethart@gmail.com'

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user || user.email !== ADMIN_EMAIL) return false
  return true
}

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  if (type === 'users') {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    return NextResponse.json({ data })
  }

  if (type === 'subscriptions') {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
    return NextResponse.json({ data })
  }

  if (type === 'verifications') {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, city, verification_status, verification_doc_url, is_verified, created_at')
      .eq('role', 'constructor')
      .neq('verification_status', 'none')
      .order('created_at', { ascending: false })
    return NextResponse.json({ data: data || [] })
  }

  if (type === 'confirmations') {
    const { data: confs } = await supabase
      .from('payment_confirmations')
      .select('*')
      .order('created_at', { ascending: false })

    if (!confs) return NextResponse.json({ data: [] })

    // Enrich with owner and constructor names
    const enriched = await Promise.all(confs.map(async (c: any) => {
      const [{ data: owner }, { data: constructor }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', c.owner_id).single(),
        supabase.from('profiles').select('full_name').eq('id', c.constructor_id).single(),
      ])
      return {
        ...c,
        owner_name: owner?.full_name || 'Unknown',
        constructor_name: constructor?.full_name || 'Unknown',
      }
    }))

    return NextResponse.json({ data: enriched })
  }

  if (type === 'stats') {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('amount, created_at')
    const { data: profiles } = await supabase
      .from('profiles')
      .select('role, is_pro')
    const totalRevenue = subs?.reduce((sum, s) => sum + s.amount, 0) || 0
    const totalUsers = profiles?.length || 0
    const proUsers = profiles?.filter(p => p.is_pro).length || 0
    const owners = profiles?.filter(p => p.role === 'property_owner').length || 0
    const constructors = profiles?.filter(p => p.role === 'constructor').length || 0
    return NextResponse.json({ totalRevenue, totalUsers, proUsers, owners, constructors })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  if (!await verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { action, userId } = body

  if (action === 'activate_pro') {
    await supabase.from('profiles').update({
      is_pro: true,
      pro_activated_at: new Date().toISOString()
    }).eq('id', userId)

    await supabase.from('subscriptions').insert({
      user_id: userId,
      amount: 0,
      payment_method: 'admin',
      status: 'active',
      activated_by: 'admin',
      notes: 'Manually activated by admin'
    })
    return NextResponse.json({ success: true, message: 'Pro activated' })
  }

  if (action === 'deactivate_pro') {
    await supabase.from('profiles').update({
      is_pro: false,
      pro_activated_at: null
    }).eq('id', userId)
    return NextResponse.json({ success: true, message: 'Pro deactivated' })
  }

  if (action === 'verify_constructor') {
    const { userId } = body
    await supabase.from('profiles').update({
      is_verified: true,
      verification_status: 'verified'
    }).eq('id', userId)
    return NextResponse.json({ success: true, message: 'Constructor verified' })
  }

  if (action === 'reject_verification') {
    const { userId } = body
    await supabase.from('profiles').update({
      is_verified: false,
      verification_status: 'rejected'
    }).eq('id', userId)
    return NextResponse.json({ success: true, message: 'Verification rejected' })
  }

  if (action === 'release_payment') {
    const { confirmationId, amount, constructorId, escrowId, projectId } = body

    // Credit constructor wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', constructorId)
      .single()

    const commission = amount * 0.05
    const netAmount = amount - commission

    await supabase.from('wallets').update({
      balance: (wallet?.balance || 0) + netAmount
    }).eq('user_id', constructorId)

    
    await supabase.from('wallet_transactions').insert({
      user_id: constructorId,
      type: 'payment_received',
      amount: netAmount,
      description: `Payment released by admin (5% platform fee deducted)`,
      reference: 'PAY-' + Date.now()
    })

    
    const { data: escrow } = await supabase
      .from('project_escrows')
      .select('*')
      .eq('id', escrowId)
      .single()

    if (escrow) {
      await supabase.from('project_escrows').update({
        remaining_balance: escrow.remaining_balance - amount,
        released_amount: (escrow.released_amount || 0) + amount,
        platform_fee_collected: (escrow.platform_fee_collected || 0) + commission
      }).eq('id', escrowId)
    }

    
    await supabase.from('payment_confirmations').update({
      status: 'paid',
      released_at: new Date().toISOString()
    }).eq('id', confirmationId)

    return NextResponse.json({
      success: true,
      message: `LKR ${netAmount.toLocaleString()} released to constructor. Commission: LKR ${commission.toLocaleString()}`
    })
  }

  if (action === 'reject_payment') {
    const { confirmationId } = body
    await supabase.from('payment_confirmations').update({
      status: 'rejected'
    }).eq('id', confirmationId)

    return NextResponse.json({ success: true, message: 'Payment rejected' })
  }

  if (action === 'delete_user') {
    // Delete all user data first
    await supabase.from('messages').delete().eq('sender_id', userId)
    await supabase.from('conversations').delete().eq('owner_id', userId)
    await supabase.from('conversations').delete().eq('constructor_id', userId)
    await supabase.from('projects').delete().eq('owner_id', userId)
    await supabase.from('project_applications').delete().eq('constructor_id', userId)
    await supabase.from('gigs').delete().eq('constructor_id', userId)
    await supabase.from('ai_conversations').delete().eq('user_id', userId)
    await supabase.from('wallet_transactions').delete().eq('user_id', userId)
    await supabase.from('wallets').delete().eq('user_id', userId)
    await supabase.from('subscriptions').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)
    // Delete from auth
    await supabase.auth.admin.deleteUser(userId)
    return NextResponse.json({ success: true, message: 'User deleted' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}