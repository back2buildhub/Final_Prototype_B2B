import { NextRequest, NextResponse } from 'next/server'
import { askBassAI, generateFollowUps } from '@/lib/groq'

import { UserRole } from '@/lib/ai/intentRouter'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, history, role, projectContext } = body

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ reply: '❌ GROQ_API_KEY is missing from .env.local', intent: 'general', intentLabel: 'Construction Q&A' })
    }

    const result = await askBassAI(
      message.trim(),
      history || [],
      (role as UserRole) || 'property_owner',
      projectContext || undefined
    )

    // Second lightweight Groq call — generates follow-up suggestions
  const followUps = await generateFollowUps(message, result.reply, result.intent)
  return NextResponse.json({ ...result, followUps })

  } catch (error: any) {
    console.error('AI route error:', error)
    return NextResponse.json(
      { reply: '⚠️ Bass AI is temporarily unavailable.', intent: 'general', intentLabel: 'Construction Q&A' },
      { status: 500 }
    )
  }
}
