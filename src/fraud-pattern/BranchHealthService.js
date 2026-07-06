export class BranchHealthService {
  calculate(score = 0) {
    if (score <= 20) return 'Excellent';
    if (score <= 40) return 'Good';
    if (score <= 70) return 'Warning';
    return 'Critical';
  }
}

export const branchHealthService = new BranchHealthService();
