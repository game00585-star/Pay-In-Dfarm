export class PromptBuilder {
  build({ question = '', user = {}, filters = {} } = {}) {
    return {
      instruction: 'Answer only from verified operational data. Do not infer or invent data.',
      question,
      role: user.role || '',
      branch: user.branch || '',
      filters
    };
  }
}

export const promptBuilder = new PromptBuilder();
