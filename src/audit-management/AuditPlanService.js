import { auditRepository } from './AuditRepository.js';

export const AUDIT_TYPES = Object.freeze(['ROUTINE_AUDIT', 'SPECIAL_AUDIT', 'FOLLOW_UP_AUDIT', 'RANDOM_AUDIT', 'RISK_BASED_AUDIT']);
export const AUDIT_PLAN_STATUSES = Object.freeze(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'CLOSED']);

export class AuditPlanService {
  constructor({ repository = auditRepository } = {}) {
    this.repository = repository;
  }

  list(user = null) {
    const plans = this.repository.list('plans');
    if (user?.role === 'REGIONAL_MANAGER') return plans.filter((plan) => plan.region === user.region || plan.region === user.branch);
    if (user?.role === 'BRANCH') return plans.filter((plan) => (plan.branchList || []).includes(user.branch));
    return plans;
  }

  save(plan = {}, actor = {}) {
    const now = new Date().toISOString();
    const saved = {
      auditPlanId: plan.auditPlanId || `AP-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: plan.title || 'Audit Plan',
      year: Number(plan.year || new Date().getFullYear()),
      quarter: plan.quarter || `Q${Math.floor(new Date().getMonth() / 3) + 1}`,
      region: plan.region || 'ALL',
      branchList: Array.isArray(plan.branchList) ? plan.branchList : String(plan.branchList || '').split(',').map((item) => item.trim()).filter(Boolean),
      auditType: plan.auditType || 'RISK_BASED_AUDIT',
      status: plan.status || 'DRAFT',
      createdBy: plan.createdBy || actor.email || actor.name || 'system',
      approvedBy: plan.approvedBy || '',
      createdAt: plan.createdAt || now,
      updatedAt: now
    };
    this.repository.save('plans', 'auditPlanId', saved);
    this.repository.appendHistory(this.history(saved.auditPlanId, 'SAVE_AUDIT_PLAN', actor, saved));
    return saved;
  }

  approve(auditPlanId, actor = {}) {
    const plan = this.list().find((item) => item.auditPlanId === auditPlanId);
    if (!plan) return null;
    const saved = this.save({ ...plan, status: 'APPROVED', approvedBy: actor.email || actor.name || 'system' }, actor);
    this.repository.appendHistory(this.history(auditPlanId, 'APPROVE_AUDIT_PLAN', actor, saved));
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

export const auditPlanService = new AuditPlanService();
