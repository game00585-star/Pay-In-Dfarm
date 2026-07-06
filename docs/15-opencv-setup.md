# 15 OpenCV Setup

## Objective

D-FARM Pay-in AI supports free local image processing through OpenCV. The app must not call OpenAI, Gemini, Claude, paid APIs, or external cloud APIs.

## Install Python

Recommended:

```text
Python 3.10 or 3.11
```

Check Python:

```bash
python --version
```

## Install OpenCV Server

Go to:

```text
tools/opencv-server
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

## Run Local OpenCV Server

```bash
uvicorn server:app --host 127.0.0.1 --port 8001
```

Default endpoint:

```text
http://localhost:8001
```

## Test `/health`

```text
GET http://localhost:8001/health
```

Expected:

```json
{
  "status": "READY",
  "version": "4.x"
}
```

## Test `/quality`

```text
POST http://localhost:8001/quality
```

Input:

```json
{
  "imageBase64": "..."
}
```

Output:

```json
{
  "success": true,
  "qualityScore": 90,
  "blurScore": 80,
  "brightnessScore": 70,
  "contrastScore": 75,
  "resolutionScore": 100,
  "rotationWarning": false,
  "cropWarning": false,
  "isTooDark": false,
  "isTooBright": false,
  "isBlurry": false,
  "isLowResolution": false,
  "isLikelyCropped": false,
  "warnings": [],
  "status": "PASS"
}
```

## Test `/preprocess`

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

Output:

```json
{
  "success": true,
  "originalImage": "data:image/jpeg;base64,...",
  "processedImage": "data:image/jpeg;base64,...",
  "preprocessingLog": [],
  "confidence": 90,
  "warnings": []
}
```

## Switch Provider From MOCK To OPENCV

Open:

```text
AI Settings
```

Set:

```json
{
  "preprocessingProvider": "OPENCV",
  "openCV": {
    "openCvEndpoint": "http://localhost:8001",
    "timeout": 120000,
    "enableAutoRotate": true,
    "enableDeskew": true,
    "enableContrast": true,
    "enableBrightness": true,
    "enableNoiseReduction": true
  }
}
```

Then open:

```text
OpenCV Test
```

Use:

1. Health Check
2. Upload Image
3. Analyze Quality
4. Run Preprocessing
5. Review original image, processed image, quality JSON, and preprocessing JSON

## Troubleshooting

### Server unavailable

Run:

```bash
uvicorn server:app --host 127.0.0.1 --port 8001
```

Check:

```text
http://localhost:8001/health
```

### OpenCV install fails

Upgrade pip:

```bash
python -m pip install --upgrade pip
```

Then reinstall:

```bash
pip install -r requirements.txt
```

### Preprocessing returns mock fallback

If OpenCV is unavailable, the app returns fallback warnings:

```text
OPENCV_FALLBACK_MOCK_PREPROCESS
OPENCV_FALLBACK_MOCK_QUALITY
```

This keeps the pipeline running without paid or cloud APIs.
