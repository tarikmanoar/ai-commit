import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import { ConfigKeys, ConfigurationManager } from './config';

/**
 * OpenAI API configuration and utilities.
 * Supports GPT-4, GPT-4o, GPT-4o-mini via Chat Completions API,
 * and GPT-5, o-series models via Responses API.
 */

// Models that require the Responses API (GPT-5 and o-series reasoning models)
const RESPONSES_API_MODELS = [
  'gpt-5',
  'gpt-5-turbo',
  'gpt-5-preview',
  'gpt-5-2025',
  'chatgpt-5',
  'o1-preview',
  'o1-mini',
  'o1',
  'o2',
  'o3',
  'o3-mini',
  'o3-pro'
];

/**
 * Checks if a model requires the Responses API.
 * GPT-5 and o-series reasoning models work best with the Responses API.
 * @param {string} model - The model identifier to check.
 * @returns {boolean} - True if the model requires the Responses API.
 */
export function requiresResponsesAPI(model: string): boolean {
  return RESPONSES_API_MODELS.some(m => model.toLowerCase().includes(m.toLowerCase()));
}

/**
 * Creates and returns an OpenAI configuration object.
 * @returns {Object} - The OpenAI configuration object.
 * @throws {Error} - Throws an error if the API key is missing or empty.
 */
function getOpenAIConfig() {
  const configManager = ConfigurationManager.getInstance();
  const apiKey = configManager.getConfig<string>(ConfigKeys.OPENAI_API_KEY);
  const baseURL = configManager.getConfig<string>(ConfigKeys.OPENAI_BASE_URL);
  const apiVersion = configManager.getConfig<string>(ConfigKeys.AZURE_API_VERSION);

  if (!apiKey) {
    throw new Error('The OPENAI_API_KEY environment variable is missing or empty.');
  }

  const config: {
    apiKey: string;
    baseURL?: string;
    defaultQuery?: { 'api-version': string };
    defaultHeaders?: { 'api-key': string };
  } = {
    apiKey
  };

  if (baseURL) {
    config.baseURL = baseURL;
    if (apiVersion) {
      config.defaultQuery = { 'api-version': apiVersion };
      config.defaultHeaders = { 'api-key': apiKey };
    }
  }

  return config;
}

/**
 * Creates and returns an OpenAI API instance.
 * @returns {OpenAI} - The OpenAI API instance.
 */
export function createOpenAIApi() {
  const config = getOpenAIConfig();
  return new OpenAI(config);
}

/**
 * Sends a chat completion request using the Responses API.
 * Used for GPT-5 and o-series reasoning models.
 * @param {Array<Object>} messages - The messages to send to the API.
 * @returns {Promise<string>} - A promise that resolves to the API response text.
 */
async function chatWithResponsesAPI(messages: ChatCompletionMessageParam[]): Promise<string> {
  const openai = createOpenAIApi();
  const configManager = ConfigurationManager.getInstance();
  const model = configManager.getConfig<string>(ConfigKeys.OPENAI_MODEL);
  const reasoningEffort = configManager.getConfig<string>(ConfigKeys.OPENAI_REASONING_EFFORT, 'medium');
  const textVerbosity = configManager.getConfig<string>(ConfigKeys.OPENAI_TEXT_VERBOSITY, 'medium');

  // Convert messages format from Chat Completions to Responses API format
  // Responses API uses "developer" role instead of "system" in some cases
  const inputMessages = messages.map(msg => {
    // Keep system messages as-is, convert others
    return {
      role: msg.role === 'system' ? 'developer' : msg.role as 'user' | 'assistant' | 'developer',
      content: typeof msg.content === 'string' ? msg.content : ''
    };
  });

  try {
    // Use the Responses API for GPT-5 and o-series models
    const response = await openai.responses.create({
      model,
      input: inputMessages,
      reasoning: {
        effort: reasoningEffort as 'minimal' | 'low' | 'medium' | 'high'
      },
      text: {
        verbosity: textVerbosity as 'low' | 'medium' | 'high'
      }
    });

    // Extract text from the response output
    const textOutput = response.output
      .filter(item => item.type === 'message')
      .map(item => {
        const msgItem = item as { type: 'message'; content?: Array<{ type: string; text?: string }> };
        return msgItem.content?.[0]?.text || '';
      })
      .join('');

    return textOutput;
  } catch (error) {
    console.error('Responses API error:', error);
    throw error;
  }
}

/**
 * Sends a chat completion request using the Chat Completions API.
 * Used for GPT-4, GPT-4o, GPT-4o-mini and other non-reasoning models.
 * @param {Array<Object>} messages - The messages to send to the API.
 * @returns {Promise<string>} - A promise that resolves to the API response.
 */
async function chatWithCompletionsAPI(messages: ChatCompletionMessageParam[]): Promise<string> {
  const openai = createOpenAIApi();
  const configManager = ConfigurationManager.getInstance();
  const model = configManager.getConfig<string>(ConfigKeys.OPENAI_MODEL);
  const temperature = configManager.getConfig<number>(ConfigKeys.OPENAI_TEMPERATURE, 0.7);

  // For reasoning models (o1, o3), temperature must be null or undefined
  // These models have their own internal reasoning process
  const isReasoningModel = model.startsWith('o1') || model.startsWith('o3');

  const completion = await openai.chat.completions.create({
    model,
    messages: messages as ChatCompletionMessageParam[],
    temperature: isReasoningModel ? undefined : temperature
  });

  return completion.choices[0]!.message?.content || '';
}

/**
 * Sends a chat completion request to the OpenAI API.
 * Automatically selects the appropriate API (Responses vs Chat Completions)
 * based on the model type and user preference:
 * - Responses API for GPT-5 and o-series reasoning models (when API type is 'response')
 * - Chat Completions API for GPT-4, GPT-4o, GPT-4o-mini, etc. (default: 'completion')
 * 
 * @param {Array<Object>} messages - The messages to send to the API.
 * @returns {Promise<string>} - A promise that resolves to the API response text.
 */
export async function ChatGPTAPI(messages: ChatCompletionMessageParam[]): Promise<string> {
  const configManager = ConfigurationManager.getInstance();
  const model = configManager.getConfig<string>(ConfigKeys.OPENAI_MODEL);
  const apiType = configManager.getConfig<string>(ConfigKeys.OPENAI_API_TYPE, 'completion');

  // Use Responses API if explicitly set to 'response' or if model is GPT-5/o-series (auto-detect)
  const useResponsesAPI = apiType === 'response' || requiresResponsesAPI(model);

  if (useResponsesAPI) {
    return chatWithResponsesAPI(messages);
  } else {
    return chatWithCompletionsAPI(messages);
  }
}