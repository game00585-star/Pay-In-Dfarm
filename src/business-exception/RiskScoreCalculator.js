export class RiskScoreCalculator {
  constructor({ weights } = {}) {
    this.weights = weights || {
      MISSING_DOCUMENT: 30,
      DIFFERENCE: 20,
      DUPLICATE_REFERENCE: 25,
      WRONG_SHIFT: 15,
      LOW_AI_CONFIDENCE: 10,
      OVERRIDE: 15
    };
  }

  calculate(exceptions = []) {
    return Math.min(100, exceptions.reduce((sum, item) => sum + Number(item.scoreWeight || this.weights[item.ruleCode] || 10), 0));
  }

  riskLevel(score = 0) {
    if (score <= 20) return 'PASS';
    if (score <= 40) return 'LOW';
    if (score <= 60) return 'MEDIUM';
    if (score <= 80) return 'HIGH';
    return 'CRITICAL';
  }
}

export const riskScoreCalculator = new RiskScoreCalculator();
