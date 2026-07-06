import { ShiftMatchingValidator } from './ShiftMatchingValidator.js';

export class ShiftMatchingRuleEngine {
  constructor({ validator = new ShiftMatchingValidator() } = {}) {
    this.validator = validator;
  }

  evaluate(match, context = {}) {
    return this.validator.validate(match, context);
  }
}

export const shiftMatchingRuleEngine = new ShiftMatchingRuleEngine();
