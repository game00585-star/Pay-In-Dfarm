import { masterDataRepository } from './MasterDataRepository.js';

export class BranchService {
  constructor({ repository = masterDataRepository } = {}) {
    this.repository = repository;
  }

  list(user = null) {
    const branches = this.repository.list('branches');
    if (!user) return [];
    if (user.role === 'BRANCH') return branches.filter((branch) => branch.branchName === user.branch || branch.branchCode === user.branch);
    if (user.role === 'REGIONAL_MANAGER') return branches.filter((branch) => branch.region === user.region || branch.region === user.branch);
    return branches;
  }

  save(branch) {
    return this.repository.save('branches', {
      branchCode: branch.branchCode,
      branchName: branch.branchName || '',
      region: branch.region || 'HQ',
      province: branch.province || '',
      status: branch.status || 'OPEN',
      openingDate: branch.openingDate || new Date().toISOString().slice(0, 10),
      closingDate: branch.closingDate || '',
      isActive: branch.isActive !== false
    });
  }
}

export const branchService = new BranchService();
