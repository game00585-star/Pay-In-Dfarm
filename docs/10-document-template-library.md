# 10 Document Template Library

## วัตถุประสงค์

Template Library ใช้เป็น catalog กลางสำหรับจำแนกประเภทเอกสารก่อนส่งเข้า OCR/AI Parser โดยกำหนดว่าเอกสารแต่ละแบบอยู่ใน category ใด มี template version อะไร ใช้ rule ใดตรวจจับ template และใช้กลยุทธ์ใดในการอ่านและตรวจสอบข้อมูล

> เอกสารนี้เป็น design ของ Template Library เท่านั้น ยังไม่รวมการเขียน OCR จริง

## Template Library Schema

| Field | Description |
| --- | --- |
| Document Category | กลุ่มเอกสารเชิงธุรกิจ เช่น Pay-in, Transfer, POS, Coupon |
| Document Template | ชื่อ template เฉพาะของเอกสาร |
| Template Version | version ของ template เพื่อรองรับ layout ที่เปลี่ยนในอนาคต |
| Template Detection Rule | เงื่อนไขในการตรวจว่าเอกสารตรงกับ template นี้ |
| OCR Strategy | แนวทางอ่านข้อมูลจากเอกสาร |
| Validation Strategy | แนวทางตรวจสอบข้อมูลหลัง OCR |

## Template Library Table

| Document Category | Document Template | Template Version | Template Detection Rule | OCR Strategy | Validation Strategy |
| --- | --- | --- | --- | --- | --- |
| Pay-in | SCB Local Collect | v1 | พบคำว่า `SCB`, `Local Collect`, เลขอ้างอิง, และยอดเงินฝาก | อ่านแบบ key-value จากตำแหน่งยอดเงิน, วันที่, reference no., account no. | ตรวจยอดกับ POS cashToDepositAmount, reference ห้ามซ้ำ, account whitelist |
| Pay-in | SCB ATM | v1 | พบคำว่า `SCB`, `ATM`, slip/receipt no., วันที่เวลา และยอดเงิน | อ่านจาก receipt layout แนวตั้ง เน้น amount, date/time, terminal id, reference | ตรวจยอดกับ POS cashToDepositAmount, terminal/ref ห้ามซ้ำ, วันที่อยู่ใน policy |
| Pay-in | SCB CDM | v1 | พบคำว่า `SCB`, `CDM` หรือ `Cash Deposit Machine`, deposit amount, account no. | อ่าน field จากฝากเงินสดผ่านเครื่อง CDM: amount, account, date/time, transaction id | ตรวจยอดกับ POS cashToDepositAmount, account whitelist, duplicate transaction id |
| Pay-in | Counter Service | v1 | พบ logo/คำว่า `Counter Service`, barcode/ref, amount, branch/store id | อ่าน barcode/ref zone และยอดชำระจาก slip counter | ตรวจยอดกับ POS cashToDepositAmount, reference ห้ามซ้ำ, วันที่ตรง policy |
| Pay-in | Lotus | v1 | พบคำว่า `Lotus`, `Lotus's`, counter payment, barcode/ref, amount | อ่านยอดชำระ, reference, store/terminal, date/time | ตรวจยอดกับ POS cashToDepositAmount, reference ห้ามซ้ำ, outlet/terminal valid |
| Transfer | Mobile Banking | v1 | พบคำว่า transfer/slip, bank name, from/to account, amount, reference | อ่านจาก mobile slip ด้วย key-value และ label-based extraction | ตรวจยอดกับ POS transferAmount หรือยอดที่ระบบกำหนด, receiver account whitelist, reference ห้ามซ้ำ |
| QR Payment | SCB QR Alert | v1 | พบคำว่า `QR`, `Alert`, `Mae Manee`, `แม่มณี`, merchant id หรือ notification pattern | อ่านยอด QR, merchant id, transaction id, date/time จาก alert layout | ตรวจยอดรวมกับ POS maemaneeAmount, merchant mapping ตรงสาขา, transaction id ห้ามซ้ำ |
| Coupon | CRM | v1 | พบคำว่า `CRM`, coupon no., campaign, approval code หรือ customer id | อ่าน coupon no., coupon amount, campaign code, approval code | ตรวจยอดรวมกับ POS couponAmount, coupon no. ห้ามซ้ำ, campaign valid |
| Sales Summary | POS Summary | v1 | พบ `TAX ID`, `Till`, `REG ID`, รายการขาย, รายการชำระ, ยอดต้องนำส่ง | อ่านแบบ section-based: header, sales section, payment section, cash deposit section | ตรวจ saleDate กับ payin.date, totalPaidAmount ใกล้ netAmount, cash/transfer/coupon reconcile |
| Debtor | Debtor Receipt | v1 | พบคำว่า debtor, customer, ลูกหนี้, account receivable, debtor code หรือ receipt no. | อ่าน debtor code/name, amount, reference, receiver account, date/time | ตรวจยอดรวมกับ POS debtorTransferAmount, debtor code valid, reference ห้ามซ้ำ |
| Unknown | Unknown Template | v0 | ไม่เข้า rule ใด หรือ confidence การ detect ต่ำกว่า threshold | ใช้ generic OCR อ่าน raw text และ candidate fields โดยไม่ผูก layout | ส่งเข้า manual review, เพิ่ม UNKNOWN_TEMPLATE flag, ห้าม auto approve |

## Template Detection Priority

ควรตรวจ template ตามลำดับความจำเพาะสูงไปต่ำ:

