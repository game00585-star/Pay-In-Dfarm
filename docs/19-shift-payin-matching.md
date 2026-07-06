# Shift Pay-in Matching

## Objective

Sprint 21 changes Pay-in validation to be shift-based.

The system must always validate Pay-in by shift, not by combined deposit timing.

## Business Rule

- 1 POS Summary document equals 1 shift.
- 1 Pay-in document belongs to 1 shift.
- Morning shift validates only against morning Pay-in.
- Afternoon shift validates only against afternoon Pay-in.
- Even if the previous afternoon shift and next morning shift are deposited together, the system still validates each shift separately.

Important:

```text
Deposit timing can be combined.
Shift documents and shift cash totals must stay separated.
```

## Shift Types

- `MORNING`
- `AFTERNOON`

## Branch Shift Policy

Shift time validation must use `BranchShiftPolicy`.

The system must not hardcode branch closing time because each branch can close at a different time, for example:

- Afternoon closes at `21:00`
- Afternoon closes at `22:00`

## Example

Previous day afternoon:

```text
05/07 AFTERNOON Cash 8,000
```

Next day morning:

```text
06/07 MORNING Cash 12,000
```

The branch may deposit 20,000 at the same time, but validation must create two shift matches:

```text
05/07 AFTERNOON expected 8,000 vs Pay-in assigned to afternoon
06/07 MORNING expected 12,000 vs Pay-in assigned to morning
```

The combined deposit is an operational event. It must not merge shift-level validation.

## Entity

`ShiftPayinMatch`

```json
{
  "matchId": "",
  "branchCode": "",
  "businessDate": "",
  "shift": "",
  "shiftReportId": "",
  "payInDocumentIds": [],
  "expectedCashAmount": 0,
  "actualPayInAmount": 0,
  "difference": 0,
  "status": "",
  "riskFlags": [],
  "createdAt": "",
  "updatedAt": ""
}
```

## Validation Rules

| Rule | Risk Flag |
|---|---|
| Expected cash equals `cashAmount` from the shift POS Summary | - |
| Actual Pay-in equals the sum of Pay-in documents matched to that shift | - |
| Difference equals `actualPayInAmount - expectedCashAmount` | - |
| Difference is not zero | `SHIFT_PAYIN_AMOUNT_MISMATCH` |
| No Pay-in matched to the shift | `MISSING_SHIFT_PAYIN` |
| More than one Pay-in in the shift | Sum before comparing |
| Pay-in date does not relate to the shift | `PAYIN_DATE_MISMATCH` |
| Duplicate reference | `DUPLICATE_REFERENCE` |
| Shift close time outside policy | `SHIFT_TIME_OUT_OF_POLICY` |
| Cannot auto-match reliably | `MANUAL_MATCH_REQUIRED` |

## Manual Match

Accounting can manually select the Pay-in document that belongs to the current shift.

When manual match is saved:

- The Pay-in document stores `matchedBusinessDate`
- The Pay-in document stores `matchedShift`
- The shift match is recalculated
- Audit log is created

## Audit Log

Every manual match update must be saved with an audit action such as:

```text
MANUAL_SHIFT_PAYIN_MATCH
```

Audit log records:

- Actor
- Role
- Before state
- After state
- Timestamp

## Correction History

When Accounting edits an AI-read field, the system records correction history:

- `recordId`
- `documentId`
- `documentType`
- `field`
- `ocrText`
- `aiResult`
- `humanCorrection`
- `confidence`
- `changedAt`

## AI Learning

Every field correction creates an AI learning record automatically.

These records can later improve:

- Pay-in parser prompts
- Local OCR post-processing
- Template matching rules
- Local AI training datasets

## Dashboard

Dashboard includes:

- Shift Pay-in PASS
- Shift Pay-in WARN
- Shift Pay-in FAIL
- Missing Pay-in
- Difference Total

## Key Constraint

Do not combine morning and afternoon cash into one Pay-in validation amount.

The Deposit Batch view can show operational deposit grouping, but Pay-in correctness must always be checked through `ShiftPayinMatch`.
