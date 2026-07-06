export class DepositBatchCalculator {
  calculateExpectedCash(includedShifts = []) {
    return Number(includedShifts.reduce((sum, shift) => sum + Number(shift.cashAmount || 0), 0).toFixed(2));
  }

  calculateActualPayIn(payInDocuments = []) {
    return Number(payInDocuments.reduce((sum, document) => sum + Number(document.depositAmount || document.parsedData?.depositAmount || document.parsedData?.payinCashAmount || 0), 0).toFixed(2));
  }

  calculateDifference(actualPayInAmount, expectedCashAmount) {
    return Number((Number(actualPayInAmount || 0) - Number(expectedCashAmount || 0)).toFixed(2));
  }
}

export const depositBatchCalculator = new DepositBatchCalculator();
