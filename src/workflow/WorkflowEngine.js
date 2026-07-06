import { workflowPermissionService } from './WorkflowPermissionService.js';
import { workflowService } from './WorkflowService.js';

export class WorkflowEngine {
  buildDashboard(cases = [], user = null) {
    const visible = cases.filter((item) => workflowPermissionService.canRead(user, item));
    const today = new Date().toISOString().slice(0, 10);
    const withSla = visible.map((item) => ({ ...item, sla: workflowService.getSla(item) }));
    return {
      cases: withSla,
      stats: {
        myTask: withSla.filter((item) => item.assignedUser === user?.email || item.assignedRole === user?.role).length,
        pendingReview: withSla.filter((item) => ['WAITING_ACCOUNTING', 'WAITING_AUDIT', 'WAITING_MANAGER'].includes(item.currentStep)).length,
        overSla: withSla.filter((item) => item.sla.overSla).length,
        today: withSla.filter((item) => (item.createdAt || '').slice(0, 10) === today).length,
        completedToday: withSla.filter((item) => (item.completedAt || '').slice(0, 10) === today).length,
        rejected: withSla.filter((item) => item.currentStatus === 'REJECTED').length,
        returned: withSla.filter((item) => item.currentStatus === 'RETURNED').length
      },
      slaDashboard: {
        overSla: withSla.filter((item) => item.sla.overSla),
        dueToday: withSla.filter((item) => (item.dueDate || '').slice(0, 10) === today && !item.completedAt),
        critical: withSla.filter((item) => item.priority === 'CRITICAL')
      }
    };
  }
}

export const workflowEngine = new WorkflowEngine();
