import * as vscode from 'vscode';
import { CommandManager } from './commands';
import { ConfigurationManager, SecretKeys } from './config';

/**
 * Activates the extension and registers commands.
 *
 * @param {vscode.ExtensionContext} context - The context for the extension.
 */
export async function activate(context: vscode.ExtensionContext) {
  try {
    const configManager = ConfigurationManager.getInstance(context);

    const commandManager = new CommandManager(context);
    commandManager.registerCommands();

    context.subscriptions.push({
      dispose: () => {
        configManager.dispose();
        commandManager.dispose();
      }
    });

    // Check if API key is configured (using SecretStorage)
    const apiKey = await configManager.getOpenAIApiKey();
    if (!apiKey) {
      const result = await vscode.window.showWarningMessage(
        'OpenAI API Key not configured. Would you like to set it now?',
        'Set API Key',
        'Later'
      );

      if (result === 'Set API Key') {
        await vscode.commands.executeCommand('ai-commit.setOpenAIApiKey');
      }
    }
  } catch (error) {
    console.error('Failed to activate extension:', error);
    throw error;
  }
}

/**
 * Deactivates the extension.
 * This function is called when the extension is deactivated.
 */
export function deactivate() {}