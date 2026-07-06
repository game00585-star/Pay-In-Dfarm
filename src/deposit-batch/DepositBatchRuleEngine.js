import { DepositBatchValidator } from './DepositBatchValidator.js';

export class DepositBatchRuleEngine {
  constructor({ validator = new DepositBatchValidator() } = {}) {
    this.validator = validator;
  }

  evaluate(batch, context = {}) {
    return this.validator.validate(batch, context);
  }
}

export const depositBatchRuleEngine = new DepositBatchRuleEngine();
