import { createClient } from '@supabase/supabase-js'
import { embedText } from './embedder'
import { knowledgeChunks } from './knowledgeBase'

// Uses service role key so it can bypass RLS for ingestion
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function ingestKnowledge() {
  console.log('Starting RAG knowledge ingestion...')
  console.log(`Total chunks to process: ${knowledgeChunks.length}`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < knowledgeChunks.length; i++) {
    const chunk = knowledgeChunks[i]
    console.log(`Processing ${i + 1}/${knowledgeChunks.length}: ${chunk.title}`)

    try {
      // Convert text to vector using Gemini embedding model
      const embedding = await embedText(chunk.title + ' ' + chunk.content)

      // Store in Supabase knowledge_base table
      const { error } = await supabase.from('knowledge_base').insert({
        title: chunk.title,
        category: chunk.category,
        content: chunk.content,
        embedding
      })

      if (error) {
        console.error(`Error inserting "${chunk.title}":`, error.message)
        errorCount++
      } else {
        console.log(`Inserted: ${chunk.title}`)
        successCount++
      }
    } catch (err: any) {
      console.error(`Failed to process "${chunk.title}":`, err.message)
      errorCount++
    }

    // Wait 600ms between each chunk to avoid Gemini rate limits
    await new Promise(r => setTimeout(r, 600))
  }

  console.log(`Ingestion complete. Success: ${successCount}, Errors: ${errorCount}`)
  return { successCount, errorCount, total: knowledgeChunks.length }
}