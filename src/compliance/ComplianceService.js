import { complianceCaseService } from './ComplianceCaseService.js';
import { complianceReportService } from './ComplianceReportService.js';
import { complianceRuleEngine } from './ComplianceRuleEngine.js';
import { controlAssessmentService } from './ControlAssessmentService.js';
import { policyService } from './PolicyService.js';

export class ComplianceService {
  buildSnapshot({ records = [], exceptions = [], fraud = null, auditFindings = [], user = null } = {}) {
    const policies = policyService.list();
    const assessments = controlAssessmentService.list(user);
    const cases = complianceCaseService.list(user);
    const report = complianceReportService.build(user);
    return {
      ...report,
      ruleResults: complianceRuleEngine.evaluate({ records, policies, assessments, cases }),
      sourceLinks: {
        businessException: exceptions.length,
        fraudPattern: fraud?.alerts?.length || 0,
        auditFinding: auditFindings.length
      }
    };
  }

  syncCasesFromSources(input = {}, actor = {}) {
    const policies = policyService.list();
    return complianceCaseService.syncFromSources({ ...input, policies }, actor);
  }
}

export const complianceService = new ComplianceService();
