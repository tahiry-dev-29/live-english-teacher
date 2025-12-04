import { genkit, z } from 'genkit/beta';
import { googleAI, gemini20Flash } from '@genkit-ai/googleai';
import { PrismaClient } from '@prisma/client';


const ai = genkit({
  plugins: [googleAI()],
});

const prisma = new PrismaClient();


export const chatWithMemory = ai.defineFlow(
  {
    name: 'chatWithMemory',
    inputSchema: z.object({
      sessionId: z.string(),
      text: z.string(),
    }),
    outputSchema: z.string(),
  },
  async ({ sessionId, text }) => {
    
    let session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    
    if (!session) {
      session = await prisma.session.create({
        data: { id: sessionId },
        include: { messages: true },
      });
    }

    
    let targetLanguage = session.learningLanguage;

    if (!targetLanguage) {
      
      const detection = await ai.generate({
        model: gemini20Flash,
        prompt: `Detect the language of the following text. Return ONLY the ISO 639-1 code (e.g., 'fr', 'en', 'es'). Text: "${text}"`,
        config: { temperature: 0 },
      });
      targetLanguage = detection.text.trim().toLowerCase();

      
      await prisma.session.update({
        where: { id: sessionId },
        data: { learningLanguage: targetLanguage },
      });
    }

    
    const history = session.messages.map((m) => ({
      role: m.role as 'user' | 'model',
      content: [{ text: m.content }],
    }));

    
    const response = await ai.generate({
      model: gemini20Flash,
      prompt: text,
      messages: history,
      system: `You are a helpful assistant. Always answer in ${targetLanguage}, regardless of the user's input language in subsequent turns.`,
    });

    const responseText = response.text;

    
    await prisma.$transaction([
      prisma.message.create({
        data: { sessionId, role: 'user', content: text },
      }),
      prisma.message.create({
        data: { sessionId, role: 'model', content: responseText },
      }),
    ]);

    return responseText;
  }
);


export const streamChat = ai.defineFlow(
  {
    name: 'streamChat',
    inputSchema: z.object({
      sessionId: z.string(),
      text: z.string(),
    }),
    outputSchema: z.string(),
    streamSchema: z.string(),
  },
  async ({ sessionId, text }, { sendChunk }) => {
    
    let session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!session) {
      session = await prisma.session.create({
        data: { id: sessionId },
        include: { messages: true },
      });
    }

    const targetLanguage = session.learningLanguage || 'en';
    const history = session.messages.map((m) => ({
      role: m.role as 'user' | 'model',
      content: [{ text: m.content }],
    }));

    
    const { response, stream } = ai.generateStream({
      model: gemini20Flash,
      config: { temperature: 1 },
      prompt: text,
      messages: history,
      system: `You are a helpful assistant. Always answer in ${targetLanguage}.`,
    });

    
    (async () => {
      for await (const chunk of stream) {
        if (chunk.content[0]?.text) {
          sendChunk(chunk.content[0].text);
        }
      }
    })();

    const finalResponse = (await response).text;

    
    await prisma.$transaction([
      prisma.message.create({
        data: { sessionId, role: 'user', content: text },
      }),
      prisma.message.create({
        data: { sessionId, role: 'model', content: finalResponse },
      }),
    ]);

    return finalResponse;
  }
);
