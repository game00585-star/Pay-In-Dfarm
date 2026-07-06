const UAT_KEY = 'dfarm_uat_test_cases';

export const UAT_CATEGORIES = Object.freeze([
  'Branch Upload',
  'OCR',
  'AI',
  'Pay-in',
  'Shift Report',
  'Shift Reconciliation',
  'Workflow',
  'Accounting',
  'Audit',
  'Dashboard',
  'Notification',
  'Performance'
]);

const DEFAULT_TEST_CASES = UAT_CATEGORIES.map((category, index) => ({
  testCaseId: `UAT-${String(index + 1).padStart(3, '0')}`,
  category,
  title: `${category} acceptance test`,
  steps: `Run ${category} scenario with sample branch data.`,
  expectedResult: `${category} scenario completes without critical error.`,
  status: 'PENDING',
  comment: '',
  approvedBy: '',
  approvedAt: ''
}));

function readCases() {
  try {
    return JSON.parse(localStorage.getItem(UAT_KEY)) || DEFAULT_TEST_CASES;
  } catch {
    return DEFAULT_TEST_CASES;
  }
}

export class UATService {
  listTestCases() {
    return readCases();
  }

  createTestCase(testCase) {
    const saved = {
      testCaseId: testCase.testCaseId || `UAT-${Date.now()}`,
      category: testCase.category || 'Branch Upload',
      title: testCase.title || 'New UAT test',
      steps: testCase.steps || '',
      expectedResult: testCase.expectedResult || '',
      status: 'PENDING',
      comment: '',
      approvedBy: '',
      approvedAt: '',
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(UAT_KEY, JSON.stringify([saved, ...this.listTestCases()]));
    return saved;
  }

  updateTestCase(testCaseId, patch = {}) {
    const next = this.listTestCases().map((item) => (
      item.testCaseId === testCaseId ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
    ));
    localStorage.setItem(UAT_KEY, JSON.stringify(next));
    return next.find((item) => item.testCaseId === testCaseId);
  }

  runTest(testCaseId, actor = '') {
    return this.updateTestCase(testCaseId, { status: 'RUNNING', lastRunBy: actor, lastRunAt: new Date().toISOString() });
  }

  approve(testCaseId, actor = '', comment = '') {
    return this.updateTestCase(testCaseId, { status: 'APPROVED', approvedBy: actor, approvedAt: new Date().toISOString(), comment });
  }

  reject(testCaseId, actor = '', comment = '') {
    return this.updateTestCase(testCaseId, { status: 'REJECTED', rejectedBy: actor, rejectedAt: new Date().toISOString(), comment });
  }

  summary() {
    const cases = this.listTestCases();
    return {
      total: cases.length,
      approved: cases.filter((item) => item.status === 'APPROVED').length,
      rejected: cases.filter((item) => item.status === 'REJECTED').length,
      running: cases.filter((item) => item.status === 'RUNNING').length,
      pending: cases.filter((item) => item.status === 'PENDING').length
    };
  }
}

export const uatService = new UATService();
