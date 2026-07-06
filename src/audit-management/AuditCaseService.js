import { auditRepository } from './AuditRepository.js';

export const AUDIT_PRIORITIES = Object.freeze(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const AUDIT_CASE_STATUSES = Object.freeze(['OPEN', 'IN_PROGRESS', 'WAITING_CORRECTIVE_ACTION', 'VERIFICATION', 'CLOSED', 'REOPENED']);

function priorityFromRisk(score = 0) {
  if (score >= 85) return 'CRITICAL';
  if (score >= 65) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
}

export class AuditCaseService {
  constructor({ repository = auditRepository } = {}) {
    this.repository = repository;
  }

  list(user = null) {
    const cases = this.repository.list('cases');
    if (user?.role === 'BRANCH') return cases.filter((item) => item.branchName === user.branch || item.branchCode === user.branch);
    if (user?.role === 'REGIONAL_MANAGER') return cases.filter((item) => item.region === user.region || item.region === user.branch);
    return cases;
  }

  create(input = {}, actor = {}) {
    const now = new Date().toISOString();
    const saved = {
      auditCaseId: input.auditCaseId || `AC-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      branchCode: input.branchCode || input.branch || 'UNKNOWN',
      branchName: input.branchName || input.branch || '',
      region: input.region || '',
      businessDate: input.businessDate || input.date || now.slice(0, 10),
      auditType: input.auditType || 'RISK_BASED_AUDIT',
      riskScore: Number(input.riskScore || 0),
      priority: input.priority || priorityFromRisk(input.riskScore),
      status: input.status || 'OPEN',
      assignedAuditor: input.assignedAuditor || actor.email || actor.name || '',
      linkedShiftReconciliationId: input.linkedShiftReconciliationId || input.reconciliationId || '',
      linkedBusinessExceptionId: input.linkedBusinessExceptionId || input.exceptionId || '',
      linkedFraudPatternId: input.linkedFraudPatternId || input.patternId || '',
      sourceRecordId: input.sourceRecordId || input.recordId || input.id || '',
      createdAt: input.createdAt || now,
      closedAt: input.closedAt || ''
    };
    this.repository.save('cases', 'auditCaseId', saved);
    this.repository.appendHistory(this.history(saved.auditCaseId, 'CREATE_AUDIT_CASE', actor, saved));
    return saved;
  }

  updateStatus(auditCaseId, status, actor = {}, payload = {}) {
    const item = this.list().find((entry) => entry.auditCaseId === auditCaseId);
    if (!item) return null;
    const saved = {
      ...item,
      status,
      closedAt: status === 'CLOSED' ? new Date().toISOString() : item.closedAt,
      ...payload
    };
    this.repository.save('cases', 'auditCaseId', saved);
    this.repository.appendHistory(this.history(auditCaseId, `CASE_${status}`, actor, payload));
    return saved;
  }

  syncFromRisk(records = [], exceptions = [], fraud = null, actor = {}) {
    const existing = new Set(this.list().map((item) => item.sourceRecordId));
    const fromRecords = records
      .filter((record) => Number(record.riskScore || 0) >= 70 || (record.riskFlags || []).length)
      .filter((record) => !existing.has(record.id))
      .map((record) => this.create({
        branchCode: record.branchCode || record.branch,
        branchName: record.branch,
        businessDate: record.date,
        auditType: 'RISK_BASED_AUDIT',
        riskScore: record.riskScore,
        sourceRecordId: record.id,
        linkedShiftReconciliationId: record.shiftReconciliation?.reconciliationId || ''
      }, actor));
    const fromExceptions = exceptions
      .filter((exception) => ['HIGH', 'CRITICAL'].includes(exception.severity))
      .filter((exception) => !this.list().some((item) => item.linkedBusinessExceptionId === exception.exceptionId))
      .map((exception) => this.create({
        branchCode: exception.branchCode,
        branchName: exception.branchName,
        businessDate: exception.businessDate,
        auditType: 'SPECIAL_AUDIT',
        riskScore: exception.scoreWeight || 70,
        linkedBusinessExceptionId: exception.exceptionId
      }, actor));
    const alerts = fraud?.alerts || [];
    const fromFraud = alerts
      .filter((alert) => !this.list().some((item) => item.linkedFraudPatternId === alert.alertId))
      .map((alert) => this.create({
        branchCode: alert.branchCode,
        branchName: alert.branchName,
        auditType: 'RISK_BASED_AUDIT',
        riskScore: alert.riskScore,
        linkedFraudPatternId: alert.alertId
      }, actor));
    return [...fromRecords, ...fromExceptions, ...fromFraud];
  }

  history(sourceId, action, actor, payload) {
    return {
      historyId: `AUDH-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      sourceId,
      action,
      actor: actor.email || actor.name || 'system',
      actorRole: actor.role || 'SYSTEM',
      payload,
      createdAt: new Date().toISOString()
    };
  }
}

export const auditCaseService = new AuditCaseService();
