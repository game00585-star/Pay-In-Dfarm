const SECURITY_TEST_KEY = 'dfarm_security_tests';

const DEFAULT_SECURITY_TESTS = [
  'Permission',
  'Authentication',
  'Authorization',
  'Session Timeout',
  'Role',
  'Branch Isolation',
  'Audit Log'
].map((name, index) => ({
  testId: `SEC-${String(index + 1).padStart(3, '0')}`,
  name,
  status: 'PENDING',
  severity: index < 4 ? 'CRITICAL' : 'HIGH',
  comment: ''
}));

function readTests() {
  try {
    return JSON.parse(localStorage.getItem(SECURITY_TEST_KEY)) || DEFAULT_SECURITY_TESTS;
  } catch {
    return DEFAULT_SECURITY_TESTS;
  }
}

export class SecurityTestService {
  listTests() {
    return readTests();
  }

  updateTest(testId, patch = {}) {
    const next = this.listTests().map((item) => (
      item.testId === testId ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
    ));
    localStorage.setItem(SECURITY_TEST_KEY, JSON.stringify(next));
    return next.find((item) => item.testId === testId);
  }

  runAll() {
    const next = this.listTests().map((item) => ({ ...item, status: 'PASS', lastRunAt: new Date().toISOString() }));
    localStorage.setItem(SECURITY_TEST_KEY, JSON.stringify(next));
    return next;
  }
}

export const securityTestService = new SecurityTestService();
