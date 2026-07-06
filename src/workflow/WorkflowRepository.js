const WORKFLOW_CASES_KEY = 'dfarm_workflow_cases';
const WORKFLOW_NOTIFICATIONS_KEY = 'dfarm_workflow_notifications';

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export class WorkflowRepository {
  listCases() {
    return read(WORKFLOW_CASES_KEY, []);
  }

  saveCase(workflowCase) {
    const cases = this.listCases();
    const next = cases.some((item) => item.caseId === workflowCase.caseId)
      ? cases.map((item) => (item.caseId === workflowCase.caseId ? workflowCase : item))
      : [workflowCase, ...cases];
    write(WORKFLOW_CASES_KEY, next);
    return workflowCase;
  }

  saveCases(cases) {
    write(WORKFLOW_CASES_KEY, cases);
    return cases;
  }

  listNotifications() {
    return read(WORKFLOW_NOTIFICATIONS_KEY, []);
  }

  saveNotifications(notifications) {
    const next = [...notifications, ...this.listNotifications()].slice(0, 10000);
    write(WORKFLOW_NOTIFICATIONS_KEY, next);
    return next;
  }
}

export const workflowRepository = new WorkflowRepository();
