import { ShiftReconciliationValidator } from './ShiftReconciliationValidator.js';

export class ReconciliationRuleEngine {
  constructor({ validator = new ShiftReconciliationValidator() } = {}) {
    this.validator = validator;
  }

  evaluate(reconciliation) {
    return this.validator.validate(reconciliation);
  }
}

export const reconciliationRuleEngine = new ReconciliationRuleEngine();
