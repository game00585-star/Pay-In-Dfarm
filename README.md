# D-FARM Pay-in AI V1

เว็บ React สำหรับให้สาขาส่ง Pay-in, แนบรูป POS Summary/ใบ Pay-in/สลิปโอน, ตรวจ mock AI OCR, ให้บัญชีอนุมัติหรือส่งกลับ, และให้ Audit ดูรายงานพร้อม export Excel

## Tech stack

- React + Vite
- Firebase Auth
- Firestore
- Firebase Storage
- XLSX export

## Run

```bash
pnpm install
pnpm dev
```

ในเครื่อง Codex นี้สามารถรัน Vite โดยตรงได้ที่ `http://127.0.0.1:5173`

## Firebase setup

1. คัดลอก `.env.example` เป็น `.env`
2. ใส่ค่า Firebase web app config
3. เปิด Firebase Auth แบบ Email/Password
4. สร้าง Firestore collections:
   - `payins`
   - `auditLogs`
   - `branches`
   - `users`
5. Deploy rules:

```bash
firebase deploy --only firestore:rules,storage
```

ผู้ใช้ Firebase Auth ควรมี profile ใน `users/{uid}` พร้อม field:

```json
{
  "name": "Branch User",
  "email": "branch@example.com",
  "role": "Branch",
  "branch": "D-FARM Bangkok 01",
  "active": true
}
```

## Demo mode

ถ้ายังไม่ใส่ค่า `.env` แอปจะเข้า demo mode และเก็บข้อมูลใน browser localStorage เพื่อให้ทดสอบ flow ได้ทันที

Demo roles:

- Admin
- Branch
- Accounting
- Audit

## V1 behavior

- Branch เห็นเฉพาะสาขาตัวเอง
- Accounting และ Audit เห็นทุกสาขา
- ทุกการสร้าง/แก้ไขสร้าง audit log
- ไม่มีปุ่มลบ record
- รูปภาพเก็บใน Firebase Storage เมื่อเชื่อม Firebase แล้ว
- รองรับ Document Type: `POS_SUMMARY`, `PAYIN_SLIP`, `TRANSFER_SLIP`
- mock AI อ่าน POS Summary fields, Pay-in amount/reference/date และ transfer slip total
- ตรวจ duplicate `referenceNo` และ `imageHash`
- คำนวณ risk score ตาม rule ที่กำหนด
- Accounting Review แสดง 3 ฝั่ง: POS Summary, Branch Input, AI OCR Result
- แสดงผลต่างเป็นสี: เขียวตรง, เหลืองต่างไม่เกิน 1 บาท, แดงต่างเกิน 1 บาท
- Audit export Excel ได้ 2 sheet: `Payins` และ `AuditLogs`

## POS Summary mock fields

`mockAIExtractDocument(image, documentType, context)` เป็นจุดเปลี่ยนไปต่อ AI จริงในอนาคต โดยตอนนี้คืนค่าจำลองสำหรับ:

- `branchCode`
- `branchName`
- `saleDate`
- `closeTime`
- `till`
- `taxId`
- `registerNo`
- `billCount`
- `grossAmount`
- `discountAmount`
- `netAmount`
- `cashAmount`
- `debtorTransferAmount`
- `transferAmount`
- `maemaneeAmount`
- `couponAmount`
- `totalPaidAmount`
- `cashToDepositAmount`
- `cashierCode`

## Risk flags

- `POS_SUMMARY_MISSING`
- `PAYIN_IMAGE_MISSING`
- `TRANSFER_SLIP_MISSING`
- `POS_CASH_PAYIN_MISMATCH`
- `POS_TRANSFER_SLIP_MISMATCH`
- `POS_TOTAL_MISMATCH`
- `DATE_MISMATCH`
- `LOW_AI_CONFIDENCE`
- `DUPLICATE_REFERENCE`
- `DUPLICATE_IMAGE`
