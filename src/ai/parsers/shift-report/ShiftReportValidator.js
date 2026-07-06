export class ShiftReportValidator {
  validate(parsedData = {}) {
    const paymentTotal = Number((
      Number(parsedData.cashAmount || 0)
      + Number(parsedData.debtorTransferAmount || 0)
      + Number(parsedData.bankTransferAmount || 0)
      + Number(parsedData.maemaneeAmount || 0)
      + Number(parsedData.crmCouponAmount || 0)
    ).toFixed(2));
    const expected = Number(Number(parsedData.totalPaymentAmount || 0).toFixed(2));
    const difference = Number((paymentTotal - expected).toFixed(2));
    const flags = [];
    if (Math.abs(difference) > 1) flags.push('PAYMENT_TOTAL_MISMATCH');
    return {
      valid: flags.length === 0,
      flags,
      paymentTotal,
      expectedTotal: expected,
      difference,
      status: flags.length ? 'FAIL' : 'PASS'
    };
  }
}

export const shiftReportValidator = new ShiftReportValidator();
