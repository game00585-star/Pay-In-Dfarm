import {
  masterBanks,
  masterBranches,
  masterPaymentTypes,
  masterValidationRules
} from '../infrastructure/database/masterData.js';

const STORE_KEY = 'dfarm_master_data_center';
const HISTORY_KEY = 'dfarm_master_data_history';
const APPROVAL_KEY = 'dfarm_master_data_approvals';

const DEFAULT_REGIONS = [
  { regionId: 'HQ', regionName: 'Head Office', regionType: 'HEAD_OFFICE', parentRegionId: '', status: 'ACTIVE' },
  { regionId: 'BKK', regionName: 'Bangkok', regionType: 'REGION', parentRegionId: 'HQ', status: 'ACTIVE' },
  { regionId: 'NORTH', regionName: 'North', regionType: 'REGION', parentRegionId: 'HQ', status: 'ACTIVE' },
  { regionId: 'SOUTH', regionName: 'South', regionType: 'REGION', parentRegionId: 'HQ', status: 'ACTIVE' }
];

const DEFAULT_MASTER_DATA = {
  branches: masterBranches.map((branch) => ({
    branchCode: branch.code,
    branchName: branch.name,
    region: branch.area || 'HQ',
    province: branch.area || '',
    status: branch.active ? 'OPEN' : 'CLOSED',
    openingDate: '2026-01-01',
    closingDate: '',
    isActive: branch.active !== false
  })),
  branchPolicies: masterBranches.map((branch) => ({
    policyId: `POL-${branch.code}`,
    branchCode: branch.code,
    morningStart: '08:00',
    morningEnd: '14:00',
    afternoonStart: '14:00',
    afternoonEnd: branch.area === 'Bangkok' ? '22:00' : '21:00',
    depositPolicy: 'NEXT_DAY',
    paymentPolicy: 'TOTAL_ONLY',
    businessDatePolicy: 'BUSINESS_DATE',
    effectiveDate: '2026-01-01',
    status: 'ACTIVE'
  })),
  bankAccounts: masterBranches.flatMap((branch, index) => masterBanks.slice(0, 2).map((bank) => ({
    accountId: `ACC-${branch.code}-${bank.shortName}`,
    branchCode: branch.code,
    bankName: bank.shortName,
    accountName: `D-FARM ${branch.name}`,
    accountNumberMasked: `xxx-x-${56780 + index}-${bank.code}`,
    accountType: bank.shortName === 'SCB' ? 'PAYIN' : 'TRANSFER',
    status: 'ACTIVE'
  }))),
  merchants: masterBranches.map((branch) => ({
    merchantId: `MER-MM-${branch.code}`,
    branchCode: branch.code,
    merchantType: 'MAEMANEE',
    merchantName: `${branch.name} MaeManee`,
    merchantCode: `SCB-MM-${branch.code}`,
    provider: 'SCB',
    status: 'ACTIVE'
  })),
  paymentTypes: [
    ...masterPaymentTypes.map((item) => ({ ...item, status: item.active ? 'ACTIVE' : 'INACTIVE' })),
    { id: 'FUTURE_PAYMENT', code: 'FUTURE_PAYMENT', name: 'Future Payment', posField: '', requiredDocumentType: '', active: false, status: 'INACTIVE' }
  ],
  businessRules: masterValidationRules.map((rule) => ({
    ruleId: rule.id,
    ruleCode: rule.code,
    name: rule.name,
    category: rule.appliesTo || 'GENERAL',
    severity: rule.severity || 'MEDIUM',
    status: rule.active ? 'ACTIVE' : 'INACTIVE',
    enabled: rule.active !== false
  })),
  holidays: [
    { holidayId: 'HOL-2026-01-01', holidayDate: '2026-01-01', holidayName: 'New Year', branchCode: '', holidayType: 'PUBLIC', status: 'ACTIVE' },
    { holidayId: 'HOL-2026-04-13', holidayDate: '2026-04-13', holidayName: 'Songkran', branchCode: '', holidayType: 'PUBLIC', status: 'ACTIVE' }
  ],
  regions: DEFAULT_REGIONS
};

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

function collectionKey(collectionName) {
  return collectionName || 'branches';
}

function idField(collectionName) {
  return {
    branches: 'branchCode',
    branchPolicies: 'policyId',
    bankAccounts: 'accountId',
    merchants: 'merchantId',
    paymentTypes: 'code',
    businessRules: 'ruleId',
    holidays: 'holidayId',
    regions: 'regionId'
  }[collectionName] || 'id';
}

export class MasterDataRepository {
  getStore() {
    return { ...DEFAULT_MASTER_DATA, ...read(STORE_KEY, DEFAULT_MASTER_DATA) };
  }

  saveStore(store) {
    write(STORE_KEY, store);
    return store;
  }

  list(collectionName) {
    return this.getStore()[collectionKey(collectionName)] || [];
  }

  save(collectionName, item) {
    const store = this.getStore();
    const key = collectionKey(collectionName);
    const field = idField(key);
    const value = item[field] || item.id || `${key}-${Date.now()}`;
    const saved = { ...item, [field]: value, updatedAt: new Date().toISOString() };
    const items = store[key] || [];
    store[key] = items.some((entry) => entry[field] === value)
      ? items.map((entry) => (entry[field] === value ? saved : entry))
      : [saved, ...items];
    this.saveStore(store);
    return saved;
  }

  appendHistory(entry) {
    write(HISTORY_KEY, [entry, ...this.listHistory()].slice(0, 100000));
    return entry;
  }

  listHistory() {
    return read(HISTORY_KEY, []);
  }

  saveApproval(approval) {
    const approvals = this.listApprovals();
    const next = approvals.some((item) => item.approvalId === approval.approvalId)
      ? approvals.map((item) => (item.approvalId === approval.approvalId ? approval : item))
      : [approval, ...approvals];
    write(APPROVAL_KEY, next);
    return approval;
  }

  listApprovals() {
    return read(APPROVAL_KEY, []);
  }
}

export const masterDataRepository = new MasterDataRepository();
