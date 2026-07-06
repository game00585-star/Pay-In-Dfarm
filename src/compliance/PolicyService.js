import { complianceRepository } from './ComplianceRepository.js';

export const POLICY_CATEGORIES = Object.freeze(['ACCOUNTING', 'CASH_HANDLING', 'DEPOSIT', 'DOCUMENT', 'SECURITY', 'IT', 'INTERNAL_CONTROL', 'COMPLIANCE', 'AUDIT']);
export const POLICY_STATUSES = Object.freeze(['DRAFT', 'ACTIVE', 'RETIRED', 'CANCELLED', 'UNDER_REVIEW']);

export class PolicyService {
  constructor({ repository = complianceRepository } = {}) {
    this.repository = repository;
  }

  list() {
    return this.repository.list('policies').sort((a, b) => String(b.effectiveDate).localeCompare(String(a.effectiveDate)));
  }

  save(input = {}, actor = {}) {
    const now = new Date().toISOString();
    const existingVersions = this.list().filter((item) => item.policyCode === input.policyCode);
    const nextVersion = input.version || (existingVersions.length ? `${Math.max(...existingVersions.map((item) => Number(item.version || 1))) + 1}` : '1');
    const saved = {
      policyId: input.policyId || `POLICY-${input.policyCode || Date.now()}-v${nextVersion}`.replace(/\s+/g, '-'),
      policyCode: input.policyCode || `POL-${Date.now()}`,
      policyName: input.policyName || 'Compliance Policy',
      category: input.category || 'COMPLIANCE',
      version: nextVersion,
      effectiveDate: input.effectiveDate || new Date().toISOString().slice(0, 10),
      reviewDate: input.reviewDate || '',
      owner: input.owner || actor.email || actor.name || 'Compliance',
      status: input.status || 'DRAFT',
      previousPolicyId: input.previousPolicyId || existingVersions[0]?.policyId || '',
      createdAt: input.createdAt || now,
      updatedAt: now
    };
    this.repository.save('policies', 'policyId', saved);
    this.repository.appendHistory(this.history(saved.policyId, input.policyId ? 'UPDATE_POLICY' : 'CREATE_POLICY', actor, saved));
    return saved;
  }

  activate(policyId, actor = {}) {
    const policy = this.list().find((item) => item.policyId === policyId);
    if (!policy) return null;
    const saved = this.save({ ...policy, status: 'ACTIVE' }, actor);
    this.repository.appendHistory(this.history(policyId, 'APPROVE_POLICY', actor, saved));
    return saved;
  }

  cancel(policyId, actor = {}) {
    const policy = this.list().find((item) => item.policyId === policyId);
    if (!policy) return null;
    const saved = this.save({ ...policy, status: 'CANCELLED' }, actor);
    this.repository.appendHistory(this.history(policyId, 'CANCEL_POLICY', actor, saved));
    return saved;
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

export const policyService = new PolicyService();
