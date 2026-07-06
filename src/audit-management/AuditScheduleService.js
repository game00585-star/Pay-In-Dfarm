import { auditRepository } from './AuditRepository.js';

export class AuditScheduleService {
  constructor({ repository = auditRepository } = {}) {
    this.repository = repository;
  }

  list() {
    return this.repository.list('schedules');
  }

  schedule(input = {}, actor = {}) {
    const saved = {
      scheduleId: input.scheduleId || `AS-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      auditPlanId: input.auditPlanId || '',
      assignedAuditor: input.assignedAuditor || actor.email || '',
      branchCode: input.branchCode || '',
      region: input.region || '',
      visitDate: input.visitDate || new Date().toISOString().slice(0, 10),
      status: input.status || 'SCHEDULED',
      createdAt: input.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.repository.save('schedules', 'scheduleId', saved);
    this.repository.appendHistory(this.history(saved.scheduleId, input.scheduleId ? 'RESCHEDULE_AUDIT' : 'SCHEDULE_AUDIT', actor, saved));
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

export const auditScheduleService = new AuditScheduleService();
