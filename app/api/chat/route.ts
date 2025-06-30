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

const openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY! });
const astraClient = new DataAPIClient(DATA_STAX_TOKEN!);
const db = astraClient.db(DATA_STAX_API_ENDPOINT!, { keyspace: DATA_STAX_NAMESPACE! });

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const userMessage = messages[messages.length - 1]?.content || '';
    console.log('User message:', userMessage);
    console.log('Messages:', messages);
    // Get embedding for the user message
    const embeddingResponse = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: userMessage,
      encoding_format: 'float'
    });
    const userEmbedding = embeddingResponse.data[0].embedding;
    console.log('User embedding:', userEmbedding);
    // Query Astra DB for similar chunks
    const collection = db.collection(DATA_STAX_COLLECTION!);
    const similarChunks = await collection.find({}, {
      sort: {
        $vector: userEmbedding
      },
      limit:100
    }).toArray()
    let context = ''
    if (!similarChunks || similarChunks.length === 0) {
      context = ''
    } else {
      context = similarChunks.map((doc) => doc.text).join('\n\n');
    }
    // Compose system prompt with context and embedding info
    console.log('Context:', context);
    const systemPrompt = `You are a One Piece expert trained in the full canon of the series, including the manga, anime, movies, and official databooks. Use the following context to answer the user's question with high accuracy and detail. Avoid making up information; if the answer is not found in the context, clearly state so or provide logical speculation with a disclaimer.

----------------------
📚 Context:
${context}
----------------------

❓ Question:
${userMessage}

----------------------
🧠 Instructions:
- Base your answer primarily on the above context.
- Be detailed, accurate, and avoid hallucination.
- Use bullet points, markdown-style emphasis (like **bold** or *italics*) if needed.
- Keep the tone informative and in-universe.

Begin your response below:
`;

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
