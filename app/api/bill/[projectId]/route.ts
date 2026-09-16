import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  const [
    { data: project },
    { data: escrow },
    { data: confirmations },
    { data: progressUpdates }
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('project_escrows').select('*').eq('project_id', projectId).single(),
    supabase.from('payment_confirmations').select('*').eq('project_id', projectId).eq('status', 'paid').order('released_at', { ascending: true }),
    supabase.from('progress_updates').select('*').eq('project_id', projectId).order('created_at', { ascending: true })
  ])

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const [{ data: owner }, { data: constructor }] = await Promise.all([
    supabase.from('profiles').select('full_name, city, phone').eq('id', project.owner_id).single(),
    project.assigned_constructor_id
      ? supabase.from('profiles').select('full_name, city, phone, is_verified, experience_years').eq('id', project.assigned_constructor_id).single()
      : { data: null }
  ])

  return NextResponse.json({
    project,
    escrow,
    confirmations: confirmations || [],
    progressUpdates: progressUpdates || [],
    owner,
    constructor
  })
}