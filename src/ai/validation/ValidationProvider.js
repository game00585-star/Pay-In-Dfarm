import { RISK_FLAGS } from '../../domain/constants/riskFlags.js';

export class ValidationProvider {
  get name() {
    return 'ValidationProvider';
  }

  async validate() {
    throw new Error('ValidationProvider.validate must be implemented');
  }
}

export class MockValidationProvider extends ValidationProvider {
  get name() {
    return 'MockValidationProvider';
  }

  async validate(normalizedResult) {
    const flags = [];
    if (!normalizedResult?.fields?.documentDate) flags.push(RISK_FLAGS.INVALID_DATE);
    if (Number(normalizedResult?.confidence || 0) < 80) flags.push(RISK_FLAGS.LOW_AI_CONFIDENCE);
    return {
      valid: flags.length === 0,
      flags,
      checks: {
        hasDate: Boolean(normalizedResult?.fields?.documentDate),
        confidenceAccepted: Number(normalizedResult?.confidence || 0) >= 80
      }
    };
  }
}
