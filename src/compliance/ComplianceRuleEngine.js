export class ComplianceRuleEngine {
  evaluate({ records = [], policies = [], assessments = [], cases = [] } = {}) {
    const activePolicies = policies.filter((policy) => policy.status === 'ACTIVE');
    const overduePolicies = activePolicies.filter((policy) => policy.reviewDate && policy.reviewDate < new Date().toISOString().slice(0, 10));
    const nonCompliantAssessments = assessments.filter((assessment) => assessment.assessmentResult === 'NON_COMPLIANT');
    const highRiskRecords = records.filter((record) => Number(record.riskScore || 0) >= 70);
    const openCases = cases.filter((item) => item.status !== 'CLOSED');
    return [
      ...overduePolicies.map((policy) => ({
        ruleCode: 'POLICY_REVIEW_OVERDUE',
        policyId: policy.policyId,
        severity: 'MEDIUM',
        description: `${policy.policyCode} requires management review`
      })),
      ...nonCompliantAssessments.map((assessment) => ({
        ruleCode: 'CONTROL_NON_COMPLIANT',
        assessmentId: assessment.assessmentId,
        branchCode: assessment.branchCode,
        severity: 'HIGH',
        description: `${assessment.controlCode} is non-compliant`
      })),
      ...highRiskRecords.map((record) => ({
        ruleCode: 'HIGH_RISK_RECORD_REQUIRES_COMPLIANCE_REVIEW',
        recordId: record.id,
        branchCode: record.branchCode || record.branch,
        severity: 'HIGH',
        description: `High risk record ${record.id} requires compliance review`
      })),
      ...openCases.filter((item) => item.riskLevel === 'CRITICAL').map((item) => ({
        ruleCode: 'CRITICAL_COMPLIANCE_CASE_OPEN',
        caseId: item.caseId,
        branchCode: item.branchCode,
        severity: 'CRITICAL',
        description: `Critical compliance case ${item.caseId} is open`
      }))
    ];
  }
}

export const complianceRuleEngine = new ComplianceRuleEngine();
