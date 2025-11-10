/**
 * Mock Language Model for Testing
 * 
 * Provides a mock implementation of the AI SDK LanguageModel interface
 * for use in tests without requiring actual API calls.
 */

import type { LanguageModel, LanguageModelV1 } from 'ai';

/**
 * Creates a mock language model that returns predefined responses
 */
export function createMockLanguageModel(): LanguageModel {
  const mockModel: LanguageModel = {
    specificationVersion: 'v1',
    provider: 'mock',
    modelId: 'mock-model',
    
    doGenerate: async (options) => {
      // Return a mock response based on the prompt
      const prompt = options.prompt.map(p => {
        if (p.role === 'user') {
          return p.content.map(c => {
            if (c.type === 'text') {
              return c.text;
            }
            return '';
          }).join(' ');
        }
        return '';
      }).join(' ');

      const mockResponse = generateMockResponse(prompt);

      return {
        text: mockResponse,
        finishReason: 'stop' as const,
        usage: {
          promptTokens: prompt.split(' ').length,
          completionTokens: mockResponse.split(' ').length,
          totalTokens: prompt.split(' ').length + mockResponse.split(' ').length,
        },
        rawCall: {
          rawPrompt: prompt,
          rawSettings: {},
        },
        response: {
          id: `mock-${Date.now()}`,
          timestamp: new Date(),
          modelId: 'mock-model',
        },
        warnings: undefined,
        request: {
          body: JSON.stringify({ prompt }),
        },
      };
    },

    doStream: async (options) => {
      // Return a mock stream
      const prompt = options.prompt.map(p => {
        if (p.role === 'user') {
          return p.content.map(c => {
            if (c.type === 'text') {
              return c.text;
            }
            return '';
          }).join(' ');
        }
        return '';
      }).join(' ');

      const mockResponse = generateMockResponse(prompt);
      const chunks = mockResponse.split(' ');

      return {
        stream: createMockStream(chunks),
        rawCall: {
          rawPrompt: prompt,
          rawSettings: {},
        },
        warnings: undefined,
        request: {
          body: JSON.stringify({ prompt }),
        },
      };
    },
  } as LanguageModel;

  return mockModel;
}

/**
 * Generate a mock response based on the input prompt
 */
function generateMockResponse(prompt: string): string {
  // Provide different responses based on keywords in the prompt
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('outline')) {
    return 'Mock Outline:\n1. Introduction\n2. Main Content\n3. Conclusion\n\nThis is a generated outline based on your request.';
  }

  if (lowerPrompt.includes('draft')) {
    return 'Mock Draft:\n\nIntroduction: This is the beginning of your content.\n\nMain Section: Here is the detailed content explaining the topic.\n\nConclusion: Summarizing the key points discussed.';
  }

  if (lowerPrompt.includes('critique') || lowerPrompt.includes('review')) {
    return 'Mock Critique:\n\nStrengths:\n- Clear structure\n- Good flow\n\nAreas for improvement:\n- Add more details\n- Include examples';
  }

  if (lowerPrompt.includes('question')) {
    return 'Mock Question:\n\nWhat specific aspects would you like to focus on?\nShould we include more technical details?';
  }

  if (lowerPrompt.includes('reflection')) {
    return 'Mock Reflection:\n\nConsidering the feedback, we should:\n- Enhance the introduction\n- Add more concrete examples\n- Strengthen the conclusion';
  }

  // Default response
  return 'This is a mock response to your prompt. The content is generated for testing purposes.';
}

/**
 * Create a mock async iterable stream
 */
function createMockStream(chunks: string[]): ReadableStream<any> {
  let index = 0;

  return new ReadableStream({
    async pull(controller) {
      if (index < chunks.length) {
        controller.enqueue({
          type: 'text-delta' as const,
          textDelta: chunks[index] + ' ',
        });
        index++;
      } else {
        controller.enqueue({
          type: 'finish' as const,
          finishReason: 'stop' as const,
          usage: {
            promptTokens: 10,
            completionTokens: chunks.length,
            totalTokens: 10 + chunks.length,
          },
        });
        controller.close();
      }
    },
  });
}

/**
 * Mock language model with configurable responses
 */
export function createConfigurableMockModel(responses: Record<string, string>): LanguageModel {
  const baseModel = createMockLanguageModel();
  
  return {
    ...baseModel,
    doGenerate: async (options) => {
      const prompt = options.prompt.map(p => {
        if (p.role === 'user') {
          return p.content.map(c => {
            if (c.type === 'text') {
              return c.text;
            }
            return '';
          }).join(' ');
        }
        return '';
      }).join(' ');

      // Check if we have a configured response
      for (const [key, response] of Object.entries(responses)) {
        if (prompt.toLowerCase().includes(key.toLowerCase())) {
          return {
            text: response,
            finishReason: 'stop' as const,
            usage: {
              promptTokens: prompt.split(' ').length,
              completionTokens: response.split(' ').length,
              totalTokens: prompt.split(' ').length + response.split(' ').length,
            },
            rawCall: {
              rawPrompt: prompt,
              rawSettings: {},
            },
            response: {
              id: `mock-${Date.now()}`,
              timestamp: new Date(),
              modelId: 'mock-model',
            },
            warnings: undefined,
            request: {
              body: JSON.stringify({ prompt }),
            },
          };
        }
      }

      // Fall back to default behavior
      return baseModel.doGenerate!(options);
    },
  } as LanguageModel;
}
