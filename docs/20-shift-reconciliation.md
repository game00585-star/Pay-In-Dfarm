# Shift Reconciliation

## Objective

Sprint 22 adds the Shift Reconciliation Engine for validating a complete shift workflow across 100+ branches.

Allowed local providers:

- Ollama
- PaddleOCR
- OpenCV

Not allowed:

- OpenAI
- Gemini
- Claude
- Paid APIs

Business logic is independent from AI providers. AI reads documents, but reconciliation rules use normalized business data.

## Business Workflow

One shift is one reconciliation set.

Morning and Afternoon are always separated:

- `MORNING`
- `AFTERNOON`

Every document must reference:

- `branchCode`
- `businessDate`
- `shift`

Documents in one shift:

- POS Summary
- Pay-in
- Bank transfer slip
- MaeManee
- CRM
- Debtor transfer

## Matching Rule

Documents are matched by:

```text
branchCode + businessDate + shift
```

Accounting can override document matching. Every override must create an audit log.

## Business Rule Config

```json
{
  "reconciliationMode": "TOTAL_ONLY",
  "strictPaymentTypeValidation": false,
  "totalFieldSource": "TOTAL_PAYMENT_AMOUNT"
}
```

Default mode is total validation only.

## Total Validation

Expected Total:

```text
Total amount from POS Summary
```

Actual Total:

```text
Pay-in
+ Bank Transfer
+ MaeManee
+ CRM
+ Debtor Transfer
```

Difference:

```text
Actual Total - Expected Total
```

If difference is `0`:

```text
status = PASS
```

If difference is not `0`:

```text
riskFlag = SHIFT_TOTAL_AMOUNT_MISMATCH
```

Payment type differences are supporting information. They do not fail the shift unless `strictPaymentTypeValidation` is enabled.

## Payment Detail

Displayed for Accounting:

- Cash vs Pay-in
- Bank Transfer vs Slip
- MaeManee vs MaeManee
- CRM vs CRM
- Debtor vs Debtor

These help humans review the issue, but total validation is the primary rule.

## Missing Document Assistant

If POS Summary has an amount but no supporting document:

- `MISSING_PAYIN`
- `MISSING_BANK_TRANSFER`
- `MISSING_MAEMANEE`
- `MISSING_CRM`
- `MISSING_DEBTOR_TRANSFER`

## Risk Flags

- `SHIFT_TOTAL_AMOUNT_MISMATCH`
- `BUSINESS_DATE_MISMATCH`
- `SHIFT_MISMATCH`
- `MISSING_SHIFT_REPORT`
- `MISSING_PAYIN`
- `MISSING_BANK_TRANSFER`
- `MISSING_MAEMANEE`
- `MISSING_CRM`
- `MISSING_DEBTOR_TRANSFER`
- `MANUAL_MATCH_REQUIRED`

## Accounting Workflow

Accounting Review shows:

Section 1: Total Reconciliation

- Expected Total
- Actual Total
- Difference
- Status
- Risk Score

Section 2: Payment Detail

- Cash / Pay-in / Difference
- Bank Transfer / Difference
- MaeManee / Difference
- CRM / Difference
- Debtor / Difference

Section 3: Document Viewer

- Shift documents
- AI Result
- OCR Result
- Validation
- Risk
- Lazy image preview

## Correction History

When Accounting edits AI data or matching:

- Correction History is created
- AI Learning Record is created
- Audit Log is created

## AI Learning

AI learning records can improve:

- Local prompts
- OCR cleanup
- Template detection
- Future local model tuning

## Audit

Manual matching override writes an audit action:

```text
OVERRIDE_SHIFT_RECONCILIATION_MATCH
```

Audit log must capture before and after states.

## Scalability For 100+ Branches

The design supports 100+ branches and can scale to 200+ branches.

Requirements:

- Do not load all data at once.
- Use branch/date/shift/status/risk filters.
- Use pagination for reconciliation views.
- Use lazy loading for document images.
- Design database queries around:
  - `branchCode`
  - `businessDate`
  - `shift`
  - `status`
  - `riskLevel`
- AI processing uses background queue semantics.
- AI jobs support retry.
- Batch processing is supported.
- Audit logs should be paginated.
- Business logic does not depend on a fixed branch count.

## Performance Targets

- Accounting list opens quickly.
- Daily and branch filters are first-class.
- Document viewer loads images lazily.
- System can support 100,000+ document images.
- Business modules do not require changes when branch count grows.

## Fallback

Ollama offline:

- Use mock AI provider.

PaddleOCR offline:

- Show `OCR_OFFLINE`.

Any AI failure:

- Do not break the page.
- Business reconciliation still runs on available parsed or corrected data.
