import { ROLES } from '../domain/constants/roles.js';

export const MENU_ITEMS = Object.freeze([
  { key: 'Submit', label: 'เธชเนเธ Pay-in', roles: [ROLES.ADMIN, ROLES.BRANCH] },
  { key: 'Mobile', label: 'Mobile Operations', roles: [ROLES.ADMIN, ROLES.BRANCH, ROLES.ACCOUNTING, ROLES.AUDIT, ROLES.REGIONAL_MANAGER, ROLES.EXECUTIVE] },
  { key: 'CaseManagement', label: 'Case Management', roles: [ROLES.ADMIN, ROLES.BRANCH, ROLES.ACCOUNTING, ROLES.AUDIT, ROLES.REGIONAL_MANAGER, ROLES.EXECUTIVE] },
  { key: 'AIAssistant', label: 'AI Assistant', roles: [ROLES.ADMIN, ROLES.ACCOUNTING, ROLES.AUDIT, ROLES.REGIONAL_MANAGER, ROLES.EXECUTIVE] },
  { key: 'Evidence', label: 'Document Evidence', roles: [ROLES.ADMIN, ROLES.BRANCH, ROLES.ACCOUNTING, ROLES.AUDIT, ROLES.EXECUTIVE] },
  { key: 'MasterData', label: 'Master Data Center', roles: [ROLES.ADMIN, ROLES.BRANCH, ROLES.ACCOUNTING, ROLES.AUDIT, ROLES.REGIONAL_MANAGER, ROLES.EXECUTIVE] },
  { key: 'DataGovernance', label: 'Data Governance', roles: [ROLES.ADMIN, ROLES.ACCOUNTING, ROLES.AUDIT, ROLES.REGIONAL_MANAGER, ROLES.EXECUTIVE] },
  { key: 'ExecutiveBI', label: 'Executive BI', roles: [ROLES.ADMIN, ROLES.BRANCH, ROLES.ACCOUNTING, ROLES.AUDIT, ROLES.REGIONAL_MANAGER, ROLES.EXECUTIVE] },
  { key: 'InternalAudit', label: 'Internal Audit', roles: [ROLES.ADMIN, ROLES.ACCOUNTING, ROLES.AUDIT, ROLES.REGIONAL_MANAGER, ROLES.EXECUTIVE] },
  { key: 'Compliance', label: 'Compliance', roles: [ROLES.ADMIN, ROLES.ACCOUNTING, ROLES.AUDIT, ROLES.REGIONAL_MANAGER, ROLES.EXECUTIVE] },
  { key: 'Review', label: 'Document Inbox', roles: [ROLES.ADMIN, ROLES.ACCOUNTING, ROLES.AUDIT] },
  { key: 'Operations', label: 'Operations Center', roles: [ROLES.ADMIN, ROLES.BRANCH, ROLES.ACCOUNTING, ROLES.AUDIT, ROLES.REGIONAL_MANAGER, ROLES.EXECUTIVE] },
  { key: 'Launch', label: 'Enterprise Launch', roles: [ROLES.ADMIN, ROLES.EXECUTIVE] },
  { key: 'Integration', label: 'Integration Platform', roles: [ROLES.ADMIN] },
  { key: 'ShiftReconciliation', label: 'Shift Reconciliation', roles: [ROLES.ADMIN, ROLES.ACCOUNTING, ROLES.AUDIT] },
  { key: 'ShiftMatching', label: 'Shift Pay-in Matching', roles: [ROLES.ADMIN, ROLES.ACCOUNTING, ROLES.AUDIT] },
  { key: 'DepositBatch', label: 'Deposit Batch', roles: [ROLES.ADMIN, ROLES.ACCOUNTING, ROLES.AUDIT] },
  { key: 'Workflow', label: 'Enterprise Workflow', roles: [ROLES.ADMIN, ROLES.ACCOUNTING, ROLES.AUDIT, ROLES.REGIONAL_MANAGER, ROLES.EXECUTIVE, ROLES.BRANCH] },
  { key: 'Platform', label: 'Platform Console', roles: [ROLES.ADMIN, ROLES.EXECUTIVE] },
  { key: 'GoLive', label: 'Go Live Readiness', roles: [ROLES.ADMIN, ROLES.EXECUTIVE] },
  { key: 'BranchRisk', label: 'Branch Risk Analytics', roles: [ROLES.ADMIN, ROLES.ACCOUNTING, ROLES.AUDIT] },
  { key: 'Audit', label: 'เธฃเธฒเธขเธเธฒเธ Audit', roles: [ROLES.ADMIN, ROLES.AUDIT] },
  { key: 'AIDataset', label: 'AI Dataset', roles: [ROLES.ADMIN] },
  { key: 'AISettings', label: 'AI Settings', roles: [ROLES.ADMIN] },
  { key: 'AITest', label: 'AI Test', roles: [ROLES.ADMIN] },
  { key: 'OCRTest', label: 'OCR Test', roles: [ROLES.ADMIN] },
  { key: 'OpenCVTest', label: 'OpenCV Test', roles: [ROLES.ADMIN] },
  { key: 'ShiftReportAITest', label: 'Shift Report AI Test', roles: [ROLES.ADMIN] },
  { key: 'BankTransferSlipAITest', label: 'Bank Transfer Slip AI Test', roles: [ROLES.ADMIN] },
  { key: 'Settings', label: 'เธเธฑเธ”เธเธฒเธฃ Master Data', roles: [ROLES.ADMIN] }
]);

