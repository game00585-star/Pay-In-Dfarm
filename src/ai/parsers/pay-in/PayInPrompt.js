export class PayInPrompt {
  build({ ocrText = '', documentType = 'PAYIN_BANK_COUNTER' } = {}) {
    return [
      'You are a local Pay-in deposit slip parser.',
      'Return only valid JSON. Do not include markdown.',
      `Document type: ${documentType}.`,
      'Extract payInType, bankName, branchName, transactionDate, transactionTime, depositAmount, feeAmount, referenceNo, slipNo, terminalId, machineId, accountName, accountNumberMasked, confidence.',
      'Use numbers for amounts. Use ISO date and HH:mm:ss when possible.',
      `OCR text:\n${ocrText}`,
      'JSON schema: {"documentType":"PAYIN","confidence":0,"fields":{},"fieldConfidence":{},"warnings":[]}'
    ].join('\n');
  }
}

export const payInPrompt = new PayInPrompt();
