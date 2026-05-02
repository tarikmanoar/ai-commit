import { GoogleGenerativeAI } from "@google/generative-ai";
import { ConfigKeys, ConfigurationManager } from './config';

/**
 * Creates and returns a Gemini API configuration object.
 * API key is retrieved from secure SecretStorage.
 * @returns {Promise<Object>} - Promise resolving to Gemini configuration object.
 * @throws {Error} - Throws an error if the API key is missing or empty.
 */
async function getGeminiConfig() {
  const configManager = ConfigurationManager.getInstance();
  const apiKey = await configManager.getGeminiApiKey();

  if (!apiKey) {
    throw new Error('Gemini API Key not configured. Please set your API key using the "Set Gemini API Key" command.');
  }

  return {
    apiKey
  };
}

/**
 * Creates and returns a Gemini API instance.
 * API key is retrieved from secure SecretStorage.
 * @returns {Promise<GoogleGenerativeAI>} - Promise resolving to Gemini API instance.
 */
export async function createGeminiAPIClient(): Promise<GoogleGenerativeAI> {
  const config = await getGeminiConfig();
  return new GoogleGenerativeAI(config.apiKey);
}

/**
 * Sends a chat completion request to the Gemini API.
 * @param {any[]} messages - The messages to send to the API.
 * @returns {Promise<string>} - A promise that resolves to the API response.
 */
export async function GeminiAPI(messages: any[]) {
  try {
    const gemini = await createGeminiAPIClient();
    const configManager = ConfigurationManager.getInstance();
    const modelName = configManager.getConfig<string>(ConfigKeys.GEMINI_MODEL);
    const temperature = configManager.getConfig<number>(ConfigKeys.GEMINI_TEMPERATURE, 0.7);

    const model = gemini.getGenerativeModel({ model: modelName });
    const chat = model.startChat({
      generationConfig: {
        temperature: temperature,
      },
    });

    const result = await chat.sendMessage(messages.map(msg => msg.content));
    const response = result.response;
    const text = response.text();

    return text;

  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw error;
  }
}