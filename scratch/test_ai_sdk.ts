import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

// We just need a dummy provider to see the chunk format
const dummyProvider = {
  chatLanguageModel: () => ({
    provider: 'dummy',
    modelId: 'dummy',
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'text-delta', textDelta: 'Hello' });
          controller.enqueue({ type: 'text-delta', textDelta: ' World' });
          controller.close();
        }
      }),
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  }),
};

async function main() {
  const result = streamText({
    model: dummyProvider.chatLanguageModel(),
    prompt: 'test',
  });

  const response = result.toDataStreamResponse();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log("CHUNK:", decoder.decode(value));
  }
}
main();
