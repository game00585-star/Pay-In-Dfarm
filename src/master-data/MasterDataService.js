import { bankAccountService } from './BankAccountService.js';
import { branchPolicyService } from './BranchPolicyService.js';
import { branchService } from './BranchService.js';
import { businessRuleService } from './BusinessRuleService.js';
import { holidayService } from './HolidayService.js';
import { masterDataRepository } from './MasterDataRepository.js';
import { merchantService } from './MerchantService.js';
import { paymentTypeService } from './PaymentTypeService.js';
import { regionService } from './RegionService.js';

export const MASTER_COLLECTIONS = Object.freeze([
  'branches',
  'branchPolicies',
  'bankAccounts',
  'merchants',
  'paymentTypes',
  'businessRules',
  'holidays',
  'regions'
]);

export class MasterDataService {
  constructor({ repository = masterDataRepository } = {}) {
    this.repository = repository;
  }

  getSnapshot(user = null) {
    const branches = branchService.list(user);
    const branchCodes = new Set(branches.map((branch) => branch.branchCode));
    const scope = (items) => user?.role === 'BRANCH' || user?.role === 'REGIONAL_MANAGER'
      ? items.filter((item) => !item.branchCode || branchCodes.has(item.branchCode))
      : items;
    const snapshot = {
      branches,
      branchPolicies: scope(branchPolicyService.list()),
      bankAccounts: scope(bankAccountService.list()),
      merchants: scope(merchantService.list()),
      paymentTypes: paymentTypeService.list(),
      businessRules: businessRuleService.list(),
      holidays: scope(holidayService.list()),
      regions: regionService.list(),
      approvals: this.repository.listApprovals(),
      history: this.repository.listHistory()
    };
    return {
      ...snapshot,
      dashboard: this.getDashboard(snapshot)
    };
  }

  getDashboard(snapshot = this.getSnapshot()) {
    return {
      branchSummary: snapshot.branches.length,
      regionSummary: snapshot.regions.length,
      bankSummary: snapshot.bankAccounts.length,
      merchantSummary: snapshot.merchants.length,
      businessRuleSummary: snapshot.businessRules.length,
      policySummary: snapshot.branchPolicies.length,
      pendingApproval: snapshot.approvals.filter((item) => item.status === 'PENDING').length,
      recentChanges: snapshot.history.slice(0, 10)
    };
  }

  requestChange(collectionName, item, actor = {}, approvalRequired = true) {
    if (!approvalRequired) return this.applyChange(collectionName, item, actor, 'DIRECT_SAVE');
    const approval = {
      approvalId: `MDA-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      collectionName,
      payload: item,
      status: 'PENDING',
      requestedBy: actor.email || actor.name || 'system',
      requestedRole: actor.role || 'SYSTEM',
      requestedAt: new Date().toISOString()
    };
    this.repository.saveApproval(approval);
    this.recordHistory(collectionName, item, actor, 'REQUEST_APPROVAL');
    return approval;
  }

  approve(approvalId, actor = {}) {
    const approval = this.repository.listApprovals().find((item) => item.approvalId === approvalId);
    if (!approval) return null;
    const saved = this.applyChange(approval.collectionName, approval.payload, actor, 'APPROVE_CHANGE');
    const next = { ...approval, status: 'APPROVED', approvedBy: actor.email || actor.name || 'system', approvedAt: new Date().toISOString(), appliedItem: saved };
    this.repository.saveApproval(next);
    return next;
  }

  reject(approvalId, actor = {}, reason = '') {
    const approval = this.repository.listApprovals().find((item) => item.approvalId === approvalId);
    if (!approval) return null;
    const next = { ...approval, status: 'REJECTED', rejectedBy: actor.email || actor.name || 'system', rejectedAt: new Date().toISOString(), reason };
    this.repository.saveApproval(next);
    this.recordHistory(approval.collectionName, approval.payload, actor, 'REJECT_CHANGE');
    return next;
  }

  applyChange(collectionName, item, actor = {}, action = 'SAVE') {
    const serviceMap = {
      branches: branchService,
      branchPolicies: branchPolicyService,
      bankAccounts: bankAccountService,
      merchants: merchantService,
      paymentTypes: paymentTypeService,
      businessRules: businessRuleService,
      holidays: holidayService,
      regions: regionService
    };
    const saved = serviceMap[collectionName]?.save(item) || this.repository.save(collectionName, item);
    this.recordHistory(collectionName, saved, actor, action);
    return saved;
  }

  recordHistory(collectionName, item, actor = {}, action = 'SAVE') {
    return this.repository.appendHistory({
      historyId: `MDH-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      collectionName,
      itemId: item.branchCode || item.policyId || item.accountId || item.merchantId || item.code || item.ruleId || item.holidayId || item.regionId || item.id || '',
      action,
      actor: actor.email || actor.name || 'system',
      actorRole: actor.role || 'SYSTEM',
      after: item,
      createdAt: new Date().toISOString()
    });
  }

  exportJson(user = null) {
    return JSON.stringify(this.getSnapshot(user), null, 2);
  }

  importRows(collectionName, rows = [], actor = {}) {
    return rows.map((row) => this.requestChange(collectionName, row, actor, false));
  }
}

export const masterDataService = new MasterDataService();
