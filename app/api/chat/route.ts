import { DataAPIClient } from '@datastax/astra-db-ts';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import OpenAI from 'openai';
const {
  DATA_STAX_API_ENDPOINT,
  DATA_STAX_TOKEN,
  DATA_STAX_NAMESPACE,
  DATA_STAX_COLLECTION,
  OPENAI_API_KEY,
} = process.env;

const openaiClient =new OpenAI({ apiKey: OPENAI_API_KEY! });
const astraClient = new DataAPIClient(DATA_STAX_TOKEN!);
const db = astraClient.db(DATA_STAX_API_ENDPOINT!, { keyspace: DATA_STAX_NAMESPACE! });

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const userMessage = messages[messages.length - 1]?.content || '';

    // Get embedding for the user message
    const embeddingResponse = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: userMessage,
      encoding_format: 'float'
    });
    const userEmbedding = embeddingResponse.data[0].embedding;

    // Query Astra DB for similar chunks
    const collection = db.collection(DATA_STAX_COLLECTION!);
    const similarChunks = await collection
      .find({ $vector: userEmbedding, $limit: 10 })
      .toArray();

    // Build context from the most relevant chunks
    const context = similarChunks.map(doc => doc.text).join('\n\n');

    // Compose system prompt with context and embedding info
    const systemPrompt = `You are a One Piece expert. Use the following context to answer the user's question as accurately as possible:\n${context}\n------------\nQUESTION: ${userMessage}\n------------`;

    // Stream response using ai-sdk
    const result = streamText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      messages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Error in POST handler:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
