import { complianceRepository } from './ComplianceRepository.js';

export const COMPLIANCE_CASE_STATUSES = Object.freeze(['OPEN', 'IN_REVIEW', 'MANAGEMENT_REVIEW', 'REMEDIATION', 'CLOSED']);

function riskLevel(score = 0) {
  const value = Number(score || 0);
  if (value >= 80) return 'CRITICAL';
  if (value >= 60) return 'HIGH';
  if (value >= 30) return 'MEDIUM';
  return 'LOW';
}

export class ComplianceCaseService {
  constructor({ repository = complianceRepository } = {}) {
    this.repository = repository;
  }

  list(user = null) {
    const cases = this.repository.list('cases');
    if (user?.role === 'BRANCH') return cases.filter((item) => item.branchName === user.branch || item.branchCode === user.branch);
    if (user?.role === 'REGIONAL_MANAGER') return cases.filter((item) => item.region === user.region || item.region === user.branch);
    return cases;
  }

  save(input = {}, actor = {}) {
    const now = new Date().toISOString();
    const saved = {
      caseId: input.caseId || `CC-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      branchCode: input.branchCode || input.branch || 'UNKNOWN',
      branchName: input.branchName || input.branch || '',
      region: input.region || '',
      businessDate: input.businessDate || input.date || now.slice(0, 10),
      policyId: input.policyId || '',
      riskLevel: input.riskLevel || riskLevel(input.riskScore),
      riskScore: Number(input.riskScore || 0),
      status: input.status || 'OPEN',
      assignedTo: input.assignedTo || actor.email || actor.name || '',
      linkedBusinessExceptionId: input.linkedBusinessExceptionId || input.exceptionId || '',
      linkedFraudPatternId: input.linkedFraudPatternId || input.patternId || '',
      linkedAuditFindingId: input.linkedAuditFindingId || input.findingId || '',
      sourceRecordId: input.sourceRecordId || input.recordId || input.id || '',
      createdAt: input.createdAt || now,
      closedAt: input.closedAt || ''
    };
    this.repository.save('cases', 'caseId', saved);
    this.repository.appendHistory(this.history(saved.caseId, input.caseId ? 'UPDATE_COMPLIANCE_CASE' : 'CREATE_COMPLIANCE_CASE', actor, saved));
    return saved;
  }

  close(caseId, actor = {}) {
    const item = this.list().find((entry) => entry.caseId === caseId);
    if (!item) return null;
    const saved = this.save({ ...item, status: 'CLOSED', closedAt: new Date().toISOString() }, actor);
    this.repository.appendHistory(this.history(caseId, 'CLOSE_COMPLIANCE_CASE', actor, saved));
    return saved;
  }

  syncFromSources({ records = [], exceptions = [], fraud = null, auditFindings = [], policies = [] } = {}, actor = {}) {
    const existing = this.list();
    const defaultPolicy = policies.find((policy) => policy.status === 'ACTIVE') || policies[0] || {};
    const createdFromRecords = records
      .filter((record) => Number(record.riskScore || 0) >= 70 || (record.riskFlags || []).length)
      .filter((record) => !existing.some((item) => item.sourceRecordId === record.id))
      .map((record) => this.save({
        branchCode: record.branchCode || record.branch,
        branchName: record.branch,
        businessDate: record.date,
        policyId: defaultPolicy.policyId || '',
        riskScore: record.riskScore,
        sourceRecordId: record.id
      }, actor));
    const createdFromExceptions = exceptions
      .filter((exception) => ['HIGH', 'CRITICAL'].includes(exception.severity))
      .filter((exception) => !this.list().some((item) => item.linkedBusinessExceptionId === exception.exceptionId))
      .map((exception) => this.save({
        branchCode: exception.branchCode,
        branchName: exception.branchName,
        businessDate: exception.businessDate,
        policyId: defaultPolicy.policyId || '',
        riskScore: exception.scoreWeight || 70,
        linkedBusinessExceptionId: exception.exceptionId
      }, actor));
    const createdFromFraud = (fraud?.alerts || [])
      .filter((alert) => !this.list().some((item) => item.linkedFraudPatternId === alert.alertId))
      .map((alert) => this.save({
        branchCode: alert.branchCode,
        branchName: alert.branchName,
        policyId: defaultPolicy.policyId || '',
        riskScore: alert.riskScore,
        linkedFraudPatternId: alert.alertId
      }, actor));
    const createdFromAudit = auditFindings
      .filter((finding) => ['HIGH', 'CRITICAL'].includes(finding.severity))
      .filter((finding) => !this.list().some((item) => item.linkedAuditFindingId === finding.findingId))
      .map((finding) => this.save({
        policyId: defaultPolicy.policyId || '',
        riskScore: finding.severity === 'CRITICAL' ? 90 : 70,
        linkedAuditFindingId: finding.findingId,
        assignedTo: finding.owner
      }, actor));
    return [...createdFromRecords, ...createdFromExceptions, ...createdFromFraud, ...createdFromAudit];
  }

  history(sourceId, action, actor, payload) {
    return {
      historyId: `CMPH-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      sourceId,
      action,
      actor: actor.email || actor.name || 'system',
      actorRole: actor.role || 'SYSTEM',
      payload,
      createdAt: new Date().toISOString()
    };
  }
}

export const complianceCaseService = new ComplianceCaseService();
