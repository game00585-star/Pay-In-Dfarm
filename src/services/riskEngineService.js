import { DOCUMENT_TYPES } from '../domain/constants/documentTypes.js';
import { PAYMENT_TYPES } from '../domain/constants/paymentTypes.js';
import { RISK_FLAGS, RISK_WEIGHTS } from '../domain/constants/riskFlags.js';
import { RiskEngine } from '../domain/interfaces/riskEngine.js';

function amountDiff(left, right) {
  return Math.abs(Number(left || 0) - Number(right || 0));
}

function addFlag(flags, flag) {
  if (!flags.includes(flag)) flags.push(flag);
}

export class RiskEngineService extends RiskEngine {
  evaluate({ record, existingRecords = [] }) {
    const flags = [];
    const pos = record.aiDocuments?.[DOCUMENT_TYPES.POS_SUMMARY]?.fields || {};

    if (!record.documentUrls?.[DOCUMENT_TYPES.POS_SUMMARY]) {
      addFlag(flags, RISK_FLAGS.POS_SUMMARY_MISSING);
    }

    this.evaluateRequiredDocuments({ flags, pos, documentUrls: record.documentUrls || {} });
    this.evaluateReconciliation({ flags, pos, record });
    this.evaluateDuplicates({ flags, record, existingRecords });

    const confidenceValues = Object.values(record.aiDocuments || {}).map((document) => Number(document.confidence || 0));
    if (confidenceValues.some((confidence) => confidence < 80)) {
      addFlag(flags, RISK_FLAGS.LOW_AI_CONFIDENCE);
    }

    const riskScore = Math.min(
      flags.reduce((sum, flag) => sum + (RISK_WEIGHTS[flag] || 10), 0),
      100
    );

    return { riskScore, riskFlags: flags };
  }

  evaluateRequiredDocuments({ flags, pos, documentUrls }) {
    const requirements = [
      { amount: pos.cashToDepositAmount, documentType: DOCUMENT_TYPES.PAYIN, paymentType: PAYMENT_TYPES.CASH },
      { amount: pos.transferAmount, documentType: DOCUMENT_TYPES.MOBILE_BANKING_SLIP, paymentType: PAYMENT_TYPES.TRANSFER },
      { amount: pos.maemaneeAmount, documentType: DOCUMENT_TYPES.QR_ALERT_MAEMANEE, paymentType: PAYMENT_TYPES.MAEMANEE },
      { amount: pos.couponAmount, documentType: DOCUMENT_TYPES.CRM_COUPON, paymentType: PAYMENT_TYPES.CRM_COUPON },
      { amount: pos.debtorTransferAmount, documentType: DOCUMENT_TYPES.DEBTOR_TRANSFER, paymentType: PAYMENT_TYPES.DEBTOR_TRANSFER }
    ];

    for (const requirement of requirements) {
      if (Number(requirement.amount || 0) > 0 && !documentUrls[requirement.documentType]) {
        addFlag(flags, RISK_FLAGS.MISSING_REQUIRED_DOCUMENT);
      }
    }
  }

  evaluateReconciliation({ flags, pos, record }) {
    const payin = record.aiDocuments?.[DOCUMENT_TYPES.PAYIN]?.fields || record.aiDocuments?.[DOCUMENT_TYPES.PAYIN_SLIP]?.fields || {};
    if (amountDiff(pos.cashToDepositAmount, payin.payinAmount) > 1) {
      addFlag(flags, RISK_FLAGS.POS_CASH_PAYIN_MISMATCH);
    }
    if (amountDiff(pos.totalPaidAmount, pos.netAmount) > 1) {
      addFlag(flags, RISK_FLAGS.POS_TOTAL_MISMATCH);
    }
  }

  evaluateDuplicates({ flags, record, existingRecords }) {
    const hashes = Object.values(record.imageHashes || {}).filter(Boolean);
    const hasDuplicateImage = existingRecords.some((existing) => {
      if (existing.id === record.id) return false;
      const existingHashes = Object.values(existing.imageHashes || {}).filter(Boolean);
      return hashes.some((hash) => existingHashes.includes(hash));
    });
    if (hasDuplicateImage) addFlag(flags, RISK_FLAGS.DUPLICATE_IMAGE);

    const hasDuplicateReference = existingRecords.some((existing) => {
      return existing.id !== record.id && existing.referenceNo && existing.referenceNo === record.referenceNo;
    });
    if (hasDuplicateReference) addFlag(flags, RISK_FLAGS.DUPLICATE_REFERENCE);
  }
}

