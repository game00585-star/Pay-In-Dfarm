# Local PaddleOCR Server

This server exposes a local-only OCR endpoint for D-FARM Pay-in AI.

No paid AI API is used.

## Install

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn server:app --host 127.0.0.1 --port 8000
```

## Endpoints

Health:

```text
GET http://localhost:8000/health
```

OCR:

```text
POST http://localhost:8000/ocr
```

Input can be multipart file:

```text
image=<file>
language=thai+eng
enableAngleClassification=true
```

Or JSON:

```json
{
  "imageBase64": "...",
  "language": "thai+eng",
  "enableAngleClassification": true
}
```

Output:

```json
{
  "success": true,
  "rawText": "",
  "textBlocks": [
    {
      "text": "",
      "confidence": 0.99,
      "boundingBox": [],
      "lineNumber": 1
    }
  ],
  "confidence": 0.99
}
```
