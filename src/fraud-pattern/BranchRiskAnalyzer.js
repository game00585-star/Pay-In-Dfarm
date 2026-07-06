import { BehaviorAnalyzer } from './BehaviorAnalyzer.js';
import { BranchHealthService } from './BranchHealthService.js';
import { FraudScoreCalculator } from './FraudScoreCalculator.js';
import { PatternDetectionService } from './PatternDetectionService.js';

export class BranchRiskAnalyzer {
  constructor({
    behaviorAnalyzer = new BehaviorAnalyzer(),
    patternDetectionService = new PatternDetectionService(),
    scoreCalculator = new FraudScoreCalculator(),
    healthService = new BranchHealthService()
  } = {}) {
    this.behaviorAnalyzer = behaviorAnalyzer;
    this.patternDetectionService = patternDetectionService;
    this.scoreCalculator = scoreCalculator;
    this.healthService = healthService;
  }

  analyze(records = []) {
    const grouped = this.behaviorAnalyzer.groupByBranch(records);
    return Object.entries(grouped).map(([branchCode, branchRecords]) => {
      const branchName = branchRecords[0]?.branch || branchCode;
      const metrics = this.behaviorAnalyzer.metrics(branchRecords);
      const patterns = this.patternDetectionService.detect({ branchCode, branchName, metrics });
      const currentRiskScore = this.scoreCalculator.calculate(patterns);
      return {
        branchCode,
        branchName,
        currentRiskScore,
        riskLevel: this.scoreCalculator.riskLevel(currentRiskScore),
        branchHealth: this.healthService.calculate(currentRiskScore),
        lastUpdated: new Date().toISOString(),
        metrics,
        patterns
      };
    });
  }
}

export const branchRiskAnalyzer = new BranchRiskAnalyzer();
