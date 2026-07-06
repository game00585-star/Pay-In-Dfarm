import { BusinessMatchingEngine } from './BusinessMatchingEngine.js';
import { ShiftReconciliationValidator } from './ShiftReconciliationValidator.js';

const DEFAULT_CONFIG = Object.freeze({
  reconciliationMode: 'TOTAL_ONLY',
  strictPaymentTypeValidation: false,
  totalFieldSource: 'TOTAL_PAYMENT_AMOUNT'
});

function amount(value) {
  return Number(Number(value || 0).toFixed(2));
}

function sumDocuments(documents = [], fields = []) {
  return amount(documents.reduce((sum, document) => {
    const value = fields.map((field) => document.parsedData?.[field]).find((item) => item !== undefined && item !== null && item !== '');
    return sum + Number(value || 0);
  }, 0));
}

function posExpectedTotal(pos = {}, config = DEFAULT_CONFIG) {
  if (config.totalFieldSource === 'NET_AMOUNT') return amount(pos.netAmount);
  return amount(pos.totalPaymentAmount || pos.totalPaidAmount || pos.netAmount);
}

function detail(key, label, expectedAmount, actualAmount, documents) {
  const difference = amount(actualAmount - expectedAmount);
  return {
    key,
    label,
    expectedAmount: amount(expectedAmount),
    actualAmount: amount(actualAmount),
    difference,
    status: difference === 0 ? 'PASS' : Math.abs(difference) <= 1 ? 'WARN' : 'INFO',
    documentIds: documents.map((document) => document.id)
  };
}

export class ShiftReconciliationBuilder {
  constructor({
    config = DEFAULT_CONFIG,
    matchingEngine = new BusinessMatchingEngine(),
    validator = new ShiftReconciliationValidator({ config })
  } = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.matchingEngine = matchingEngine;
    this.validator = validator;
  }

  build(record) {
    const grouped = this.matchingEngine.groupDocuments(record);
    const pos = grouped.shiftReport?.parsedData || {};
    const paymentDetails = [
      detail('CASH', 'Cash / Pay-in', amount(pos.cashAmount || pos.cashToDepositAmount), sumDocuments(grouped.payInDocuments, ['depositAmount', 'payinCashAmount']), grouped.payInDocuments),
      detail('BANK_TRANSFER', 'Bank Transfer', amount(pos.bankTransferAmount || pos.transferAmount), sumDocuments(grouped.bankTransferDocuments, ['transferAmount', 'bankTransferAmount']), grouped.bankTransferDocuments),
      detail('MAEMANEE', 'MaeManee', amount(pos.maemaneeAmount || pos.maemaneeTransferAmount), sumDocuments(grouped.maemaneeDocuments, ['maemaneeAmount', 'maemaneeTransferAmount']), grouped.maemaneeDocuments),
      detail('CRM', 'CRM', amount(pos.crmCouponAmount || pos.couponAmount), sumDocuments(grouped.crmDocuments, ['crmCouponAmount', 'couponAmount']), grouped.crmDocuments),
      detail('DEBTOR_TRANSFER', 'Debtor Transfer', amount(pos.debtorTransferAmount || pos.debtorAccountTransferAmount), sumDocuments(grouped.debtorTransferDocuments, ['debtorTransferAmount', 'debtorAccountTransferAmount']), grouped.debtorTransferDocuments)
    ];
    const expectedTotal = posExpectedTotal(pos, this.config);
    const actualTotal = amount(paymentDetails.reduce((sum, item) => sum + item.actualAmount, 0));
    const difference = amount(actualTotal - expectedTotal);
    const now = new Date().toISOString();
    const reconciliation = {
      reconciliationId: `REC-${grouped.branchCode || record.branch}-${grouped.businessDate}-${grouped.shift}`.replace(/\s+/g, '-'),
      branchCode: grouped.branchCode,
      branchName: record.branch,
      businessDate: grouped.businessDate,
      shift: grouped.shift,
      shiftReportId: grouped.shiftReport?.id || '',
      payInDocuments: grouped.payInDocuments,
      bankTransferDocuments: grouped.bankTransferDocuments,
      maemaneeDocuments: grouped.maemaneeDocuments,
      crmDocuments: grouped.crmDocuments,
      debtorTransferDocuments: grouped.debtorTransferDocuments,
      expectedTotal,
      actualTotal,
      difference,
      status: 'PENDING',
      riskScore: 0,
      riskFlags: [],
      paymentDetails,
      businessRuleConfig: this.config,
      createdAt: record.createdAt || now,
      updatedAt: now
    };
    const validation = this.validator.validate(reconciliation);
    return {
      ...reconciliation,
      status: validation.status,
      riskScore: validation.riskScore,
      riskFlags: validation.riskFlags,
      validationResult: validation
    };
  }
}

export const shiftReconciliationBuilder = new ShiftReconciliationBuilder();
