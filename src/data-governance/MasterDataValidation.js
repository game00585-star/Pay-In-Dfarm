export class MasterDataValidation {
  validate(masterData = {}) {
    const issues = [];
    const branches = masterData.branches || [];
    const bankAccounts = masterData.bankAccounts || [];
    const merchants = masterData.merchants || [];
    const rules = masterData.businessRules || [];
    branches.forEach((branch) => {
      if (!branch.branchCode || !branch.branchName) issues.push(this.issue('MASTER_BRANCH_MISSING_REQUIRED', 'MasterBranch', branch.branchCode, 'HIGH'));
      if (!bankAccounts.some((account) => account.branchCode === branch.branchCode)) issues.push(this.issue('MASTER_BANK_ACCOUNT_MISSING', 'BankAccount', branch.branchCode, 'MEDIUM'));
      if (!merchants.some((merchant) => merchant.branchCode === branch.branchCode)) issues.push(this.issue('MASTER_MERCHANT_MISSING', 'Merchant', branch.branchCode, 'LOW'));
    });
    if (!rules.length) issues.push(this.issue('BUSINESS_RULE_CONFIG_MISSING', 'BusinessRule', 'GLOBAL', 'HIGH'));
    return issues;
  }

  issue(issueType, entityType, recordId, severity) {
    return {
      issueId: `DQ-${issueType}-${recordId}`.replace(/[^A-Za-z0-9-_]/g, '-'),
      branchCode: recordId,
      businessDate: '',
      entityType,
      recordId,
      issueType,
      severity,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      resolvedAt: ''
    };
  }
}

export const masterDataValidation = new MasterDataValidation();
