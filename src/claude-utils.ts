import { exec } from 'child_process';
import { promisify } from 'util';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigKeys, ConfigurationManager } from './config';

const execAsync = promisify(exec);

/**
 * Sends a chat completion request to Claude using the Anthropic API.
 * @param {Array<Object>} messages - The messages to send to Claude.
 * @param {string} apiKey - The Anthropic API key.
 * @returns {Promise<string>} - A promise that resolves to the API response.
 */
async function callClaudeAPI(messages: any[], apiKey: string): Promise<string> {
  const configManager = ConfigurationManager.getInstance();
  const model = configManager.getConfig<string>(ConfigKeys.CLAUDE_MODEL, 'claude-sonnet-4-5');
  const temperature = configManager.getConfig<number>(ConfigKeys.CLAUDE_TEMPERATURE, 0.7);

  const anthropic = new Anthropic({ apiKey });

  // Convert messages to Claude format
  const systemMessage = messages.find(msg => msg.role === 'system');
  const conversationMessages = messages
    .filter(msg => msg.role !== 'system')
    .map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    temperature,
    system: systemMessage?.content,
    messages: conversationMessages
  });

  // Extract text from the response
  const textContent = response.content.find(block => block.type === 'text');
  if (textContent && textContent.type === 'text') {
    return textContent.text;
  }
  return '';
}

/**
 * Sends a chat completion request to Claude using the installed CLI command.
 * @param {Array<Object>} messages - The messages to send to Claude.
 * @returns {Promise<string>} - A promise that resolves to the API response.
 */
async function callClaudeCLI(messages: any[]): Promise<string> {
  // Combine all messages into a single prompt
  const systemMessage = messages.find(msg => msg.role === 'system');
  const userMessages = messages.filter(msg => msg.role !== 'system');

  let fullPrompt = '';

  if (systemMessage) {
    fullPrompt += systemMessage.content + '\n\n';
  }

  fullPrompt += userMessages.map(msg => msg.content).join('\n\n');

  // Escape the prompt for shell
  const escapedPrompt = fullPrompt.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');

  // Call the claude CLI command
  const { stdout, stderr } = await execAsync(`echo "${escapedPrompt}" | claude`, {
    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    timeout: 60000 // 60 second timeout
  });

  if (stderr && !stdout) {
    throw new Error(`Claude CLI error: ${stderr}`);
  }

  return stdout.trim();
}

/**
 * Sends a chat completion request to Claude.
 * Automatically chooses between API and CLI based on whether API key is configured.
 * @param {Array<Object>} messages - The messages to send to Claude.
 * @returns {Promise<string>} - A promise that resolves to the API response.
 */
export async function ClaudeAPI(messages: any[]): Promise<string> {
  try {
    const configManager = ConfigurationManager.getInstance();
    const apiKey = configManager.getConfig<string>(ConfigKeys.CLAUDE_API_KEY, '');

    // If API key is configured, use the Anthropic API
    if (apiKey && apiKey.trim() !== '') {
      return await callClaudeAPI(messages, apiKey);
    }

    // Otherwise, use the Claude CLI (requires 'claude setup-token')
    return await callClaudeCLI(messages);

  } catch (error: any) {
    console.error('Claude API call failed:', error);

    // Provide helpful error messages
    if (error.code === 'ENOENT') {
      throw new Error('Claude CLI not found. Please install Claude Code CLI or configure an API key: https://claude.com/claude-code');
    }

    if (error.message && error.message.includes('not authenticated')) {
      throw new Error('Claude CLI not authenticated. Run: claude setup-token (or configure an API key in settings)');
    }

    throw error;
  }
}
