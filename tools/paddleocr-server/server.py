import base64
import io
import os
import tempfile
from typing import Optional

from fastapi import FastAPI, File, Form, Request, UploadFile

try:
    from paddleocr import PaddleOCR
except Exception:  # pragma: no cover - allows server to start in mock environments
    PaddleOCR = None


app = FastAPI(title="D-FARM Local PaddleOCR Server")
ocr_instances = {}


def get_ocr(language: str, enable_angle_classification: bool):
    key = f"{language}:{enable_angle_classification}"
    if key not in ocr_instances:
        if PaddleOCR is None:
            ocr_instances[key] = None
        else:
            lang = "en" if "eng" in language and "thai" not in language else "th"
            ocr_instances[key] = PaddleOCR(use_angle_cls=enable_angle_classification, lang=lang)
    return ocr_instances[key]


def decode_base64_to_tempfile(image_base64: str):
    image_bytes = base64.b64decode(image_base64.split(",")[-1])
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
    temp_file.write(image_bytes)
    temp_file.close()
    return temp_file.name


def parse_paddle_result(result):
    text_blocks = []
    lines = result[0] if result and isinstance(result, list) else []
    for index, line in enumerate(lines):
        box = line[0] if line else []
        text = line[1][0] if len(line) > 1 else ""
        confidence = float(line[1][1]) if len(line) > 1 else 0
        text_blocks.append({
            "text": text,
            "confidence": confidence,
            "boundingBox": box,
            "lineNumber": index + 1,
        })
    raw_text = "\n".join(block["text"] for block in text_blocks if block["text"])
    confidence = sum(block["confidence"] for block in text_blocks) / len(text_blocks) if text_blocks else 0
    return {
        "success": True,
        "rawText": raw_text,
        "textBlocks": text_blocks,
        "confidence": round(confidence, 4),
    }


@app.get("/health")
def health():
    return {
        "status": "READY" if PaddleOCR is not None else "MOCK_READY",
        "version": os.environ.get("PADDLEOCR_VERSION", "local"),
        "language": os.environ.get("PADDLEOCR_LANGUAGE", "thai+eng"),
    }


@app.post("/ocr")
async def ocr(
    request: Request,
    image: Optional[UploadFile] = File(default=None),
    language: str = Form(default="thai+eng"),
    enableAngleClassification: bool = Form(default=True),
):
    temp_path = None
    try:
        if image:
            suffix = os.path.splitext(image.filename or "image.png")[1] or ".png"
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            temp_file.write(await image.read())
            temp_file.close()
            temp_path = temp_file.name
        else:
            payload = await request.json()
            if payload.get("imageBase64"):
                language = payload.get("language", language)
                enableAngleClassification = payload.get("enableAngleClassification", enableAngleClassification)
                temp_path = decode_base64_to_tempfile(payload["imageBase64"])
            else:
                return {"success": False, "rawText": "", "textBlocks": [], "confidence": 0, "warnings": ["NO_IMAGE"]}

        ocr_engine = get_ocr(language, enableAngleClassification)
        if ocr_engine is None:
            return {"success": False, "rawText": "", "textBlocks": [], "confidence": 0, "warnings": ["PADDLEOCR_NOT_INSTALLED"]}
        result = ocr_engine.ocr(temp_path, cls=enableAngleClassification)
        return parse_paddle_result(result)
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)
