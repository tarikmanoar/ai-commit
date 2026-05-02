import * as vscode from 'vscode';
import { generateCommitMsg } from './generate-commit-msg';
import { ConfigurationManager, SecretKeys } from './config';

/**
 * Manages the registration and disposal of commands.
 */
export class CommandManager {
  private disposables: vscode.Disposable[] = [];

  constructor(private context: vscode.ExtensionContext) {}

  registerCommands() {
    this.registerCommand('extension.ai-commit', generateCommitMsg);
    this.registerCommand('extension.configure-ai-commit', () =>
      vscode.commands.executeCommand('workbench.action.openSettings', 'ai-commit')
    );

    // Show available OpenAI models
    this.registerCommand('ai-commit.showAvailableModels', async () => {
      const configManager = ConfigurationManager.getInstance();
      const models = await configManager.getAvailableOpenAIModels();
      const selected = await vscode.window.showQuickPick(models, {
        placeHolder: 'Please select a model'
      });
      
      if (selected) {
        const config = vscode.workspace.getConfiguration('ai-commit');
        await config.update('OPENAI_MODEL', selected, vscode.ConfigurationTarget.Global);
      }
    });

    // Set OpenAI API Key securely
    this.registerCommand('ai-commit.setOpenAIApiKey', async () => {
      const configManager = ConfigurationManager.getInstance();
      const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your OpenAI API Key',
        ignoreFocusOut: true,
        password: true,
        validateInput: (value) => {
          if (!value || value.trim() === '') {
            return 'API Key cannot be empty';
          }
          return null;
        }
      });

      if (apiKey) {
        await configManager.setSecret(SecretKeys.OPENAI_API_KEY, apiKey);
        vscode.window.showInformationMessage('OpenAI API Key saved securely.');
      }
    });

    // Set Gemini API Key securely
    this.registerCommand('ai-commit.setGeminiApiKey', async () => {
      const configManager = ConfigurationManager.getInstance();
      const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your Gemini API Key',
        ignoreFocusOut: true,
        password: true,
        validateInput: (value) => {
          if (!value || value.trim() === '') {
            return 'API Key cannot be empty';
          }
          return null;
        }
      });

      if (apiKey) {
        await configManager.setSecret(SecretKeys.GEMINI_API_KEY, apiKey);
        vscode.window.showInformationMessage('Gemini API Key saved securely.');
      }
    });

    // Clear OpenAI API Key
    this.registerCommand('ai-commit.clearOpenAIApiKey', async () => {
      const result = await vscode.window.showWarningMessage(
        'Are you sure you want to clear your OpenAI API Key?',
        'Yes',
        'Cancel'
      );

      if (result === 'Yes') {
        const configManager = ConfigurationManager.getInstance();
        await configManager.deleteSecret(SecretKeys.OPENAI_API_KEY);
        vscode.window.showInformationMessage('OpenAI API Key cleared.');
      }
    });

    // Clear Gemini API Key
    this.registerCommand('ai-commit.clearGeminiApiKey', async () => {
      const result = await vscode.window.showWarningMessage(
        'Are you sure you want to clear your Gemini API Key?',
        'Yes',
        'Cancel'
      );

      if (result === 'Yes') {
        const configManager = ConfigurationManager.getInstance();
        await configManager.deleteSecret(SecretKeys.GEMINI_API_KEY);
        vscode.window.showInformationMessage('Gemini API Key cleared.');
      }
    });

    /**
     * @deprecated
     * This function is deprecated because Gemini API does not currently support listing models via API.
     * 
     * Show available Gemini models
     */
    /*
    this.registerCommand('ai-commit.showAvailableGeminiModels', async () => {
      const configManager = ConfigurationManager.getInstance();
      const models = await configManager.getAvailableGeminiModels(); // Use the updated function
      const selected = await vscode.window.showQuickPick(models, {
        placeHolder: 'Please select a Gemini model'
      });

      if (selected) {
        const config = vscode.workspace.getConfiguration('ai-commit');
        await config.update('GEMINI_MODEL', selected, vscode.ConfigurationTarget.Global);
      }
    });
    */
  }

  private registerCommand(command: string, handler: (...args: any[]) => any) {
    const disposable = vscode.commands.registerCommand(command, async (...args) => {
      try {
        await handler(...args);
      } catch (error) {
        const result = await vscode.window.showErrorMessage(
          `Failed: ${error.message}`,
          'Retry',
          'Configure'
        );

        if (result === 'Retry') {
          await handler(...args);
        } else if (result === 'Configure') {
          await vscode.commands.executeCommand(
            'workbench.action.openSettings',
            'ai-commit'
          );
        }
      }
    });

    this.disposables.push(disposable);
    this.context.subscriptions.push(disposable);
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}