import { ConfigKeys, ConfigurationManager } from './config';

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  'Bangla (Bangladesh)': 'standard formal Bangla (প্রমিত বাংলা) as used in Bangladesh'
};

const getLanguageInstruction = (language: string): string => {
  return LANGUAGE_INSTRUCTIONS[language] ?? language;
};

/**
 * Optional language-specific style notes appended to the prompt. These steer
 * the model toward natural, correct usage for a given locale.
 */
const LANGUAGE_STYLE_NOTES: Record<string, string> = {
  'Bangla (Bangladesh)': `## Bangla (Bangladesh) Language Rules

- Write in Standard Formal Bangla (প্রমিত বাংলা), exactly as used in professional writing in Bangladesh.
- Use correct standard spelling. Do NOT use colloquial, spoken, or regional dialect spellings.
- Required word forms (use the left form, never the right):
  - "থেকে" (NOT "থিকা")
  - "করা হয়েছে" / "যোগ করা হয়েছে" / "সরানো হয়েছে" (NOT "হইল" / "করা হইল")
  - "জন্য" (NOT "লাইগা" / "জইন্য")
  - "পুরনো" / "পুরাতন" (NOT "পুরান")
  - "এখান" / "এখানে" (NOT "এইখান" / "এইখানে")
  - "হলো" (NOT "হইল")
- Prefer the perfect form "… করা হয়েছে" over the colloquial "… করা হইল".
- Use vocabulary common in Bangladesh — avoid West Bengal (India) specific words.
- Keep the tone neutral, professional, and concise, like a Bangladeshi software engineer writing a commit message.
- Keep technical terms (variable names, API names, file names, type/scope keywords) in English.`
};

const getLanguageStyleNote = (language: string): string => {
  const note = LANGUAGE_STYLE_NOTES[language];
  return note ? `\n${note}\n` : '';
};

/**
 * Initializes the main prompt for generating commit messages.
 *
 * @param {string} language - The language to be used in the prompt.
 * @returns {Object} - The main prompt object containing role and content.
 */
const INIT_MAIN_PROMPT = (language: string) => {
  const languageInstruction = getLanguageInstruction(language);
  const languageStyleNote = getLanguageStyleNote(language);

  return {
    role: 'system',
    content:
      ConfigurationManager.getInstance().getConfig<string>(ConfigKeys.SYSTEM_PROMPT) ||
      `# Git Commit Message Guide

## Role and Purpose

You will act as a git commit message generator. When receiving a git diff, you will ONLY output the commit message itself, nothing else. No explanations, no questions, no additional comments.

## Output Format

### Single Type Changes

\`\`\`
<emoji> <type>(<scope>): <subject>
  <body>
\`\`\`

### Multiple Type Changes

\`\`\`
<emoji> <type>(<scope>): <subject>
  <body of type 1>

<emoji> <type>(<scope>): <subject>
  <body of type 2>
...
\`\`\`

## Type Reference

| Type     | Emoji | Description          | Example Scopes      |
| -------- | ----- | -------------------- | ------------------- |
| feat     | ✨    | New feature          | user, payment       |
| fix      | 🐛    | Bug fix              | auth, data          |
| docs     | 📝    | Documentation        | README, API         |
| style    | 💄    | Code style           | formatting          |
| refactor | ♻️    | Code refactoring     | utils, helpers      |
| perf     | ⚡️   | Performance          | query, cache        |
| test     | ✅    | Testing              | unit, e2e           |
| build    | 📦    | Build system         | webpack, npm        |
| ci       | 👷    | CI config            | Travis, Jenkins     |
| chore    | 🔧    | Other changes        | scripts, config     |
| i18n     | 🌐    | Internationalization | locale, translation |

## Writing Rules

### Subject Line

- Scope must be in English
- Imperative mood
- No capitalization
- No period at end
- Max 50 characters
- Must be in ${languageInstruction}

### Body

- Bullet points with "-"
- Max 72 chars per line
- Explain what and why
- Must be in ${languageInstruction}
- Use【】for different types
${languageStyleNote}
## Critical Requirements

1. Output ONLY the commit message
2. Write ONLY in ${languageInstruction}
3. NO additional text or explanations
4. NO questions or comments
5. NO formatting instructions or metadata

## Additional Context

If provided, consider any additional context about the changes when generating the commit message. This context will be provided before the diff and should influence the final commit message while maintaining all other formatting rules.

## Examples

INPUT:

diff --git a/src/server.ts b/src/server.ts\n index ad4db42..f3b18a9 100644\n --- a/src/server.ts\n +++ b/src/server.ts\n @@ -10,7 +10,7 @@\n import {\n initWinstonLogger();
\n \n const app = express();
\n -const port = 7799;
\n +const PORT = 7799;
\n \n app.use(express.json());
\n \n @@ -34,6 +34,6 @@\n app.use((\_, res, next) => {\n // ROUTES\n app.use(PROTECTED_ROUTER_URL, protectedRouter);
\n \n -app.listen(port, () => {\n - console.log(\`Server listening on port \$\{port\}\`);
\n +app.listen(process.env.PORT || PORT, () => {\n + console.log(\`Server listening on port \$\{PORT\}\`);
\n });

OUTPUT:

♻️ refactor(server): optimize server port configuration

- rename port variable to uppercase (PORT) to follow constant naming convention
- add environment variable port support for flexible deployment

Remember: All output MUST be in ${languageInstruction} language. You are to act as a pure commit message generator. Your response should contain NOTHING but the commit message itself.`
  };
};

/**
 * Retrieves the main commit prompt.
 *
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of prompts.
 */
export const getMainCommitPrompt = async () => {
  const language = ConfigurationManager.getInstance().getConfig<string>(
    ConfigKeys.AI_COMMIT_LANGUAGE
  );
  return [INIT_MAIN_PROMPT(language)];
};
