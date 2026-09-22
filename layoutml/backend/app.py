from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageFile, UnidentifiedImageError
import pytesseract
from transformers import LayoutLMv3Processor, LayoutLMv3ForTokenClassification
import torch
import io
import os
import shutil
from functools import lru_cache

ImageFile.LOAD_TRUNCATED_IMAGES = True

MODEL_NAME = "microsoft/layoutlmv3-base"

app = FastAPI(title="LayoutLM Web API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def configure_tesseract() -> bool:
    """Locate Tesseract on Windows even if it is not on PATH."""
    if shutil.which("tesseract"):
        return True

    candidates = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Tesseract-OCR\tesseract.exe"),
        os.path.expandvars(r"%PROGRAMFILES%\Tesseract-OCR\tesseract.exe"),
    ]
    for path in candidates:
        if path and os.path.isfile(path):
            pytesseract.pytesseract.tesseract_cmd = path
            return True
    return False


TESSERACT_AVAILABLE = configure_tesseract()


@lru_cache(maxsize=1)
def get_rapid_ocr():
    from rapidocr_onnxruntime import RapidOCR

    return RapidOCR()


def load_document_image(content: bytes, filename: str) -> Image.Image:
    if not content:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    name = (filename or "").lower()
    is_pdf = content.startswith(b"%PDF") or name.endswith(".pdf")

    if is_pdf:
        try:
            import pypdfium2 as pdfium

            pdf = pdfium.PdfDocument(content)
            if len(pdf) == 0:
                raise HTTPException(status_code=400, detail="El PDF no tiene páginas.")
            image = pdf[0].render(scale=2).to_pil().convert("RGB")
            pdf.close()
            return image
        except ImportError as exc:
            raise HTTPException(
                status_code=500,
                detail="Falta la dependencia pypdfium2 para leer PDF.",
            ) from exc
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail="No se pudo leer el PDF. Verifica que el archivo no esté dañado.",
            ) from exc

    try:
        image = Image.open(io.BytesIO(content))
        image.load()
        return image.convert("RGB")
    except UnidentifiedImageError as exc:
        raise HTTPException(
            status_code=400,
            detail="El archivo no es una imagen o PDF válido. Usa PNG, JPG, WEBP o PDF.",
        ) from exc


def normalize_box(x0, y0, x1, y1, width, height):
    return [
        max(0, min(1000, int(1000 * x0 / width))),
        max(0, min(1000, int(1000 * y0 / height))),
        max(0, min(1000, int(1000 * x1 / width))),
        max(0, min(1000, int(1000 * y1 / height))),
    ]


def extract_with_tesseract(image: Image.Image):
    data = pytesseract.image_to_data(
        image,
        output_type=pytesseract.Output.DICT,
        config="--psm 6",
    )
    words = []
    boxes = []
    width, height = image.size

    for i, text in enumerate(data["text"]):
        text = (text or "").strip()
        if not text:
            continue
        x, y = data["left"][i], data["top"][i]
        w, h = data["width"][i], data["height"][i]
        words.append(text)
        boxes.append(normalize_box(x, y, x + w, y + h, width, height))

    return words, boxes


def extract_with_rapidocr(image: Image.Image):
    import numpy as np

    engine = get_rapid_ocr()
    result, _ = engine(np.array(image))
    words = []
    boxes = []
    width, height = image.size

    if not result:
        return words, boxes

    for item in result:
        # item: [box_points, text, score]
        if not item or len(item) < 2:
            continue
        points, text = item[0], item[1]
        text = (text or "").strip()
        if not text:
            continue
        xs = [p[0] for p in points]
        ys = [p[1] for p in points]
        words.append(text)
        boxes.append(normalize_box(min(xs), min(ys), max(xs), max(ys), width, height))

    return words, boxes


def extract_words_and_boxes(image: Image.Image):
    if TESSERACT_AVAILABLE:
        try:
            return extract_with_tesseract(image)
        except pytesseract.TesseractNotFoundError:
            pass
        except Exception:
            # Fall through to RapidOCR.
            pass

    try:
        return extract_with_rapidocr(image)
    except ImportError as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "No hay motor OCR disponible. Instala Tesseract OCR "
                "o ejecuta: pip install rapidocr-onnxruntime"
            ),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error al ejecutar OCR: {exc}",
        ) from exc


print("Cargando LayoutLMv3...")
processor = LayoutLMv3Processor.from_pretrained(MODEL_NAME, apply_ocr=False)
model = LayoutLMv3ForTokenClassification.from_pretrained(MODEL_NAME)
print("LayoutLMv3 cargado.")
print(
    "OCR:",
    "Tesseract" if TESSERACT_AVAILABLE else "RapidOCR (fallback)",
)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "ocr": "tesseract" if TESSERACT_AVAILABLE else "rapidocr",
    }


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)):
    content = await file.read()
    image = load_document_image(content, file.filename or "")
    words, boxes = extract_words_and_boxes(image)
    width, height = image.size

    if not words:
        return {
            "filename": file.filename,
            "text": "",
            "tokens": [],
            "image_size": {"width": width, "height": height},
            "message": "OCR no encontró texto.",
        }

    # LayoutLMv3 consumes words + layout boxes (normalized 0-1000).
    encoding = processor(
        image,
        words,
        boxes=boxes,
        return_tensors="pt",
        truncation=True,
        padding="max_length",
    )
    with torch.no_grad():
        model(**encoding)

    # Prefer bbox tensors that LayoutLM actually received (word-aligned).
    layout_boxes = boxes
    try:
        word_ids = encoding.word_ids(batch_index=0)
        bbox_tensor = encoding["bbox"][0].tolist()
        aligned = {}
        for idx, word_id in enumerate(word_ids or []):
            if word_id is None or word_id in aligned:
                continue
            candidate = bbox_tensor[idx]
            if candidate != [0, 0, 0, 0]:
                aligned[word_id] = candidate
        if aligned:
            layout_boxes = [aligned.get(i, boxes[i]) for i in range(len(words))]
    except Exception:
        layout_boxes = boxes

    tokens = []
    for word, box in zip(words, layout_boxes):
        x0, y0, x1, y1 = [int(v) for v in box]
        px0 = int(x0 * width / 1000)
        py0 = int(y0 * height / 1000)
        px1 = int(x1 * width / 1000)
        py1 = int(y1 * height / 1000)
        coords = f"px ({px0}, {py0}) -> ({px1}, {py1}) | layout [{x0}, {y0}, {x1}, {y1}]"
        tokens.append(
            {
                "text": word,
                "box": [x0, y0, x1, y1],
                "coords": coords,
                "location": {
                    "x0": x0,
                    "y0": y0,
                    "x1": x1,
                    "y1": y1,
                    "pixel": {
                        "x0": px0,
                        "y0": py0,
                        "x1": px1,
                        "y1": py1,
                    },
                },
            }
        )

    return {
        "filename": file.filename,
        "text": " ".join(words),
        "tokens": tokens,
        "image_size": {"width": width, "height": height},
        "message": "Documento procesado correctamente.",
    }
