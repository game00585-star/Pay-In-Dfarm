import { dataGovernanceRepository } from './DataGovernanceRepository.js';

export const DATA_RETENTION_OPTIONS = Object.freeze(['1_YEAR', '2_YEARS', '5_YEARS', '7_YEARS', '10_YEARS', 'PERMANENT']);

const DEFAULT_POLICIES = [
  { policyId: 'RET-PAYIN', entityType: 'PayinRecord', retention: '7_YEARS', archiveEnabled: true, owner: 'Accounting' },
  { policyId: 'RET-DOCUMENT', entityType: 'Document', retention: '5_YEARS', archiveEnabled: true, owner: 'Accounting' },
  { policyId: 'RET-AUDIT', entityType: 'AuditLog', retention: 'PERMANENT', archiveEnabled: true, owner: 'Audit' }
];

export class RetentionPolicyEngine {
  constructor({ repository = dataGovernanceRepository } = {}) {
    this.repository = repository;
  }

  listPolicies() {
    if (!this.repository.list('retentionPolicies').length) this.repository.replace('retentionPolicies', DEFAULT_POLICIES);
    return this.repository.list('retentionPolicies');
  }

  savePolicy(policy = {}) {
    return this.repository.save('retentionPolicies', 'policyId', {
      policyId: policy.policyId || `RET-${Date.now()}`,
      entityType: policy.entityType || 'Record',
      retention: policy.retention || '5_YEARS',
      archiveEnabled: policy.archiveEnabled !== false,
      owner: policy.owner || 'Data Owner',
      updatedAt: new Date().toISOString()
    });
  }

  archive(entityType, recordId, actor = {}) {
    const saved = {
      archiveId: `DA-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      entityType,
      recordId,
      version: 1,
      status: 'ARCHIVED',
      archivedBy: actor.email || actor.name || 'system',
      archivedAt: new Date().toISOString(),
      restoredAt: ''
    };
    return this.repository.save('archives', 'archiveId', saved);
  }

  restore(archiveId, actor = {}) {
    const archive = this.repository.list('archives').find((item) => item.archiveId === archiveId);
    if (!archive) return null;
    return this.repository.save('archives', 'archiveId', {
      ...archive,
      status: 'RESTORED',
      restoredBy: actor.email || actor.name || 'system',
      restoredAt: new Date().toISOString()
    });
  }
}

export const retentionPolicyEngine = new RetentionPolicyEngine();
