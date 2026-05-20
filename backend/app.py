from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import re

app = Flask(__name__)
CORS(app)  # This allows your React frontend to communicate with Flask

# --- 1. Load Model & Tokenizer ---
# Make sure the path matches where your best model is saved
MODEL_PATH = "./best_welfake_deberta"
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

print("Loading model to device...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
model.to(device)
model.eval()

# --- 2. Preprocessing Function ---
def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    text = re.sub(r'\d+', '', text)
    text = re.sub(r"\W", " ", text)
    return text.strip()

# --- 3. API Route for Prediction ---
@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400

    # Preprocess and Tokenize
    raw_text = data['text']
    clean_raw = clean_text(raw_text)
    
    inputs = tokenizer(clean_raw, return_tensors="pt", truncation=True, padding=True, max_length=256).to(device)

    # Inference
    with torch.no_grad():
        outputs = model(**inputs)
        prediction = torch.argmax(outputs.logits, dim=-1).item()
        # Calculate confidence (Softmax)
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        confidence = torch.max(probs).item()

    # Mapping: 0 -> Fake, 1 -> Real (Verify this based on your dataset labels)
    result = "Real" if prediction == 1 else "Fake"

    return jsonify({
        "label": result,
        "confidence": round(confidence * 100, 2),
        "status": "success"
    })

if __name__ == '__main__':
    app.run(port=5000, debug=True)