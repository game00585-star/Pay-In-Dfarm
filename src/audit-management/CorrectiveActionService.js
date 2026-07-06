import { auditRepository } from './AuditRepository.js';

export const CORRECTIVE_ACTION_STATUSES = Object.freeze(['OPEN', 'IN_PROGRESS', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'OVERDUE']);

export class CorrectiveActionService {
  constructor({ repository = auditRepository } = {}) {
    this.repository = repository;
  }

  list(findingId = '') {
    const actions = this.repository.list('correctiveActions');
    return findingId ? actions.filter((item) => item.findingId === findingId) : actions;
  }

  create(input = {}, actor = {}) {
    const saved = {
      actionId: input.actionId || `CA-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      findingId: input.findingId || '',
      owner: input.owner || '',
      dueDate: input.dueDate || '',
      status: input.status || 'OPEN',
      completionDate: input.completionDate || '',
      verificationResult: input.verificationResult || '',
      responseComment: input.responseComment || '',
      createdAt: input.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.repository.save('correctiveActions', 'actionId', saved);
    this.repository.appendHistory(this.history(saved.actionId, 'SAVE_CORRECTIVE_ACTION', actor, saved));
    return saved;
  }

  submit(actionId, actor = {}, payload = {}) {
    const action = this.list().find((item) => item.actionId === actionId);
    if (!action) return null;
    return this.create({ ...action, ...payload, status: 'SUBMITTED', completionDate: new Date().toISOString() }, actor);
  }

  verify(actionId, result, actor = {}) {
    const action = this.list().find((item) => item.actionId === actionId);
    if (!action) return null;
    const status = result === 'APPROVED' ? 'VERIFIED' : 'REJECTED';
    return this.create({ ...action, status, verificationResult: result }, actor);
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

export const correctiveActionService = new CorrectiveActionService();
