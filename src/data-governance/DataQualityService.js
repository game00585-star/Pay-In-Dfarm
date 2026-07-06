import { dataGovernanceRepository } from './DataGovernanceRepository.js';
import { dataValidationEngine } from './DataValidationEngine.js';

function score(issues = [], totalRecords = 0) {
  if (!totalRecords && !issues.length) return 100;
  const penalty = issues.reduce((sum, item) => sum + ({ CRITICAL: 25, HIGH: 15, MEDIUM: 8, LOW: 3 }[item.severity] || 5), 0);
  return Math.max(0, Math.round(100 - (penalty / Math.max(totalRecords, 1))));
}

export class DataQualityService {
  constructor({ repository = dataGovernanceRepository } = {}) {
    this.repository = repository;
  }

  runValidation(input = {}, trigger = 'MANUAL') {
    const issues = dataValidationEngine.validate(input);
    this.repository.replace('issues', issues);
    const run = {
      runId: `DVR-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      trigger,
      issueCount: issues.length,
      score: score(issues, input.records?.length || 0),
      createdAt: new Date().toISOString()
    };
    this.repository.save('validationRuns', 'runId', run);
    return { issues, run };
  }

  dashboard(records = []) {
    const issues = this.repository.list('issues');
    const runs = this.repository.list('validationRuns');
    return {
      dataQualityScore: score(issues, records.length),
      duplicateRecords: issues.filter((item) => String(item.issueType).includes('DUPLICATE')).length,
      missingData: issues.filter((item) => String(item.issueType).includes('MISSING')).length,
      businessRuleError: issues.filter((item) => item.issueType === 'BUSINESS_RULE_VIOLATION').length,
      validationTrend: runs.slice(0, 20),
      issues
    };
  }
}

export const dataQualityService = new DataQualityService();
