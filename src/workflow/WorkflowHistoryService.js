export class WorkflowHistoryService {
  createEvent({ caseId, action, actor, actorRole, before, after, comment = '', attachments = [] }) {
    return {
      eventId: `wfh-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      caseId,
      action,
      actor: actor || 'system',
      actorRole: actorRole || 'system',
      fromStep: before?.currentStep || '',
      toStep: after?.currentStep || '',
      fromStatus: before?.currentStatus || '',
      toStatus: after?.currentStatus || '',
      comment,
      attachments,
      createdAt: new Date().toISOString()
    };
  }

  append(caseItem, event) {
    return {
      ...caseItem,
      timeline: [event, ...(caseItem.timeline || [])].slice(0, 1000)
    };
  }
}

export const workflowHistoryService = new WorkflowHistoryService();
