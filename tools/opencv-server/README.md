# Local OpenCV Server

This server provides local-only image quality analysis and preprocessing for D-FARM Pay-in AI.

No paid AI API or cloud API is used.

## Install

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn server:app --host 127.0.0.1 --port 8001
```

## Endpoints

Health:

```text
GET http://localhost:8001/health
```

Quality:

```text
POST http://localhost:8001/quality
```

Preprocess:

```text
POST http://localhost:8001/preprocess
```

Input:

```json
{
  "imageBase64": "...",
  "options": {
    "enableAutoRotate": true,
    "enableDeskew": true,
    "enableContrast": true,
    "enableBrightness": true,
    "enableNoiseReduction": true
  }
}
```
