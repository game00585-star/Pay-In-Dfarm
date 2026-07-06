import {
  DOCUMENT_TYPES,
  PAYMENT_TYPES,
  PAYIN_STATUS,
  PARSER_STATUS,
  RISK_FLAGS,
  ROLES,
  ROLE_PERMISSIONS
} from '../../domain/constants/index.js';

export const masterBranches = [
  {
    id: 'bkk-01',
    code: '00074',
    name: 'D-FARM Bangkok 01',
    area: 'Bangkok',
    merchantIds: ['SCB-MM-00074'],
    receiverAccounts: ['123-4-56789-0'],
    active: true
  },
  {
    id: 'cnx-02',
    code: '00082',
    name: 'D-FARM Chiang Mai 02',
    area: 'North',
    merchantIds: ['SCB-MM-00082'],
    receiverAccounts: ['123-4-56789-1'],
    active: true
  },
  {
    id: 'hkt-03',
    code: '00109',
    name: 'D-FARM Phuket 03',
    area: 'South',
    merchantIds: ['SCB-MM-00109'],
    receiverAccounts: ['123-4-56789-2'],
    active: true
  }
];

export const masterBanks = [
  { id: 'scb', code: '014', name: 'Siam Commercial Bank', shortName: 'SCB', active: true },
  { id: 'kbank', code: '004', name: 'Kasikorn Bank', shortName: 'KBank', active: true },
  { id: 'bbl', code: '002', name: 'Bangkok Bank', shortName: 'BBL', active: true },
  { id: 'ktb', code: '006', name: 'Krungthai Bank', shortName: 'KTB', active: true }
];

export const masterRoles = Object.values(ROLES).map((role) => ({
  id: role,
  code: role,
  name: role,
  permissions: ROLE_PERMISSIONS[role] || [],
  active: true
}));

export const masterUsers = [
  { id: 'admin', name: 'Admin Demo', email: 'admin@dfarm.test', role: ROLES.ADMIN, branch: 'D-FARM Bangkok 01', active: true },
  { id: 'branch', name: 'Branch Demo', email: 'branch@dfarm.test', role: ROLES.BRANCH, branch: 'D-FARM Bangkok 01', active: true },
  { id: 'accounting', name: 'Accounting Demo', email: 'accounting@dfarm.test', role: ROLES.ACCOUNTING, branch: 'HQ', active: true },
  { id: 'audit', name: 'Audit Demo', email: 'audit@dfarm.test', role: ROLES.AUDIT, branch: 'HQ', active: true },
  { id: 'regional', name: 'Regional Manager Demo', email: 'regional@dfarm.test', role: ROLES.REGIONAL_MANAGER, branch: 'Bangkok', region: 'Bangkok', active: true },
  { id: 'executive', name: 'Executive Demo', email: 'executive@dfarm.test', role: ROLES.EXECUTIVE, branch: 'HQ', active: true }
];

export const masterPaymentTypes = [
  {
    id: PAYMENT_TYPES.CASH,
    code: PAYMENT_TYPES.CASH,
    name: 'เงินสด',
    posField: 'cashToDepositAmount',
    requiredDocumentType: DOCUMENT_TYPES.PAYIN_BANK_COUNTER,
    active: true
  },
  {
    id: PAYMENT_TYPES.DEBTOR_TRANSFER,
    code: PAYMENT_TYPES.DEBTOR_TRANSFER,
    name: 'โอนลูกหนี้',
    posField: 'debtorTransferAmount',
    requiredDocumentType: DOCUMENT_TYPES.DEBTOR_TRANSFER_RECEIPT,
    active: true
  },
  {
    id: PAYMENT_TYPES.BANK_TRANSFER,
    code: PAYMENT_TYPES.BANK_TRANSFER,
    name: 'เงินโอน',
    posField: 'transferAmount',
    requiredDocumentType: DOCUMENT_TYPES.BANK_TRANSFER_SLIP,
    active: true
  },
  {
    id: PAYMENT_TYPES.MAEMANEE,
    code: PAYMENT_TYPES.MAEMANEE,
    name: 'แม่มณี',
    posField: 'maemaneeAmount',
    requiredDocumentType: DOCUMENT_TYPES.MAEMANEE_QR_ALERT,
    active: true
  },
  {
    id: PAYMENT_TYPES.CRM_COUPON,
    code: PAYMENT_TYPES.CRM_COUPON,
    name: 'CRM Coupon',
    posField: 'couponAmount',
    requiredDocumentType: DOCUMENT_TYPES.CRM_COUPON_RECEIPT,
    active: true
  }
];

