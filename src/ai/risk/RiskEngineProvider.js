import { RISK_WEIGHTS } from '../../domain/constants/riskFlags.js';

export class RiskEngineProvider {
  get name() {
    return 'RiskEngineProvider';
  }

  async evaluate() {
    throw new Error('RiskEngineProvider.evaluate must be implemented');
  }
}

export class MockRiskEngineProvider extends RiskEngineProvider {
  get name() {
    return 'MockRiskEngineProvider';
  }

  async evaluate(validationResult, context = {}) {
    const flags = [...new Set([
      ...(validationResult?.flags || []),
      ...(context.duplicate?.riskFlags || [])
    ])];
    const riskScore = flags.reduce((sum, flag) => sum + Number(RISK_WEIGHTS[flag] || 10), 0);
    return {
      riskScore: Math.min(riskScore, 100),
      riskFlags: flags,
      severity: riskScore >= 70 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW'
    };
  }
}
