import { auditRepository } from './AuditRepository.js';

export const FINDING_CATEGORIES = Object.freeze(['DOCUMENT', 'CASH', 'PAYMENT', 'WORKFLOW', 'SECURITY', 'POLICY', 'COMPLIANCE', 'SYSTEM']);
export const FINDING_SEVERITIES = Object.freeze(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export class AuditFindingService {
  constructor({ repository = auditRepository } = {}) {
    this.repository = repository;
  }

  list(auditCaseId = '') {
    const findings = this.repository.list('findings');
    return auditCaseId ? findings.filter((item) => item.auditCaseId === auditCaseId) : findings;
  }

  save(input = {}, actor = {}) {
    const saved = {
      findingId: input.findingId || `AF-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      auditCaseId: input.auditCaseId || '',
      category: input.category || 'DOCUMENT',
      severity: input.severity || 'MEDIUM',
      description: input.description || '',
      recommendation: input.recommendation || '',
      rootCause: input.rootCause || '',
      owner: input.owner || '',
      dueDate: input.dueDate || '',
      status: input.status || 'OPEN',
      createdAt: input.createdAt || new Date().toISOString()
    };
    this.repository.save('findings', 'findingId', saved);
    this.repository.appendHistory(this.history(saved.findingId, 'SAVE_FINDING', actor, saved));
    return saved;
  }

  updateStatus(findingId, status, actor = {}, payload = {}) {
    const finding = this.list().find((item) => item.findingId === findingId);
    if (!finding) return null;
    const saved = { ...finding, status, ...payload };
    this.repository.save('findings', 'findingId', saved);
    this.repository.appendHistory(this.history(findingId, `FINDING_${status}`, actor, payload));
    return saved;
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

export const auditFindingService = new AuditFindingService();
