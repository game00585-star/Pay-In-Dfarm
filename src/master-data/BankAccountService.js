import { masterDataRepository } from './MasterDataRepository.js';

export class BankAccountService {
  constructor({ repository = masterDataRepository } = {}) {
    this.repository = repository;
  }

  list(branchCode = '') {
    const accounts = this.repository.list('bankAccounts');
    return branchCode ? accounts.filter((account) => account.branchCode === branchCode) : accounts;
  }

  save(account) {
    return this.repository.save('bankAccounts', {
      accountId: account.accountId || `ACC-${account.branchCode}-${Date.now()}`,
      branchCode: account.branchCode || '',
      bankName: account.bankName || '',
      accountName: account.accountName || '',
      accountNumberMasked: account.accountNumberMasked || '',
      accountType: account.accountType || 'PAYIN',
      status: account.status || 'ACTIVE'
    });
  }
}

export const bankAccountService = new BankAccountService();
