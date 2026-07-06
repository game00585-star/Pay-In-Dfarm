import { caseAttachmentService } from './CaseAttachmentService.js';
import { caseCommentService } from './CaseCommentService.js';
import { caseAssignmentService } from './CaseAssignmentService.js';
import { CaseNotificationService } from './CaseNotificationService.js';
import { caseRepository } from './CaseRepository.js';
import { CASE_STATUSES, caseWorkflow } from './CaseWorkflow.js';

function priorityFromRisk(riskScore = 0) {
  if (riskScore >= 90) return 'CRITICAL';
  if (riskScore >= 75) return 'URGENT';
  if (riskScore >= 55) return 'HIGH';
  if (riskScore >= 25) return 'NORMAL';
  return 'LOW';
}

function dueDate(minutes = 240) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

export class CaseService {
  constructor({ repository = caseRepository } = {}) {
    this.repository = repository;
    this.notificationService = new CaseNotificationService({ repository });
  }

  createCase(input = {}) {
    const now = new Date().toISOString();
    const caseItem = {
      caseId: input.caseId || `CASE-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      branchCode: input.branchCode || input.branch || 'UNKNOWN',
      branchName: input.branchName || input.branch || '',
      businessDate: input.businessDate || input.date || now.slice(0, 10),
      shift: input.shift || '',
      caseType: input.caseType || 'General',
      priority: input.priority || priorityFromRisk(input.riskScore),
      status: input.status || CASE_STATUSES.OPEN,
      riskScore: Number(input.riskScore || 0),
      assignedRole: input.assignedRole || 'ACCOUNTING',
      assignedUser: input.assignedUser || '',
      dueDate: input.dueDate || dueDate(input.slaMinutes || 240),
      responseDueDate: input.responseDueDate || dueDate(60),
      resolutionDueDate: input.resolutionDueDate || dueDate(input.slaMinutes || 240),
      createdAt: now,
      updatedAt: now,
      closedAt: '',
      comments: [],
      attachments: [],
      timeline: [{
        eventId: `case-event-${Date.now()}`,
        action: 'CREATE_CASE',
        actor: input.createdBy || 'system',
        actorRole: input.createdRole || 'SYSTEM',
        createdAt: now
      }]
    };
    this.repository.saveCase(caseItem);
    this.notificationService.notify(caseItem, `New case ${caseItem.caseId}`, caseItem.assignedRole);
    return caseItem;
  }

  listCases(user = null) {
    const cases = this.repository.listCases();
    if (!user) return [];
    if (user.role === 'BRANCH') return cases.filter((item) => item.branchName === user.branch || item.branchCode === user.branch);
    if (user.role === 'REGIONAL_MANAGER') return cases.filter((item) => String(item.branchName || '').includes(user.region || user.branch || ''));
    if (user.role === 'EXECUTIVE') return cases;
    return cases;
  }

  updateCase(caseItem, action, actor = {}, payload = {}) {
    let next = caseWorkflow.transition(caseItem, action, payload);
    if (payload.comment) {
      next = caseCommentService.addComment(next, {
        text: payload.comment,
        commentType: payload.commentType || 'Public',
        createdBy: actor.email || actor.name || 'system',
        createdRole: actor.role || 'SYSTEM'
      });
    }
    if (payload.attachment) next = caseAttachmentService.addAttachment(next, payload.attachment);
    if (payload.assignedRole || payload.assignedUser) next = caseAssignmentService.assign(next, payload);
    next.timeline = [{
      eventId: `case-event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action,
      actor: actor.email || actor.name || 'system',
      actorRole: actor.role || 'SYSTEM',
      createdAt: new Date().toISOString()
    }, ...(next.timeline || [])];
    this.repository.saveCase(next);
    this.notificationService.notify(next, `Case ${next.caseId} updated: ${action}`, next.assignedRole);
    return next;
  }

  getDashboard(cases = this.repository.listCases()) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      myCases: cases.length,
      openCases: cases.filter((item) => item.status === 'OPEN').length,
      waitingBranch: cases.filter((item) => item.status === 'WAITING_BRANCH').length,
      waitingAccounting: cases.filter((item) => item.status === 'WAITING_ACCOUNTING').length,
      waitingAudit: cases.filter((item) => item.status === 'WAITING_AUDIT').length,
      overSla: cases.filter((item) => new Date(item.resolutionDueDate || item.dueDate) < new Date() && !['RESOLVED', 'CLOSED'].includes(item.status)).length,
      resolvedToday: cases.filter((item) => item.status === 'RESOLVED' && String(item.updatedAt || '').slice(0, 10) === today).length
    };
  }
}

export const caseService = new CaseService();
