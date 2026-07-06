import { BranchRiskAnalyzer } from './BranchRiskAnalyzer.js';
import { RiskTrendService } from './RiskTrendService.js';

const DEFAULT_ALERT_THRESHOLD = 70;

function sortByMetric(profiles, metric) {
  return [...profiles].sort((left, right) => Number(right.metrics?.[metric] || 0) - Number(left.metrics?.[metric] || 0));
}

function heatColor(riskLevel) {
  if (riskLevel === 'CRITICAL') return 'critical';
  if (riskLevel === 'HIGH') return 'high';
  if (riskLevel === 'MEDIUM') return 'medium';
  if (riskLevel === 'LOW') return 'low';
  return 'pass';
}

export class FraudPatternEngine {
  constructor({
    branchRiskAnalyzer = new BranchRiskAnalyzer(),
    riskTrendService = new RiskTrendService(),
    alertThreshold = DEFAULT_ALERT_THRESHOLD
  } = {}) {
    this.branchRiskAnalyzer = branchRiskAnalyzer;
    this.riskTrendService = riskTrendService;
    this.alertThreshold = alertThreshold;
  }

  analyze(records = []) {
    const branchRiskProfiles = this.branchRiskAnalyzer.analyze(records);
    const fraudPatterns = branchRiskProfiles.flatMap((profile) => profile.patterns || []);
    const highRisk = [...branchRiskProfiles].sort((left, right) => right.currentRiskScore - left.currentRiskScore);
    const lowRisk = [...branchRiskProfiles].sort((left, right) => left.currentRiskScore - right.currentRiskScore);

    return {
      generatedAt: new Date().toISOString(),
      disclaimer: 'Fraud Pattern Engine creates risk alerts only. It does not decide that fraud happened.',
      branchRiskProfiles,
      fraudPatterns,
      trend: this.riskTrendService.trend(records),
      rankings: {
        top20HighRisk: highRisk.slice(0, 20),
        top20LowRisk: lowRisk.slice(0, 20),
        mostMissingDocument: sortByMetric(branchRiskProfiles, 'missingDocumentCount').slice(0, 20),
        mostManualOverride: sortByMetric(branchRiskProfiles, 'manualOverrideCount').slice(0, 20),
        mostDifference: sortByMetric(branchRiskProfiles, 'differenceTotal').slice(0, 20),
        mostLateDeposit: sortByMetric(branchRiskProfiles, 'lateDepositCount').slice(0, 20),
        mostAICorrection: sortByMetric(branchRiskProfiles, 'aiCorrectionCount').slice(0, 20),
        mostOCRFailure: sortByMetric(branchRiskProfiles, 'ocrFailureCount').slice(0, 20)
      },
      heatMap: branchRiskProfiles.map((profile) => ({
        branchCode: profile.branchCode,
        branchName: profile.branchName,
        score: profile.currentRiskScore,
        riskLevel: profile.riskLevel,
        color: heatColor(profile.riskLevel)
      })),
      alerts: branchRiskProfiles
        .filter((profile) => profile.currentRiskScore >= this.alertThreshold || profile.riskLevel === 'CRITICAL')
        .map((profile) => ({
          alertId: `FRAUD-RISK-${profile.branchCode}`,
          branchCode: profile.branchCode,
          branchName: profile.branchName,
          riskScore: profile.currentRiskScore,
          riskLevel: profile.riskLevel,
          message: `Branch risk score is ${profile.currentRiskScore}. Review required.`,
          status: 'OPEN',
          createdAt: new Date().toISOString()
        }))
    };
  }
}

export const fraudPatternEngine = new FraudPatternEngine();
