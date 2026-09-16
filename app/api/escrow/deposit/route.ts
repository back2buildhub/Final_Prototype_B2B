import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

// Called when owner assigns a constructor to a project
// 1. Checks owner has enough balance
// 2. Deducts 50% from owner wallet
// 3. Creates escrow record
// 4. Updates project status to ongoing
// 5. Creates conversation thread
// 6. Records all transactions

export async function POST(request: NextRequest) {
  try {
    const { ownerId, constructorId, projectId, projectBudget, projectTitle, applicationId } = await request.json()
    if (!ownerId || !constructorId || !projectId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const admin = createAdminClient()
    const depositAmount = Math.round(projectBudget * 0.5)

    // Check owner wallet balance
    const { data: wallet } = await admin.from('wallets').select('*').eq('user_id', ownerId).single()
    if (!wallet || wallet.balance < depositAmount) {
      return NextResponse.json({ error: `Insufficient balance. Need LKR ${depositAmount.toLocaleString()}` }, { status: 400 })
    }

    // 1. Deduct from owner wallet
    await admin.from('wallets').update({
      balance: wallet.balance - depositAmount,
      updated_at: new Date().toISOString()
    }).eq('user_id', ownerId)

    // 2. Create escrow record
    const escrowCode = 'B2B-ESC-' + Math.floor(1000 + Math.random() * 9000)
    const { data: escrow } = await admin.from('project_escrows').insert({
      escrow_code: escrowCode,
      project_id: projectId,
      owner_id: ownerId,
      constructor_id: constructorId,
      total_amount: projectBudget,
      deposited_amount: depositAmount,
      remaining_balance: depositAmount,
      status: 'active'
    }).select().single()

    // 3. Update project to ongoing + assign constructor
    await admin.from('projects').update({
      status: 'ongoing',
      assigned_constructor_id: constructorId
    }).eq('id', projectId)

    // 4. Accept this application, reject others
    await admin.from('project_applications').update({ status: 'accepted' }).eq('id', applicationId)
    await admin.from('project_applications').update({ status: 'rejected' })
      .eq('project_id', projectId).neq('id', applicationId)

    // 5. Create conversation thread between owner and constructor
    await admin.from('conversations').insert({
      project_id: projectId,
      owner_id: ownerId,
      constructor_id: constructorId
    })

    // 6. Record transaction
    const txCode = 'B2B-TXN-' + Math.floor(10000 + Math.random() * 90000)
    await admin.from('wallet_transactions').insert({
      transaction_code: txCode,
      user_id: ownerId,
      project_id: projectId,
      escrow_id: escrow?.id,
      amount: depositAmount,
      transaction_type: 'move_to_escrow',
      from_entity: 'owner_wallet',
      to_entity: 'project_escrow',
      description: `Initial 50% deposit for: ${projectTitle}`
    })

    return NextResponse.json({ success: true, escrowCode, depositAmount })
  } catch (error: any) {
    console.error('Escrow deposit error:', error)
    return NextResponse.json({ error: error.message || 'Deposit failed' }, { status: 500 })
  }
}
