import { complianceRepository } from './ComplianceRepository.js';

export const CONTROL_RESULTS = Object.freeze(['COMPLIANT', 'NON_COMPLIANT', 'NEED_IMPROVEMENT', 'NOT_APPLICABLE']);

function scoreFromResult(result) {
  if (result === 'NON_COMPLIANT') return 80;
  if (result === 'NEED_IMPROVEMENT') return 45;
  if (result === 'NOT_APPLICABLE') return 0;
  return 5;
}

export class ControlAssessmentService {
  constructor({ repository = complianceRepository } = {}) {
    this.repository = repository;
  }

  list(user = null) {
    const assessments = this.repository.list('assessments');
    if (user?.role === 'BRANCH') return assessments.filter((item) => item.branchName === user.branch || item.branchCode === user.branch);
    if (user?.role === 'REGIONAL_MANAGER') return assessments.filter((item) => item.region === user.region || item.region === user.branch);
    return assessments;
  }

  save(input = {}, actor = {}) {
    const result = input.assessmentResult || 'COMPLIANT';
    const saved = {
      assessmentId: input.assessmentId || `CA-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      branchCode: input.branchCode || '',
      branchName: input.branchName || '',
      region: input.region || '',
      controlCode: input.controlCode || `CTRL-${Date.now()}`,
      controlName: input.controlName || 'Control Assessment',
      assessmentResult: result,
      riskScore: Number(input.riskScore ?? scoreFromResult(result)),
      reviewer: input.reviewer || actor.email || actor.name || '',
      reviewDate: input.reviewDate || new Date().toISOString().slice(0, 10),
      status: input.status || 'ACTIVE',
      evidence: input.evidence || [],
      createdAt: input.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.repository.save('assessments', 'assessmentId', saved);
    this.repository.appendHistory(this.history(saved.assessmentId, input.assessmentId ? 'UPDATE_CONTROL_ASSESSMENT' : 'CREATE_CONTROL_ASSESSMENT', actor, saved));
    return saved;
  }

  attachEvidence(assessmentId, evidence = {}, actor = {}) {
    const assessment = this.list().find((item) => item.assessmentId === assessmentId);
    if (!assessment) return null;
    const savedEvidence = {
      evidenceId: evidence.evidenceId || `CE-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      assessmentId,
      evidenceType: evidence.evidenceType || 'IMAGE',
      fileName: evidence.fileName || '',
      fileSize: Number(evidence.fileSize || 0),
      uploadedBy: actor.email || actor.name || 'system',
      uploadedAt: new Date().toISOString(),
      note: evidence.note || ''
    };
    this.repository.save('evidence', 'evidenceId', savedEvidence);
    this.save({ ...assessment, evidence: [savedEvidence, ...(assessment.evidence || [])] }, actor);
    return savedEvidence;
  }

  history(sourceId, action, actor, payload) {
    return {
      historyId: `CMPH-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      sourceId,
      action,
      actor: actor.email || actor.name || 'system',
      actorRole: actor.role || 'SYSTEM',
      payload,
      createdAt: new Date().toISOString()
    };
  }
}

export const controlAssessmentService = new ControlAssessmentService();
