import base64
import cv2
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel


class ImageRequest(BaseModel):
    imageBase64: str
    options: dict = {}


app = FastAPI(title="D-FARM Local OpenCV Server")


def decode_image(image_base64: str):
    raw = image_base64.split(",")[-1]
    data = np.frombuffer(base64.b64decode(raw), dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("INVALID_IMAGE")
    return image


def encode_image(image):
    success, buffer = cv2.imencode(".jpg", image, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
    if not success:
        raise ValueError("ENCODE_FAILED")
    return "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")


def quality_metrics(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape[:2]
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness_score = float(np.mean(gray))
    contrast_score = float(np.std(gray))
    resolution_score = min(100, (width * height) / (1280 * 720) * 100)
    is_blurry = blur_score < 80
    is_too_dark = brightness_score < 60
    is_too_bright = brightness_score > 210
    is_low_resolution = resolution_score < 55
    warnings = []
    if is_blurry:
        warnings.append("IMAGE_BLURRY")
    if is_too_dark:
        warnings.append("IMAGE_TOO_DARK")
    if is_too_bright:
        warnings.append("IMAGE_TOO_BRIGHT")
    if is_low_resolution:
        warnings.append("IMAGE_LOW_RESOLUTION")
    quality_score = max(0, min(100, 100 - len(warnings) * 18))
    return {
        "success": True,
        "qualityScore": quality_score,
        "blurScore": round(min(100, blur_score / 8), 2),
        "brightnessScore": round(min(100, brightness_score / 2.55), 2),
        "contrastScore": round(min(100, contrast_score * 2), 2),
        "resolutionScore": round(resolution_score, 2),
        "rotationWarning": height > width * 1.7,
        "cropWarning": False,
        "isTooDark": is_too_dark,
        "isTooBright": is_too_bright,
        "isBlurry": is_blurry,
        "isLowResolution": is_low_resolution,
        "isLikelyCropped": False,
        "warnings": warnings,
        "status": "FAIL" if quality_score < 60 else "WARN" if quality_score < 80 else "PASS",
    }


def preprocess(image, options):
    log = []
    processed = image.copy()
    original = encode_image(image)

    if options.get("enableAutoRotate", True) and processed.shape[0] > processed.shape[1] * 1.8:
        processed = cv2.rotate(processed, cv2.ROTATE_90_CLOCKWISE)
        log.append({"operation": "AUTO_ROTATE", "status": "COMPLETED"})

    if options.get("enableDeskew", True):
        log.append({"operation": "DESKEW", "status": "READY_MOCK"})

    if options.get("enableContrast", True):
        lab = cv2.cvtColor(processed, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(l_channel)
        processed = cv2.cvtColor(cv2.merge((enhanced, a_channel, b_channel)), cv2.COLOR_LAB2BGR)
        log.append({"operation": "CONTRAST_ENHANCEMENT", "status": "COMPLETED"})

    if options.get("enableBrightness", True):
        processed = cv2.convertScaleAbs(processed, alpha=1.02, beta=4)
        log.append({"operation": "BRIGHTNESS_CORRECTION", "status": "COMPLETED"})

    if options.get("enableNoiseReduction", True):
        processed = cv2.fastNlMeansDenoisingColored(processed, None, 4, 4, 7, 21)
        log.append({"operation": "NOISE_REDUCTION", "status": "COMPLETED"})

    max_side = 1600
    height, width = processed.shape[:2]
    scale = min(1, max_side / max(height, width))
    if scale < 1:
        processed = cv2.resize(processed, (int(width * scale), int(height * scale)))
        log.append({"operation": "RESIZE", "status": "COMPLETED"})

    log.append({"operation": "BORDER_DETECTION", "status": "READY_MOCK"})
    log.append({"operation": "PERSPECTIVE_CORRECTION", "status": "READY_MOCK"})

    return {
        "success": True,
        "originalImage": original,
        "processedImage": encode_image(processed),
        "preprocessingLog": log,
        "confidence": 90,
        "warnings": [],
    }


@app.get("/health")
def health():
    return {"status": "READY", "version": cv2.__version__}


@app.post("/quality")
def quality(payload: ImageRequest):
    return quality_metrics(decode_image(payload.imageBase64))


@app.post("/preprocess")
def preprocess_endpoint(payload: ImageRequest):
    return preprocess(decode_image(payload.imageBase64), payload.options or {})
