import { WORKFLOW_PRIORITY, WORKFLOW_STATUS, WORKFLOW_STEPS, WorkflowRuleEngine } from './WorkflowRuleEngine.js';
import { WorkflowAssignmentService } from './WorkflowAssignmentService.js';
import { WorkflowHistoryService } from './WorkflowHistoryService.js';
import { WorkflowNotificationService } from './WorkflowNotificationService.js';
import { workflowRepository } from './WorkflowRepository.js';

function minutesFromNow(minutes) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + Number(minutes || 0));
  return date.toISOString();
}

function priorityFromRisk(riskScore = 0) {
  if (riskScore >= 90) return WORKFLOW_PRIORITY.CRITICAL;
  if (riskScore >= 75) return WORKFLOW_PRIORITY.URGENT;
  if (riskScore >= 55) return WORKFLOW_PRIORITY.HIGH;
  if (riskScore >= 25) return WORKFLOW_PRIORITY.NORMAL;
  return WORKFLOW_PRIORITY.LOW;
}

function stepFromRecord(record = {}) {
  if (record.status === 'APPROVED' || record.status === 'CLOSED') return WORKFLOW_STEPS.COMPLETED;
  if (record.status === 'RETURNED' || record.status === 'NEED_RETAKE') return WORKFLOW_STEPS.WAITING_BRANCH;
  if (record.status === 'HIGH_RISK') return WORKFLOW_STEPS.WAITING_AUDIT;
  if (record.aiStatus === 'AI_CHECKING') return WORKFLOW_STEPS.WAITING_AI;
  return WORKFLOW_STEPS.WAITING_ACCOUNTING;
}

function statusFromStep(step, record = {}) {
  if (step === WORKFLOW_STEPS.COMPLETED) return WORKFLOW_STATUS.COMPLETED;
  if (step === WORKFLOW_STEPS.WAITING_BRANCH) return WORKFLOW_STATUS.RETURNED;
  if (record.status === 'RETURNED') return WORKFLOW_STATUS.RETURNED;
  if (record.status === 'APPROVED') return WORKFLOW_STATUS.APPROVED;
  return WORKFLOW_STATUS.WAITING;
}

function assignedRoleFromStep(step) {
  if (step === WORKFLOW_STEPS.WAITING_BRANCH) return 'BRANCH';
  if (step === WORKFLOW_STEPS.WAITING_AUDIT) return 'AUDIT';
  if (step === WORKFLOW_STEPS.WAITING_MANAGER) return 'REGIONAL_MANAGER';
  if (step === WORKFLOW_STEPS.COMPLETED) return 'AUDIT';
  if (step === WORKFLOW_STEPS.WAITING_AI) return 'SYSTEM';
  return 'ACCOUNTING';
}

export class WorkflowService {
  constructor({
    ruleEngine = new WorkflowRuleEngine(),
    assignmentService = new WorkflowAssignmentService(),
    historyService = new WorkflowHistoryService(),
    notificationService = new WorkflowNotificationService(),
    repository = workflowRepository
  } = {}) {
    this.ruleEngine = ruleEngine;
    this.assignmentService = assignmentService;
    this.historyService = historyService;
    this.notificationService = notificationService;
    this.repository = repository;
  }

