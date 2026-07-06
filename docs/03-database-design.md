# 03 Database Design

## Database

ใช้ Firestore เป็น primary database

## Collections

- `payins`
- `auditLogs`
- `branches`
- `users`

## Collection: payins

เก็บรายการ Pay-in ต่อ 1 วัน/สาขา/กะ

### Document ID

ใช้ `id` รูปแบบตัวอย่าง:

`PAY-YYYYMMDD-xxxxxx`

### Fields

| Field | Type | Description |
| --- | --- | --- |
| id | string | Pay-in record id |
| date | string | วันที่รายการ รูปแบบ `YYYY-MM-DD` |
| branch | string | ชื่อสาขา |
| shift | string | กะ เช่น Morning, Afternoon, Evening |
| expectedAmount | number | ยอดที่คาดหวัง |
| branchAmount | number | ยอด Pay-in ที่สาขากรอก |
| transferSlipAmount | number | ยอดรวมสลิปโอนที่สาขากรอก |
| aiAmount | number | ยอด Pay-in ที่ AI อ่านได้ |
| difference | number | branchAmount - aiAmount |
| referenceNo | string | เลขอ้างอิง Pay-in |
| bankName | string | ธนาคาร |
| status | string | สถานะ record |
| riskScore | number | คะแนนความเสี่ยง 0-100 |
| riskFlags | array<string> | รายการ flags |
| aiStatus | string | สถานะ AI เช่น READ |
| aiConfidence | number | confidence ต่ำสุดของเอกสาร |
| createdBy | string | email ผู้สร้าง |
| createdAt | string/timestamp | วันเวลาสร้าง |
| reviewedBy | string | email ผู้ตรวจ |
| reviewedAt | string/timestamp | วันเวลาตรวจ |
| accountingComment | string | comment จาก Accounting |

### Document URLs

```json
{
  "documentUrls": {
    "POS_SUMMARY": "https://...",
    "PAYIN_SLIP": "https://...",
    "TRANSFER_SLIP": "https://..."
  }
}
```

Backward compatibility fields:

| Field | Type | Description |
| --- | --- | --- |
| posSummaryImageUrl | string | URL รูป POS Summary |
| payinImageUrl | string | URL ใบ Pay-in |
| slipImageUrl | string | URL สลิปโอน |

### Image Hashes

```json
{
  "imageHashes": {
    "POS_SUMMARY": "sha256",
    "PAYIN_SLIP": "sha256",
    "TRANSFER_SLIP": "sha256"
  }
}
```

Backward compatibility field:

| Field | Type | Description |
| --- | --- | --- |
| imageHash | string | hash ของ Pay-in slip |

### AI Documents

```json
{
  "aiDocuments": {
    "POS_SUMMARY": {
      "documentType": "POS_SUMMARY",
      "confidence": 91,
      "extractedAt": "2026-07-05T00:00:00.000Z",
      "fields": {}
    },
    "PAYIN_SLIP": {
      "documentType": "PAYIN_SLIP",
      "confidence": 88,
      "extractedAt": "2026-07-05T00:00:00.000Z",
      "fields": {}
    },
    "TRANSFER_SLIP": {
      "documentType": "TRANSFER_SLIP",
      "confidence": 87,
      "extractedAt": "2026-07-05T00:00:00.000Z",
      "fields": {}
    }
  }
}
```

### Comparisons

```json
{
  "comparisons": {
    "posCashPayin": {
      "label": "POS cash to deposit vs Pay-in",
      "left": 335.75,
      "right": 335.75,
      "status": "match"
    },
    "posTransferSlip": {
      "left": 24895,
      "right": 24895,
      "status": "match"
    },
    "posTotal": {
      "left": 53265.75,
      "right": 53265.70,
      "status": "near"
    },
    "saleDate": {
      "left": "2026-07-05",
      "right": "2026-07-05",
      "status": "match"
    }
  }
}
```

### Timeline

```json
{
  "timeline": {
    "createdAt": "2026-07-05T00:00:00.000Z",
    "posSummaryUploadedAt": "2026-07-05T00:00:00.000Z",
    "payinUploadedAt": "2026-07-05T00:00:00.000Z",
    "transferSlipUploadedAt": "2026-07-05T00:00:00.000Z",
    "aiCheckedAt": "2026-07-05T00:00:00.000Z",
    "submittedToAccountingAt": "2026-07-05T00:00:00.000Z",
    "reviewedAt": ""
  }
}
```

## Collection: auditLogs

เก็บประวัติการเปลี่ยนแปลง

| Field | Type | Description |
| --- | --- | --- |
| id | string | log id |
| action | string | action name |
| recordId | string | payin id หรือ entity id |
| actor | string | email ผู้ทำรายการ |
| actorRole | string | role |
| before | object/null | ข้อมูลก่อนแก้ |
| after | object/null | ข้อมูลหลังแก้ |
| createdAt | string/timestamp | วันเวลาบันทึก log |

## Collection: branches

| Field | Type | Description |
| --- | --- | --- |
| id | string | branch id |
| code | string | branch code |
| name | string | branch name |
| area | string | area/region |
| active | boolean | เปิดใช้งานหรือไม่ |

## Collection: users

| Field | Type | Description |
| --- | --- | --- |
| id | string | user id หรือ Firebase uid |
| name | string | ชื่อผู้ใช้ |
| email | string | email |
| role | string | Admin, Branch, Accounting, Audit |
| branch | string | สาขาของผู้ใช้ |
| active | boolean | เปิดใช้งานหรือไม่ |

## Status Values

- DRAFT
- AI_CHECKING
- NEED_RETAKE
- PENDING_ACCOUNTING
- APPROVED
- RETURNED
- HIGH_RISK
- CLOSED

## Index Recommendations

ควรเพิ่ม composite indexes ใน Firestore เมื่อเริ่มใช้งานจริง:

- `payins.branch + payins.createdAt desc`
- `payins.status + payins.createdAt desc`
- `payins.date + payins.branch`
- `auditLogs.recordId + auditLogs.createdAt desc`

