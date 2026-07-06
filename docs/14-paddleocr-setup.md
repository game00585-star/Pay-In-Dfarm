# 14 PaddleOCR Setup

## Objective

D-FARM Pay-in AI supports free local OCR through PaddleOCR. The app must not call OpenAI, Gemini, Claude, paid OCR services, or external cloud APIs.

## Install Python

Recommended:

```text
Python 3.10 or 3.11
```

Check Python:

```bash
python --version
```

## Install PaddleOCR Server

Go to:

```text
tools/paddleocr-server
```

Create virtual environment:

```bash
python -m venv .venv
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

## Run Local OCR Server

```bash
uvicorn server:app --host 127.0.0.1 --port 8000
```

Default OCR endpoint:

```text
http://localhost:8000/ocr
```

Health endpoint:

```text
http://localhost:8000/health
```

## API Endpoint Format

### POST `/ocr`

Multipart input:

```text
image=<file>
language=thai+eng
enableAngleClassification=true
```

JSON input:

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
  "rawText": "text from image",
  "textBlocks": [
    {
      "text": "line text",
      "confidence": 0.99,
      "boundingBox": [[0, 0], [100, 0], [100, 20], [0, 20]],
      "lineNumber": 1
    }
  ],
  "confidence": 0.99
}
```

## Switch OCR Provider

Open:

```text
AI Settings
```

Set:

```json
{
  "ocrProvider": "PADDLEOCR",
  "paddleOCR": {
    "paddleOcrEndpoint": "http://localhost:8000/ocr",
    "timeout": 120000,
    "language": "thai+eng",
    "enableAngleClassification": true
  }
}
```

Then open:

```text
OCR Test
```

Use:

1. Health Check
2. Upload Image
3. Run OCR
4. Review rawText, textBlocks, confidence, and processing time

## Troubleshooting

### Server unavailable

Run:

```bash
uvicorn server:app --host 127.0.0.1 --port 8000
```

Check:

```text
http://localhost:8000/health
```

### PaddleOCR install fails

Try upgrading pip:

```bash
python -m pip install --upgrade pip
```

Then reinstall:

```bash
pip install -r requirements.txt
```

### OCR is slow

Recommendations:

- Use image preprocessing before OCR.
- Resize large images.
- Keep OCR server on the same machine or LAN.

### App fallback

If PaddleOCR is unavailable, the app returns mock OCR fallback with warning:

```text
PADDLEOCR_FALLBACK_MOCK_OCR
```
