import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function embedText(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-embedding-001",
    });
    const result = await model.embedContent({
      content: {
        parts: [{ text }],
        role: 'user'
      }
    })
    return result.embedding.values
  } catch (error: any) {
    console.error('Embedding error:', error?.message)
    throw new Error('Failed to generate embedding: ' + error?.message)
  }
}