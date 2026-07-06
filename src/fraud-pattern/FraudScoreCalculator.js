export class FraudScoreCalculator {
  calculate(patterns = []) {
    return Math.min(100, patterns.reduce((sum, pattern) => {
      const base = pattern.severity === 'CRITICAL' ? 25 : pattern.severity === 'HIGH' ? 18 : pattern.severity === 'MEDIUM' ? 12 : 6;
      return sum + base + Math.min(20, Number(pattern.occurrenceCount || 0) * 2);
    }, 0));
  }

  riskLevel(score = 0) {
    if (score <= 20) return 'PASS';
    if (score <= 40) return 'LOW';
    if (score <= 60) return 'MEDIUM';
    if (score <= 80) return 'HIGH';
    return 'CRITICAL';
  }
}

export const fraudScoreCalculator = new FraudScoreCalculator();