1. POS Summary
2. SCB QR Alert
3. CRM
4. Debtor Receipt
5. SCB Local Collect
6. SCB CDM
7. SCB ATM
8. Counter Service
9. Lotus
10. Mobile Banking
11. Unknown Template

เหตุผล: POS Summary, QR Alert, CRM และ Debtor Receipt มีโครงสร้าง/คำเฉพาะสูงกว่า slip โอนหรือ Pay-in ทั่วไป จึงควร detect ก่อนเพื่อลด false positive

## Detection Rule Design

### Text Signal

ใช้ keyword ที่ OCR อ่านได้ เช่น:

- bank name
- service name
- merchant name
- document title
- tax id
- reference label
- account label

### Visual/Layout Signal

ใช้ตำแหน่งและ layout เช่น:

- receipt แนวตั้ง
- mobile slip card layout
- POS Summary ที่มีหลาย section
- QR alert notification layout
- barcode area

### Numeric Pattern Signal

ใช้ pattern ของตัวเลข เช่น:

- tax id 13 หลัก
- account no. masked/unmasked
- reference no.
- amount format
- date/time format
- terminal/till id

## OCR Strategy Types

| OCR Strategy | ใช้กับ | Description |
| --- | --- | --- |
| Key-value extraction | Pay-in, Mobile Banking, Debtor Receipt | อ่านจาก label และ value ใกล้เคียง |
| Section-based extraction | POS Summary | แยก section ก่อนอ่าน field |
| Barcode/reference zone extraction | Counter Service, Lotus | โฟกัสบริเวณ barcode/ref และยอดเงิน |
| Notification extraction | SCB QR Alert | อ่านจากรูปแบบ alert/notification |
| Generic OCR fallback | Unknown Template | อ่าน raw text และ candidate fields |

## Validation Strategy Types

| Validation Strategy | Description |
| --- | --- |
| Amount reconciliation | เทียบยอดกับ POS Summary หรือยอดรวมของเอกสารประเภทเดียวกัน |
| Date policy validation | ตรวจวันที่ตรง saleDate หรืออยู่ใน policy |
| Duplicate validation | ตรวจ reference no., transaction id, coupon no., imageHash |
| Account whitelist validation | ตรวจบัญชีรับเงินว่าถูกต้อง |
| Branch/merchant mapping | ตรวจ branchCode, merchantId, terminalId กับ master data |
| Confidence validation | ถ้า parser confidence ต่ำกว่า threshold ให้ flag/manual review |
| Template confidence validation | ถ้า detect template ไม่มั่นใจ ให้เข้า Unknown Template |

## Template Output Contract

หลัง detect template ควรได้ output ขั้นต้น:

```json
{
  "documentCategory": "Pay-in",
  "documentTemplate": "SCB Local Collect",
  "templateVersion": "v1",
  "templateConfidence": 0.92,
  "detectionSignals": [
    "keyword:SCB",
    "keyword:Local Collect",
    "pattern:referenceNo",
    "pattern:amount"
  ],
  "ocrStrategy": "key-value extraction",
  "validationStrategy": [
    "amount reconciliation",
    "duplicate validation",
    "account whitelist validation"
  ]
}
```

## Unknown Template Policy

Unknown Template ใช้เมื่อ:

- OCR อ่าน text ได้น้อย
- ไม่พบ keyword ที่ชัดเจน
- templateConfidence ต่ำกว่า threshold
- เอกสารมี layout ใหม่
- เอกสารถูก crop/blur/เอียงจน detect ไม่ได้

ระบบควรทำดังนี้:

- เก็บ raw OCR text
- เก็บ candidate fields ที่อ่านได้
- เพิ่ม risk flag เช่น `UNKNOWN_TEMPLATE`
- ส่งเข้า manual review
- ไม่ auto approve
- ให้ Admin/Audit ใช้ตัวอย่างนี้สร้าง template version ใหม่ในอนาคต

## Versioning Policy

Template Version ควรเพิ่มเมื่อ:

- layout เอกสารเปลี่ยน
- label เปลี่ยน
- bank/service provider เปลี่ยน format
- OCR strategy ต้องเปลี่ยน
- validation rule เฉพาะ template เปลี่ยน

ตัวอย่าง:

| Template | Version | Change |
| --- | --- | --- |
| SCB Local Collect | v1 | Initial template |
| SCB Local Collect | v2 | เพิ่มตำแหน่ง QR/reference ใหม่ |
| POS Summary | v2 | POS vendor เปลี่ยน layout section |

## Future Template Registry Structure

เมื่อพัฒนาเป็นโค้ดจริง สามารถเก็บ registry เป็น config:

```ts
type DocumentTemplateConfig = {
  documentCategory: string;
  documentTemplate: string;
  templateVersion: string;
  detectionRules: DetectionRule[];
  ocrStrategy: string;
  validationStrategy: string[];
  requiredFields: string[];
  optionalFields: string[];
};
```

## Open Questions

- SCB Local Collect, ATM และ CDM จะมีหลาย layout ตามปีหรือไม่
- Counter Service และ Lotus ใช้ barcode format เดียวกันหรือไม่
- Mobile Banking รองรับทุกธนาคารหรือเริ่มเฉพาะ SCB/KBank/Bangkok Bank
- QR Alert แม่มณีเป็น screenshot notification หรือรายงานจากแอป
- CRM มี report export หรือใช้รูป coupon อย่างเดียว
- Debtor Receipt มาจากระบบใด และมี debtor master หรือไม่