  createCaseFromRecord(record, existingCase = null) {
    const riskScore = Number(record.riskScore || record.businessExceptionRiskScore || 0);
    const currentStep = existingCase?.currentStep || stepFromRecord(record);
    const now = new Date().toISOString();
    const slaMinutes = existingCase?.slaMinutes || (riskScore >= 75 ? 240 : 480);
    return {
      caseId: existingCase?.caseId || `WF-${record.id}`,
      sourceRecordId: record.id,
      branchCode: record.branchCode || record.documents?.find((document) => document.documentType === 'POS_SUMMARY')?.parsedData?.branchCode || record.branch || 'UNKNOWN',
      branchName: record.branch || '',
      businessDate: record.date || '',
      shift: record.shift || '',
      workflowType: 'SHIFT_RECONCILIATION',
      currentStep,
      currentStatus: existingCase?.currentStatus || statusFromStep(currentStep, record),
      priority: existingCase?.priority || priorityFromRisk(riskScore),
      riskScore,
      assignedRole: existingCase?.assignedRole || assignedRoleFromStep(currentStep),
      assignedUser: existingCase?.assignedUser || '',
      assignedBranch: existingCase?.assignedBranch || record.branch || '',
      assignedRegion: existingCase?.assignedRegion || record.region || '',
      dueDate: existingCase?.dueDate || minutesFromNow(slaMinutes),
      slaMinutes,
      createdAt: existingCase?.createdAt || record.createdAt || now,
      updatedAt: now,
      completedAt: existingCase?.completedAt || (currentStep === WORKFLOW_STEPS.COMPLETED ? now : ''),
      comments: existingCase?.comments || [],
      attachments: existingCase?.attachments || [],
      timeline: existingCase?.timeline || [
        {
          eventId: `wfh-created-${record.id}`,
          caseId: `WF-${record.id}`,
          action: 'CASE_CREATED',
          actor: record.createdBy || 'system',
          actorRole: 'SYSTEM',
          toStep: currentStep,
          toStatus: statusFromStep(currentStep, record),
          comment: 'Workflow case created from pay-in record',
          attachments: [],
          createdAt: now
        }
      ]
    };
  }

  syncFromRecords(records = []) {
    const existing = this.repository.listCases();
    const byRecord = Object.fromEntries(existing.map((item) => [item.sourceRecordId, item]));
    const generated = records.map((record) => this.createCaseFromRecord(record, byRecord[record.id]));
    const manualOnly = existing.filter((item) => !item.sourceRecordId || !records.some((record) => record.id === item.sourceRecordId));
    return this.repository.saveCases([...generated, ...manualOnly]);
  }

  transition(workflowCase, action, actor = {}, payload = {}) {
    if (['COMMENT', 'ATTACH_DOCUMENT', 'ASSIGN'].includes(action)) {
      return this.updateCase(workflowCase, action, actor, payload);
    }
    const before = workflowCase;
    const changed = this.ruleEngine.apply(workflowCase, action, payload);
    return this.finalizeChange(before, changed, action, actor, payload);
  }

  updateCase(workflowCase, action, actor = {}, payload = {}) {
    const before = workflowCase;
    let changed = { ...workflowCase, updatedAt: new Date().toISOString() };
    if (action === 'ASSIGN') {
      changed = this.assignmentService.assign(changed, payload);
    }
    if (payload.comment) {
      changed.comments = [
        {
          commentId: `wfc-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          type: payload.commentType || 'INTERNAL',
          text: payload.comment,
          actor: actor.email || actor.name || 'system',
          actorRole: actor.role || 'system',
          createdAt: new Date().toISOString()
        },
        ...(changed.comments || [])
      ];
    }
    if (payload.attachment) {
      changed.attachments = [payload.attachment, ...(changed.attachments || [])];
    }
    return this.finalizeChange(before, changed, action, actor, payload);
  }

  finalizeChange(before, changed, action, actor = {}, payload = {}) {
    const event = this.historyService.createEvent({
      caseId: changed.caseId,
      action,
      actor: actor.email || actor.name,
      actorRole: actor.role,
      before,
      after: changed,
      comment: payload.comment || '',
      attachments: payload.attachment ? [payload.attachment] : []
    });
    const withHistory = this.historyService.append(changed, event);
    this.repository.saveCase(withHistory);
    this.repository.saveNotifications(this.notificationService.forTransition(before, withHistory, action));
    return { before, after: withHistory, event };
  }

  getSla(caseItem) {
    const due = new Date(caseItem.dueDate);
    const remainingMs = due.getTime() - Date.now();
    return {
      dueDate: caseItem.dueDate,
      remainingMinutes: Math.round(remainingMs / 60000),
      overSla: remainingMs < 0 && !caseItem.completedAt
    };
  }
}

export const workflowService = new WorkflowService();
