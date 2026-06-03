import { estimateTokens } from '../tokenizers/estimateTokens.js';

export class BudgetedContextBuilder {
  constructor(options = {}) {
    this.budget = options.budget;
    this.sections = [];
  }

  addSection(name, content, options = {}) {
    this.sections.push({
      name,
      content,
      priority: options.priority ?? 50,
      required: options.required ?? false,
      compressor: options.compressor,
      compressionOptions: options.compressionOptions ?? {}
    });

    return this;
  }

  async build(options = {}) {
    if (!this.budget) throw new Error('BudgetedContextBuilder requires a token budget');

    const included = [];
    const omitted = [];
    let usedTokens = 0;

    const sorted = [...this.sections].sort((a, b) => {
      if (a.required !== b.required) return a.required ? -1 : 1;
      return b.priority - a.priority;
    });

    for (const section of sorted) {
      const originalText = stringify(section.content);
      let finalContent = section.content;
      let finalText = originalText;
      let compressed = false;

      if (section.compressor && typeof section.compressor.compressText === 'function') {
        const result = await section.compressor.compressText(originalText, section.compressionOptions);
        finalContent = result.text;
        finalText = result.text;
        compressed = true;
      }

      const tokens = estimateTokens(finalText, options);
      const fits = usedTokens + tokens <= this.budget.usableTokens;

      if (fits || section.required) {
        included.push({
          name: section.name,
          content: finalContent,
          tokens,
          compressed,
          required: section.required,
          priority: section.priority
        });
        usedTokens += tokens;
      } else {
        omitted.push({
          name: section.name,
          tokens,
          required: section.required,
          priority: section.priority,
          reason: 'token_budget_exceeded'
        });
      }
    }

    return {
      sections: included,
      text: included.map((section) => `## ${section.name}\n${stringify(section.content)}`).join('\n\n'),
      report: {
        usedTokens,
        usableTokens: this.budget.usableTokens,
        remainingTokens: Math.max(0, this.budget.usableTokens - usedTokens),
        included: included.length,
        omitted: omitted.length,
        omittedSections: omitted
      }
    };
  }
}

function stringify(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}
