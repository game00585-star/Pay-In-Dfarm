const CHECKLIST_KEY = 'dfarm_go_live_checklist';

const DEFAULT_ITEMS = [
  ['AI_PROVIDER_READY', 'AI Provider', 'AI', true],
  ['OCR_PROVIDER_READY', 'OCR Provider', 'OCR', true],
  ['DATABASE_READY', 'Database', 'Database', true],
  ['STORAGE_READY', 'Storage', 'Storage', true],
  ['QUEUE_READY', 'Queue', 'Queue', true],
  ['WORKER_READY', 'Worker', 'Worker', true],
  ['WORKFLOW_READY', 'Workflow', 'Workflow', true],
  ['NOTIFICATION_READY', 'Notification', 'Notification', false],
  ['BACKUP_READY', 'Backup', 'Backup', true],
  ['SECURITY_READY', 'Security', 'Security', true]
].map(([code, name, category, critical]) => ({
  code,
  name,
  category,
  critical,
  status: 'PENDING',
  evidence: '',
  checkedBy: '',
  checkedAt: ''
}));

function readItems() {
  try {
    return JSON.parse(localStorage.getItem(CHECKLIST_KEY)) || DEFAULT_ITEMS;
  } catch {
    return DEFAULT_ITEMS;
  }
}

export class GoLiveChecklistService {
  listItems() {
    return readItems();
  }

  updateItem(code, patch = {}) {
    const next = this.listItems().map((item) => (
      item.code === code ? { ...item, ...patch, checkedAt: new Date().toISOString() } : item
    ));
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
    return next;
  }

  evaluate(items = this.listItems()) {
    const critical = items.filter((item) => item.critical);
    const passed = items.filter((item) => item.status === 'PASS');
    const criticalPassed = critical.filter((item) => item.status === 'PASS');
    const criticalPercent = critical.length ? Math.round((criticalPassed.length / critical.length) * 100) : 100;
    const overallPercent = items.length ? Math.round((passed.length / items.length) * 100) : 100;
    return {
      criticalPercent,
      overallPercent,
      ready: criticalPercent === 100 && overallPercent >= 95,
      failedCritical: critical.filter((item) => item.status !== 'PASS')
    };
  }
}

export const goLiveChecklistService = new GoLiveChecklistService();
