export type ProjectContext = {
  title: string
  projectCode: string
  service: string
  city: string
  budget: number
  status: string
  duration: string
  escrowBalance?: number
  releasedAmount?: number
}

export type AIIntent = 'proposal' | 'estimate' | 'material' | 'progress' | 'invoice' | 'general'

export type UserRole = 'property_owner' | 'constructor'

export function detectIntent(message: string): AIIntent {
  const text = message.toLowerCase()

  // Proposal / Bid writing
  if (
    text.includes('proposal') || text.includes('bid') ||
    text.includes('quotation') || text.includes('quote') ||
    text.includes('write a bid') || text.includes('write proposal')
  ) return 'proposal'

  // Cost estimation
  if (
    text.includes('estimate') || text.includes('how much will') ||
    text.includes('what will it cost') || text.includes('cost of') ||
    text.includes('price of') || text.includes('budget for') ||
    text.includes('how much does') || text.includes('lkr')
  ) return 'estimate'

  // Material calculations
  if (
    text.includes('how many tiles') || text.includes('how many bags') ||
    text.includes('calculate material') || text.includes('material needed') ||
    text.includes('how much cement') || text.includes('how much paint') ||
    text.includes('quantity') || text.includes('sq ft') ||
    text.includes('square feet') || text.includes('square meter') ||
    text.includes('how many bricks') || text.includes('how much sand')
  ) return 'material'

  // Progress reports
  if (
    text.includes('progress report') || text.includes('daily report') ||
    text.includes('site report') || text.includes("today's work") ||
    text.includes('generate report') || text.includes('write report') ||
    text.includes('day ') && text.includes('report')
  ) return 'progress'

  // Invoice / billing
  if (
    text.includes('invoice') || text.includes('bill ') ||
    text.includes('billing') || text.includes('receipt') ||
    text.includes('payment breakdown') || text.includes('charge')
  ) return 'invoice'

  return 'general'
}

// Human readable label for the badge shown in UI
export function getIntentLabel(intent: AIIntent): string {
  const labels: Record<AIIntent, string> = {
    proposal: 'Bid Proposal Writer',
    estimate: 'Cost Estimator',
    material: 'Material Calculator',
    progress: 'Progress Report Generator',
    invoice: 'Invoice Assistant',
    general: 'Construction Q&A',
  }
  return labels[intent]
}