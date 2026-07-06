import { BusinessRuleValidator } from './BusinessRuleValidator.js';
import { ExceptionClassifier } from './ExceptionClassifier.js';
import { RiskScoreCalculator } from './RiskScoreCalculator.js';

function branchCodeFromRecord(record = {}) {
  return record.branchCode || record.documents?.find((document) => document.documentType === 'POS_SUMMARY')?.parsedData?.branchCode || record.branch?.match(/\d{5}/)?.[0] || '';
}

function normalizedShift(shift = '') {
  const text = String(shift || '').toUpperCase();
  if (text.includes('MORNING') || String(shift).includes('เช้า')) return 'MORNING';
  if (text.includes('AFTERNOON') || String(shift).includes('บ่าย')) return 'AFTERNOON';
  return text || 'UNKNOWN';
}

export class BusinessExceptionEngine {
  constructor({
    validator = new BusinessRuleValidator(),
    classifier = new ExceptionClassifier(),
    scoreCalculator = new RiskScoreCalculator()
  } = {}) {
    this.validator = validator;
    this.classifier = classifier;
    this.scoreCalculator = scoreCalculator;
  }

  buildForRecord(record = {}) {
    const createdAt = new Date().toISOString();
    const branchCode = branchCodeFromRecord(record);
    const businessDate = record.date || record.shiftReconciliation?.businessDate || '';
    const shift = normalizedShift(record.shift || record.shiftReconciliation?.shift);
    return this.validator.collect(record).map((raw, index) => {
      const classified = this.classifier.classify(raw.ruleCode);
      return {
        exceptionId: `EX-${record.id || branchCode}-${raw.ruleCode}-${index}`.replace(/\s+/g, '-'),
        recordId: record.id || '',
        branchCode,
        branchName: record.branch || '',
        businessDate,
        shift,
        severity: classified.severity,
        category: classified.category,
        ruleCode: raw.ruleCode,
        description: classified.description,
        expectedValue: raw.expectedValue,
        actualValue: raw.actualValue,
        difference: raw.difference,
        status: 'OPEN',
        assignedTo: '',
        resolvedBy: '',
        resolvedAt: '',
        comment: '',
        falsePositive: false,
        createdAt,
        scoreWeight: this.scoreWeight(raw.ruleCode)
      };
    });
  }

  summarize(record = {}) {
    const exceptions = this.buildForRecord(record);
    const riskScore = this.scoreCalculator.calculate(exceptions);
    return {
      exceptions,
      riskScore,
      riskLevel: this.scoreCalculator.riskLevel(riskScore)
    };
  }

  scoreWeight(ruleCode) {
    if (String(ruleCode).startsWith('MISSING')) return 30;
    if (String(ruleCode).includes('MISMATCH')) return 20;
    if (String(ruleCode).includes('DUPLICATE')) return 25;
    if (String(ruleCode).includes('SHIFT')) return 15;
    if (String(ruleCode).includes('CONFIDENCE')) return 10;
    if (String(ruleCode).includes('OVERRIDE')) return 15;
    return 10;
  }
}

export const businessExceptionEngine = new BusinessExceptionEngine();
