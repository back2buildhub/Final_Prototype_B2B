import { createClient } from '@supabase/supabase-js'
import { embedText } from './embedder'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function retrieveRelevantKnowledge(query: string, limit = 4): Promise<string> {
  try {
    // Convert the user's question into a vector
    const queryEmbedding = await embedText(query)

    // Search Supabase for the most similar chunks
    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: limit
    })

    if (error) {
      console.error('RAG retrieval error:', error.message)
      return ''
    }

    if (!data || data.length === 0) {
      console.log('No relevant knowledge found for query:', query)
      return ''
    }

    console.log(`RAG: Found ${data.length} relevant chunks for query`)

    // Format the retrieved chunks into readable text for the prompt
    const formatted = data
      .map((item: any) =>
        `[${item.category.toUpperCase()} — ${item.title}]\n${item.content}`
      )
      .join('\n\n')

    return formatted

  } catch (error: any) {
    console.error('RAG retriever error:', error?.message)
    return ''
  }
}