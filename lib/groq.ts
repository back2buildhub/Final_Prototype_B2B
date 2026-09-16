import Groq from 'groq-sdk'
import { detectIntent, getIntentLabel, AIIntent, UserRole, ProjectContext } from './ai/intentRouter'
import { SYSTEM_PROMPT } from './ai/prompts/system'
import { PROPOSAL_PROMPT } from './ai/prompts/proposal'
import { ESTIMATE_PROMPT } from './ai/prompts/estimate'
import { MATERIAL_PROMPT } from './ai/prompts/material'
import { PROGRESS_PROMPT } from './ai/prompts/progress'
import { INVOICE_PROMPT } from './ai/prompts/invoice'
import { retrieveRelevantKnowledge } from './rag/retriever'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

function selectPrompt(intent: AIIntent, role: UserRole): string {
  const ownerContext = `\nIMPORTANT: You are speaking to a PROPERTY OWNER. They are hiring constructors, not doing the work themselves. Tailor your advice from the perspective of someone managing and paying for a construction project.`
  const constructorContext = `\nIMPORTANT: You are speaking to a CONSTRUCTOR (builder/contractor). They are doing the actual construction work. Tailor your advice from the perspective of a construction professional.`
  const roleContext = role === 'constructor' ? constructorContext : ownerContext

  switch (intent) {
    case 'proposal':   return PROPOSAL_PROMPT + roleContext
    case 'estimate':   return ESTIMATE_PROMPT + roleContext
    case 'material':   return MATERIAL_PROMPT + roleContext
    case 'progress':   return PROGRESS_PROMPT + roleContext
    case 'invoice':    return INVOICE_PROMPT + roleContext
    default:           return SYSTEM_PROMPT + roleContext
  }
}

function buildProjectContext(ctx: ProjectContext): string {
  return `

ACTIVE PROJECT CONTEXT:
The user is asking about a specific project. Use this data to give precise project-specific answers instead of generic ones.

Project: ${ctx.title} (${ctx.projectCode})
Service: ${ctx.service}
City: ${ctx.city}
Budget: LKR ${ctx.budget?.toLocaleString()}
Status: ${ctx.status}
Duration: ${ctx.duration}${ctx.escrowBalance !== undefined ? `
Current Escrow Balance: LKR ${ctx.escrowBalance?.toLocaleString()}` : ''}${ctx.releasedAmount !== undefined ? `
Amount Already Released to Constructor: LKR ${ctx.releasedAmount?.toLocaleString()}` : ''}

Always refer to this specific project when answering. Never give generic answers when project-specific answers are possible.`
}

export async function askBassAI(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  role: UserRole = 'property_owner',
  projectContext?: ProjectContext
): Promise<{ reply: string; intent: AIIntent; intentLabel: string; isProjectAware: boolean }> {
  const intent = detectIntent(userMessage)
  const intentLabel = getIntentLabel(intent)

  let prompt = selectPrompt(intent, role)
  if (projectContext) {
    prompt += buildProjectContext(projectContext)
  }
  const isProjectAware = !!projectContext

  // RAG — retrieve relevant knowledge from your knowledge base
  try {
    const relevantKnowledge = await retrieveRelevantKnowledge(userMessage)
    if (relevantKnowledge) {
      prompt += `\n\nRELEVANT KNOWLEDGE FROM BACK2BUILD KNOWLEDGE BASE:\n${relevantKnowledge}\n\nAlways prioritize the above verified Sri Lankan construction data when answering. Use specific prices, methods, and regulations from this knowledge base rather than general knowledge.`
    }
  } catch {
    // If RAG fails, continue without it — system still works
    console.log('RAG unavailable, continuing without knowledge retrieval')
  }

  try {
    const messages = [
      { role: 'system' as const, content: prompt },
      ...history.slice(-8).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      { role: 'user' as const, content: userMessage }
    ]

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages,
      max_tokens: 3000,
      temperature: 0.5,
    })

    const reply = completion.choices[0]?.message?.content || 'I could not generate a response.'
    return { reply, intent, intentLabel, isProjectAware }

  } catch (error: any) {
    console.error('Groq error:', error?.message)
    const reply = error?.message?.includes('401')
      ? '⚠️ Bass AI not configured. Add GROQ_API_KEY to .env.local'
      : '⚠️ Bass AI is temporarily unavailable. Please try again.'
    return { reply, intent: 'general', intentLabel: 'Construction Q&A', isProjectAware: false }
  }
}

export async function generateFollowUps(
  userMessage: string,
  aiResponse: string,
  intent: AIIntent
): Promise<string[]> {
  try {
    const prompt = `Based on this construction Q&A, generate exactly 3 short follow-up questions the user might want to ask next.

User asked: "${userMessage}"
Topic: ${intent}
AI response summary: ${aiResponse.slice(0, 200)}

Rules:
- Questions must be construction related only
- Keep each question under 10 words
- Make them naturally follow from what was just discussed
- Return ONLY a JSON array, no other text, no explanation
- Format: ["question 1", "question 2", "question 3"]`

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user' as const, content: prompt }],
      max_tokens: 800,
      reasoning_effort: 'low',
      temperature: 0.8,
    })

    const text = completion.choices[0]?.message?.content?.trim() || '[]'
    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    return Array.isArray(parsed) ? parsed.slice(0, 3) : []
  } catch {
    return []
  }
}