export const masterDocumentTypes = [
  { id: DOCUMENT_TYPES.POS_SUMMARY, code: DOCUMENT_TYPES.POS_SUMMARY, name: 'POS Summary', category: 'Sales Summary', required: true, active: true },
  { id: DOCUMENT_TYPES.PAYIN_BANK_COUNTER, code: DOCUMENT_TYPES.PAYIN_BANK_COUNTER, name: 'Pay-in Bank Counter', category: 'Pay-in', required: false, active: true },
  { id: DOCUMENT_TYPES.PAYIN_ATM, code: DOCUMENT_TYPES.PAYIN_ATM, name: 'Pay-in ATM', category: 'Pay-in', required: false, active: true },
  { id: DOCUMENT_TYPES.PAYIN_COUNTER_SERVICE, code: DOCUMENT_TYPES.PAYIN_COUNTER_SERVICE, name: 'Pay-in Counter Service', category: 'Pay-in', required: false, active: true },
  { id: DOCUMENT_TYPES.PAYIN_LOTUS, code: DOCUMENT_TYPES.PAYIN_LOTUS, name: 'Pay-in Lotus', category: 'Pay-in', required: false, active: true },
  { id: DOCUMENT_TYPES.BANK_TRANSFER_SLIP, code: DOCUMENT_TYPES.BANK_TRANSFER_SLIP, name: 'Bank Transfer Slip', category: 'Transfer', required: false, active: true },
  { id: DOCUMENT_TYPES.MAEMANEE_QR_ALERT, code: DOCUMENT_TYPES.MAEMANEE_QR_ALERT, name: 'Maemanee QR Alert', category: 'QR Payment', required: false, active: true },
  { id: DOCUMENT_TYPES.DEBTOR_TRANSFER_RECEIPT, code: DOCUMENT_TYPES.DEBTOR_TRANSFER_RECEIPT, name: 'Debtor Transfer Receipt', category: 'Debtor', required: false, active: true },
  { id: DOCUMENT_TYPES.CRM_COUPON_RECEIPT, code: DOCUMENT_TYPES.CRM_COUPON_RECEIPT, name: 'CRM Coupon Receipt', category: 'Coupon', required: false, active: true },
  { id: DOCUMENT_TYPES.UNKNOWN, code: DOCUMENT_TYPES.UNKNOWN, name: 'Unknown', category: 'Unknown', required: false, active: true }
];

export const masterRiskFlags = Object.values(RISK_FLAGS).map((flag) => ({
  id: flag,
  code: flag,
  name: flag,
  active: true
}));

export const masterStatuses = [
  ...Object.values(PAYIN_STATUS).map((status) => ({ id: status, code: status, group: 'PAYIN', active: true })),
  ...Object.values(PARSER_STATUS).map((status) => ({ id: `PARSER_${status}`, code: status, group: 'PARSER', active: true }))
];

export const masterValidationRules = [
  {
    id: 'G-001',
    code: 'POS_SUMMARY_REQUIRED',
    name: 'POS Summary is required',
    appliesTo: DOCUMENT_TYPES.POS_SUMMARY,
    severity: 'HIGH',
    riskFlag: RISK_FLAGS.POS_SUMMARY_MISSING,
    active: true
  },
  {
    id: 'G-002',
    code: 'PAYMENT_CHANNEL_REQUIRES_DOCUMENT',
    name: 'Payment channel with amount requires supporting document',
    appliesTo: 'PAYMENT_CHANNEL',
    severity: 'HIGH',
    riskFlag: RISK_FLAGS.MISSING_REQUIRED_DOCUMENT,
    active: true
  },
  {
    id: 'REC-001',
    code: 'POS_TOTAL_MATCHES_NET',
    name: 'POS totalPaidAmount must match netAmount within tolerance',
    appliesTo: DOCUMENT_TYPES.POS_SUMMARY,
    tolerance: 1,
    severity: 'MEDIUM',
    riskFlag: RISK_FLAGS.POS_TOTAL_MISMATCH,
    active: true
  },
  {
    id: 'REC-002',
    code: 'CASH_MATCHES_PAYIN',
    name: 'POS cashToDepositAmount must match Pay-in amount',
    appliesTo: PAYMENT_TYPES.CASH,
    tolerance: 1,
    severity: 'HIGH',
    riskFlag: RISK_FLAGS.POS_CASH_PAYIN_MISMATCH,
    active: true
  },
  {
    id: 'REC-003',
    code: 'TRANSFER_MATCHES_SLIPS',
    name: 'POS transferAmount must match bank transfer slips',
    appliesTo: PAYMENT_TYPES.BANK_TRANSFER,
    tolerance: 1,
    severity: 'HIGH',
    riskFlag: RISK_FLAGS.POS_TRANSFER_SLIP_MISMATCH,
    active: true
  },
  {
    id: 'OCR-001',
    code: 'LOW_CONFIDENCE_REVIEW',
    name: 'OCR confidence below 80 requires review',
    appliesTo: 'ALL_DOCUMENTS',
    threshold: 80,
    severity: 'MEDIUM',
    riskFlag: RISK_FLAGS.LOW_AI_CONFIDENCE,
    active: true
  },
  {
    id: 'DUP-001',
    code: 'DUPLICATE_IMAGE_NOT_ALLOWED',
    name: 'Document image hash must be unique',
    appliesTo: 'ALL_DOCUMENTS',
    severity: 'HIGH',
    riskFlag: RISK_FLAGS.DUPLICATE_IMAGE,
    active: true
  },
  {
    id: 'DUP-002',
    code: 'DUPLICATE_REFERENCE_NOT_ALLOWED',
    name: 'Document reference must be unique',
    appliesTo: 'ALL_DOCUMENTS',
    severity: 'HIGH',
    riskFlag: RISK_FLAGS.DUPLICATE_REFERENCE,
    active: true
  }
];

export const masterDataCollections = {
  branches: masterBranches,
  banks: masterBanks,
  users: masterUsers,
  roles: masterRoles,
  paymentTypes: masterPaymentTypes,
  documentTypes: masterDocumentTypes,
  riskFlags: masterRiskFlags,
  statuses: masterStatuses,
  validationRules: masterValidationRules
};
