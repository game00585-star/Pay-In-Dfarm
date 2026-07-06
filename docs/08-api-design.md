# 08 API Design

## Overview

ปัจจุบัน V1 เป็น frontend ที่เรียก Firebase SDK โดยตรง ยังไม่มี backend API server แยก เอกสารนี้ออกแบบ API contract สำหรับเฟสถัดไป เพื่อให้ย้าย logic จาก frontend ไป backend/cloud functions ได้ง่าย

## API Style

แนะนำ REST API หรือ Firebase Callable Functions

Base path ตัวอย่าง:

```text
/api/v1
```

## Authentication

ทุก endpoint ต้องใช้ Firebase ID Token

Header:

```http
Authorization: Bearer <firebase_id_token>
```

Backend ต้อง resolve user profile จาก `users/{uid}` เพื่อรู้:

- role
- branch
- active

## Authorization Matrix

| API | Admin | Branch | Accounting | Audit |
| --- | --- | --- | --- | --- |
| Create Pay-in | Yes | Yes, own branch | No | No |
| List Pay-ins | All | Own branch | All | All |
| Review Pay-in | Yes | No | Yes | No |
| Export Report | Yes | No | Yes | Yes |
| Manage Branches | Yes | No | No | No |
| Manage Users | Yes | No | No | No |
| Read Audit Logs | Yes | No | Yes | Yes |

## Pay-in APIs

### Create Pay-in

```http
POST /api/v1/payins
```

Request:

```json
{
  "date": "2026-07-05",
  "branch": "D-FARM Bangkok 01",
  "shift": "Morning",
  "expectedAmount": 53265.75,
  "branchAmount": 335.75,
  "transferSlipAmount": 24895,
  "referenceNo": "PY123456",
  "bankName": "Kasikorn Bank"
}
```

Response:

```json
{
  "id": "PAY-20260705-123456",
  "status": "DRAFT"
}
```

### Upload Document

```http
POST /api/v1/payins/{payinId}/documents
```

Content-Type:

```text
multipart/form-data
```

Fields:

| Field | Type | Description |
| --- | --- | --- |
| documentType | string | POS_SUMMARY, PAYIN_SLIP, TRANSFER_SLIP |
| file | file | image file |

Response:

```json
{
  "documentType": "POS_SUMMARY",
  "url": "https://...",
  "imageHash": "sha256",
  "uploadedAt": "2026-07-05T00:00:00.000Z"
}
```

### Run AI Check

```http
POST /api/v1/payins/{payinId}/ai-check
```

Response:

```json
{
  "payinId": "PAY-20260705-123456",
  "aiDocuments": {},
  "comparisons": {},
  "riskScore": 20,
  "riskFlags": [],
  "status": "PENDING_ACCOUNTING"
}
```

### Get Pay-in

```http
GET /api/v1/payins/{payinId}
```

Response:

```json
{
  "id": "PAY-20260705-123456",
  "date": "2026-07-05",
  "branch": "D-FARM Bangkok 01",
  "status": "PENDING_ACCOUNTING"
}
```

### List Pay-ins

```http
GET /api/v1/payins?branch=&status=&dateFrom=&dateTo=
```

Branch role:

- backend ต้อง ignore branch query ที่ไม่ใช่ branch ของผู้ใช้

Response:

```json
{
  "items": [],
  "nextPageToken": null
}
```

### Review Pay-in

```http
POST /api/v1/payins/{payinId}/review
```

Request:

```json
{
  "decision": "APPROVED",
  "accountingComment": "Checked"
}
```

Allowed decisions:

- APPROVED
- RETURNED

Response:

```json
{
  "id": "PAY-20260705-123456",
  "status": "APPROVED",
  "reviewedBy": "accounting@example.com",
  "reviewedAt": "2026-07-05T00:00:00.000Z"
}
```

## Report APIs

### Audit Dashboard

```http
GET /api/v1/reports/audit-dashboard?dateFrom=&dateTo=&branch=
```

Response:

```json
{
  "records": 100,
  "highRisk": 8,
  "approved": 80,
  "pending": 12
}
```

### Export Excel

```http
GET /api/v1/reports/payins.xlsx?dateFrom=&dateTo=&branch=
```

Response:

```text
application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

## Admin APIs

### List Branches

```http
GET /api/v1/branches
```

### Upsert Branch

```http
PUT /api/v1/branches/{branchId}
```

Request:

```json
{
  "code": "00074",
  "name": "D-FARM Bangkok 01",
  "area": "Bangkok",
  "active": true
}
```

### List Users

```http
GET /api/v1/users
```

### Upsert User

```http
PUT /api/v1/users/{userId}
```

Request:

```json
{
  "name": "Branch User",
  "email": "branch@example.com",
  "role": "Branch",
  "branch": "D-FARM Bangkok 01",
  "active": true
}
```

## Audit Log APIs

### List Audit Logs

```http
GET /api/v1/audit-logs?recordId=&actor=&dateFrom=&dateTo=
```

Response:

```json
{
  "items": [
    {
      "id": "log-1",
      "action": "CREATE_PAYIN",
      "recordId": "PAY-20260705-123456",
      "actor": "branch@example.com",
      "actorRole": "Branch",
      "createdAt": "2026-07-05T00:00:00.000Z"
    }
  ]
}
```

## API Error Format

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource",
    "details": {}
  }
}
```

Common codes:

- UNAUTHENTICATED
- FORBIDDEN
- NOT_FOUND
- VALIDATION_ERROR
- DUPLICATE_REFERENCE
- FILE_TOO_LARGE
- UNSUPPORTED_FILE_TYPE
- AI_PARSER_FAILED

## Backend Responsibilities

เมื่อมี backend/API จริง ควรย้าย logic เหล่านี้ออกจาก frontend:

- role/branch authorization
- upload validation
- image hashing
- AI parser call
- comparison engine
- risk engine
- audit log creation
- Excel export

