const DEFAULT_RULES = [
  ['TOTAL_MISMATCH_CONSECUTIVE', 'Repeated total mismatch', 'HIGH', 'differenceCount', 3],
  ['MISSING_DOCUMENT_REPEATED', 'Repeated missing document', 'HIGH', 'missingDocumentCount', 3],
  ['MANUAL_OVERRIDE_FREQUENT', 'Frequent manual override', 'MEDIUM', 'manualOverrideCount', 3],
  ['ACCOUNTING_OVERRIDE_FREQUENT', 'Frequent accounting override', 'MEDIUM', 'manualOverrideCount', 4],
  ['AUDIT_OVERRIDE_FREQUENT', 'Frequent audit override', 'HIGH', 'manualOverrideCount', 5],
  ['DUPLICATE_REFERENCE_REPEATED', 'Repeated duplicate reference', 'CRITICAL', 'duplicateReferenceCount', 1],
  ['LATE_PAYIN_REPEATED', 'Repeated late Pay-in', 'MEDIUM', 'lateDepositCount', 2],
  ['WRONG_DEPOSIT_DATE_REPEATED', 'Repeated wrong deposit date', 'MEDIUM', 'lateDepositCount', 2],
  ['LOW_AI_CONFIDENCE_CONTINUOUS', 'Continuous low AI confidence', 'LOW', 'lowConfidenceCount', 3],
  ['OCR_FAILURE_FREQUENT', 'Frequent OCR failure', 'LOW', 'ocrFailureCount', 3],
  ['INCOMPLETE_ATTACHMENT_REPEATED', 'Repeated incomplete attachment', 'HIGH', 'incompleteDocumentCount', 3],
  ['MANUAL_MATCH_FREQUENT', 'Frequent manual match', 'MEDIUM', 'manualMatchCount', 2],
  ['HIGH_RISK_CONTINUOUS', 'Continuous high risk score', 'HIGH', 'highRiskCount', 2],
  ['DIFFERENCE_OVER_THRESHOLD_REPEATED', 'Repeated difference over threshold', 'HIGH', 'differenceCount', 3],
  ['LATE_DOCUMENT_SUBMISSION', 'Late document submission', 'MEDIUM', 'lateDepositCount', 2],
  ['INCOMPLETE_DOCUMENT_SUBMISSION', 'Incomplete document submission', 'HIGH', 'incompleteDocumentCount', 3]
].map(([patternCode, patternName, severity, metric, threshold]) => ({
  patternCode,
  patternName,
  severity,
  metric,
  threshold,
  isActive: true
}));

function readCustomRules() {
  try {
    return JSON.parse(localStorage.getItem('dfarm_fraud_pattern_rules')) || [];
  } catch {
    return [];
  }
}

export class PatternDetectionService {
  getRules() {
    return [...DEFAULT_RULES, ...readCustomRules()].filter((rule) => rule.isActive !== false);
  }

  detect({ branchCode, branchName, metrics }) {
    const now = new Date().toISOString();
    return this.getRules()
      .filter((rule) => Number(metrics[rule.metric] || 0) >= Number(rule.threshold || 1))
      .map((rule) => ({
        patternId: `PAT-${branchCode}-${rule.patternCode}`.replace(/\s+/g, '-'),
        branchCode,
        branchName,
        patternCode: rule.patternCode,
        patternName: rule.patternName,
        severity: rule.severity,
        description: `${rule.patternName}: ${metrics[rule.metric] || 0} >= ${rule.threshold}`,
        occurrenceCount: Number(metrics[rule.metric] || 0),
        firstDetected: now,
        lastDetected: now,
        status: 'OPEN',
        createdAt: now
      }));
  }
}

export const patternDetectionService = new PatternDetectionService();