export const PAGE_TITLES = Object.freeze({
  Submit: 'เธชเธฒเธเธฒเธชเนเธเธฃเธฒเธขเธเธฒเธฃ Pay-in',
  Mobile: 'Mobile Operations Platform',
  CaseManagement: 'Branch Communication & Case Management',
  AIAssistant: 'AI Knowledge & Decision Support',
  AIAssistant: 'AI Knowledge & Decision Support',
  Evidence: 'Document Version Control & Evidence',
  MasterData: 'Master Data & Branch Administration Center',
  DataGovernance: 'Enterprise Data Governance',
  ExecutiveBI: 'Enterprise Business Intelligence',
  InternalAudit: 'Internal Audit Management Platform',
  Compliance: 'Compliance & Corporate Governance',
  Review: 'Document Inbox',
  Operations: 'Operations Center',
  Launch: 'Enterprise Launch',
  Integration: 'Integration Platform',
  ShiftReconciliation: 'Shift Reconciliation',
  ShiftMatching: 'Shift Pay-in Matching',
  DepositBatch: 'Deposit Batch Viewer',
  Workflow: 'Enterprise Workflow',
  Platform: 'Platform Console',
  GoLive: 'Go Live Readiness',
  BranchRisk: 'Branch Risk Analytics',
  Audit: 'เนเธ”เธเธเธญเธฃเนเธ” Audit',
  AIDataset: 'AI Dataset',
  AISettings: 'AI Settings',
  AITest: 'AI Test',
  OCRTest: 'OCR Test',
  OpenCVTest: 'OpenCV Test',
  ShiftReportAITest: 'Shift Report AI Test',
  BankTransferSlipAITest: 'Bank Transfer Slip AI Test',
  Settings: 'เธเธฑเธ”เธเธฒเธฃ Master Data'
});

export function getMenuForRole(role) {
  return MENU_ITEMS.filter((item) => item.roles.includes(role));
}

export function getDefaultTabForRole(role) {
  return getMenuForRole(role)[0]?.key || 'Submit';
}

export function canReadRecord(user, record) {
  if (!user) return false;
  if (user.role === ROLES.BRANCH) return record.branch === user.branch;
  return [ROLES.ADMIN, ROLES.ACCOUNTING, ROLES.AUDIT, ROLES.EXECUTIVE, ROLES.REGIONAL_MANAGER].includes(user.role);
}

export function canReview(user) {
  return [ROLES.ADMIN, ROLES.ACCOUNTING].includes(user?.role);
}

export function canManageMasterData(user) {
  return user?.role === ROLES.ADMIN;
}

