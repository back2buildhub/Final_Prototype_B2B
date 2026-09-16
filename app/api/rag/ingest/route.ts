import { NextRequest, NextResponse } from 'next/server'
import { ingestKnowledge } from '@/lib/rag/ingest'

export async function POST(request: NextRequest) {
  try {
    console.log('RAG ingestion triggered...')
    const result = await ingestKnowledge()
    return NextResponse.json({
      success: true,
      message: `Knowledge base populated! ${result.successCount} chunks inserted, ${result.errorCount} errors.`,
      result
    })
  } catch (error: any) {
    console.error('Ingestion route error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}