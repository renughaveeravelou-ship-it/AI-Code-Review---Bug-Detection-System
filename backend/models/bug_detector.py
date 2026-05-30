from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

MODEL_NAME = "microsoft/codebert-base"
_tokenizer = None
_model = None


def _load_model():
    global _tokenizer, _model
    if _tokenizer is None or _model is None:
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        _model = AutoModelForSequenceClassification.from_pretrained(
            MODEL_NAME,
            num_labels=2
        )


def predict_bug(file_path):
    _load_model()

    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        code = f.read()

    inputs = _tokenizer(
        code,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=512
    )

    outputs = _model(**inputs)

    prediction = torch.argmax(outputs.logits).item()

    return {
        "bug_detected": bool(prediction)
    }
