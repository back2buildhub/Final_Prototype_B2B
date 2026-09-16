import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      ownerId,
      escrowId,
      constructorId,
      projectId,
      progressUpdateId,
      releaseAmount,
      note
    } = body

    if (!ownerId || !escrowId || !constructorId || !projectId || !releaseAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const amount = parseFloat(releaseAmount)
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Check escrow balance
    const { data: escrow } = await supabase
      .from('project_escrows')
      .select('*')
      .eq('id', escrowId)
      .single()

    if (!escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
    }

    if (amount > escrow.remaining_balance) {
      return NextResponse.json({
        error: `Amount exceeds escrow balance. Available: LKR ${escrow.remaining_balance?.toLocaleString()}`
      }, { status: 400 })
    }

    // Check if there is already a pending confirmation for this progress update
    if (progressUpdateId) {
      const { data: existing } = await supabase
        .from('payment_confirmations')
        .select('id, status')
        .eq('progress_update_id', progressUpdateId)
        .eq('status', 'pending_admin')
        .single()

      if (existing) {
        return NextResponse.json({
          error: 'A payment confirmation is already pending admin approval for this update.'
        }, { status: 400 })
      }
    }

    
    const { data: confirmation, error } = await supabase
      .from('payment_confirmations')
      .insert({
        project_id: projectId,
        escrow_id: escrowId,
        owner_id: ownerId,
        constructor_id: constructorId,
        progress_update_id: progressUpdateId || null,
        amount,
        note: note || null,
        status: 'pending_admin'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Mark progress update as approved (owner confirmed it)
    if (progressUpdateId) {
      await supabase
        .from('progress_updates')
        .update({ status: 'approved' })
        .eq('id', progressUpdateId)
    }

    return NextResponse.json({
      success: true,
      confirmationId: confirmation.id,
      message: `Payment confirmation of LKR ${amount.toLocaleString()} sent to admin for approval. The constructor will be paid once admin releases the funds.`
    })

  } catch (error: any) {
    console.error('Release route error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}