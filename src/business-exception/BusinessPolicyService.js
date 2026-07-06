export const EXCEPTION_SEVERITY = Object.freeze({
  INFO: 'INFO',
  WARNING: 'WARNING',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
});

export const EXCEPTION_CATEGORY = Object.freeze({
  DOCUMENT: 'DOCUMENT',
  PAYMENT: 'PAYMENT',
  SHIFT: 'SHIFT',
  BUSINESS_DATE: 'BUSINESS_DATE',
  AMOUNT: 'AMOUNT',
  REFERENCE: 'REFERENCE',
  AI: 'AI',
  SYSTEM: 'SYSTEM'
});

export class BusinessPolicyService {
  constructor({
    policies = {
      lowConfidenceThreshold: 90,
      manualReviewThreshold: 70,
      riskWeights: {
        MISSING_DOCUMENT: 30,
        DIFFERENCE: 20,
        DUPLICATE_REFERENCE: 25,
        WRONG_SHIFT: 15,
        LOW_AI_CONFIDENCE: 10,
        OVERRIDE: 15
      }
    }
  } = {}) {
    this.policies = policies;
  }

  getPolicy() {
    return this.policies;
  }
}

export const businessPolicyService = new BusinessPolicyService();
