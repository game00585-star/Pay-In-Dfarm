import { DOCUMENT_TEMPLATES, DOCUMENT_TYPES } from '../domain/constants/documentTypes.js';
import { PARSER_STATUS } from '../domain/constants/statuses.js';
import { OcrProvider } from '../domain/interfaces/ocrProvider.js';

function confidenceFromHash(hash, base = 92) {
  const seed = parseInt((hash || '13').slice(0, 4), 16) || 13;
  return Math.max(65, base - (seed % 20));
}

export class MockOcrProvider extends OcrProvider {
  async detectTemplate({ documentType }) {
    const templateByType = {
      [DOCUMENT_TYPES.POS_SUMMARY]: DOCUMENT_TEMPLATES.POS_SUMMARY,
      [DOCUMENT_TYPES.PAYIN]: DOCUMENT_TEMPLATES.SCB_LOCAL_COLLECT,
      [DOCUMENT_TYPES.PAYIN_SLIP]: DOCUMENT_TEMPLATES.SCB_LOCAL_COLLECT,
      [DOCUMENT_TYPES.MOBILE_BANKING_SLIP]: DOCUMENT_TEMPLATES.MOBILE_BANKING,
      [DOCUMENT_TYPES.TRANSFER_SLIP]: DOCUMENT_TEMPLATES.MOBILE_BANKING,
      [DOCUMENT_TYPES.QR_ALERT_MAEMANEE]: DOCUMENT_TEMPLATES.SCB_QR_ALERT,
      [DOCUMENT_TYPES.CRM_COUPON]: DOCUMENT_TEMPLATES.CRM,
      [DOCUMENT_TYPES.DEBTOR_TRANSFER]: DOCUMENT_TEMPLATES.DEBTOR_RECEIPT
    };

    return {
      documentTemplate: templateByType[documentType] || DOCUMENT_TEMPLATES.UNKNOWN_TEMPLATE,
      templateVersion: documentType === DOCUMENT_TYPES.UNKNOWN ? 'v0' : 'v1',
      templateConfidence: documentType === DOCUMENT_TYPES.UNKNOWN ? 0.2 : 0.9,
      detectionSignals: ['mock-provider']
    };
  }

  async extractDocument({ image = {}, documentType, context = {} }) {
    const template = await this.detectTemplate({ documentType, image, context });
    const confidence = confidenceFromHash(image.imageHash || image.hash);
    const common = {
      documentType,
      ...template,
      confidence,
      parserStatus: confidence >= 70 ? PARSER_STATUS.READ : PARSER_STATUS.NEED_REVIEW,
      extractedAt: new Date().toISOString()
    };

    if (documentType === DOCUMENT_TYPES.POS_SUMMARY) {
      return {
        ...common,
        fields: {
          branchCode: context.branchCode || '00074',
          branchName: context.branch || 'D-FARM Bangkok 01',
          saleDate: context.date || '',
          netAmount: Number(context.netAmount || 0),
          transferAmount: Number(context.transferAmount || 0),
          maemaneeAmount: Number(context.maemaneeAmount || 0),
          couponAmount: Number(context.couponAmount || 0),
          debtorTransferAmount: Number(context.debtorTransferAmount || 0),
          totalPaidAmount: Number(context.totalPaidAmount || 0),
          cashToDepositAmount: Number(context.cashToDepositAmount || context.branchAmount || 0)
        }
      };
    }

    if (documentType === DOCUMENT_TYPES.PAYIN || documentType === DOCUMENT_TYPES.PAYIN_SLIP) {
      return {
        ...common,
        fields: {
          payinAmount: Number(context.branchAmount || 0),
          referenceNo: context.referenceNo || `PY${Date.now().toString().slice(-8)}`,
          bankName: context.bankName || '',
          payinDate: context.date || ''
        }
      };
    }

    return {
      ...common,
      fields: {
        amount: Number(context.amount || context.transferSlipAmount || 0),
        referenceNo: context.referenceNo || `DOC${Date.now().toString().slice(-8)}`,
        date: context.date || ''
      }
    };
  }
}

