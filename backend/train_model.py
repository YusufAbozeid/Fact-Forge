import pandas as pd
import numpy as np
import torch
import os
import time
import datetime
from transformers import AutoTokenizer, AutoModelForSequenceClassification, get_linear_schedule_with_warmup
from torch.utils.data import TensorDataset, DataLoader, RandomSampler, SequentialSampler
from torch.optim import AdamW
from sklearn.model_selection import train_test_split
import re
import string

# --- 1. Hardware & Device Configuration ---
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"🚀 Running on: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}")

# --- 2. Text Preprocessing ---
def clean_text(text):
    text = str(text).lower()
    # Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    # Remove digits and dates (Critical to prevent the model from memorizing temporal patterns)
    text = re.sub(r'\d+', '', text)
    # Remove special characters and punctuation
    text = re.sub(r"\W", " ", text)
    return text.strip()

# Helper function for accuracy calculation
def flat_accuracy(preds, labels):
    pred_flat = np.argmax(preds, axis=1).flatten()
    labels_flat = labels.flatten()
    return np.sum(pred_flat == labels_flat) / len(labels_flat)

# --- 3. Data Loading & Preparation (WELFake) ---
print("📦 Loading WELFake Dataset...")
file_path = r"C:\Users\Mayada AbouZeid\Documents\Study2026\Spring 26\Processing of Formal and Natural Language\WELFake_Dataset.csv"
try:
    df = pd.read_csv(file_path)
    # Drop rows with missing values in critical columns
    df = df.dropna(subset=['title', 'text', 'label']) 
except FileNotFoundError:
    print(f"❌ Error: {file_path} not found! Ensure the file is in the script directory.")
    exit()

# Combine Title and Text for better contextual understanding
df['full_text'] = df['title'] + " " + df['text']

print("🧹 Cleaning text (This may take a moment)...")
df['full_text'] = df['full_text'].apply(clean_text)



# --- 4. Tokenization (DeBERTa-v3-Small) ---
model_name = "microsoft/deberta-v3-small"
print(f"🔢 Tokenizing with {model_name}...")
# Use slow tokenizer for better compatibility on Windows environments
tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=False)

encoded_data = tokenizer(
    df['full_text'].tolist(), 
    truncation=True, 
    padding='max_length', 
    max_length=256, 
    return_tensors='pt'
)

# --- 5. Data Partitioning (Train/Validation Split) ---
train_inputs, val_inputs, train_labels, val_labels = train_test_split(
    encoded_data['input_ids'], torch.tensor(df['label'].values), test_size=0.15, random_state=42
)
train_masks, val_masks, _, _ = train_test_split(
    encoded_data['attention_mask'], torch.tensor(df['label'].values), test_size=0.15, random_state=42
)

batch_size = 16 
train_dataloader = DataLoader(TensorDataset(train_inputs, train_masks, train_labels), sampler=RandomSampler(train_inputs), batch_size=batch_size)
val_dataloader = DataLoader(TensorDataset(val_inputs, val_masks, val_labels), sampler=SequentialSampler(val_inputs), batch_size=batch_size)

# --- 6. Model Initialization with Regularization ---
print("🏗️ Initializing DeBERTa-v3 Model...")
model = AutoModelForSequenceClassification.from_pretrained(
    model_name, 
    num_labels=2,
    hidden_dropout_prob=0.5, # High dropout to enforce generalization
    use_safetensors=True    # Secure weight loading
)
model.to(device)

# Optimizer with High Weight Decay to penalize complex weights
optimizer = AdamW(model.parameters(), lr=1e-5, weight_decay=0.2) 
epochs = 3
total_steps = len(train_dataloader) * epochs
scheduler = get_linear_schedule_with_warmup(optimizer, num_warmup_steps=0, num_training_steps=total_steps)

# --- 7. Training Loop with Early Stopping ---
best_val_loss = float('inf')
print("🏋️ Training Started...")

for epoch in range(epochs):
    print(f'\n======== Epoch {epoch + 1} / {epochs} ========')
    model.train()
    total_train_loss = 0

    for step, batch in enumerate(train_dataloader):
        b_input_ids, b_input_mask, b_labels = [t.to(device) for t in batch]
        model.zero_grad()
        
        outputs = model(b_input_ids, attention_mask=b_input_mask, labels=b_labels)
        loss = outputs.loss
        total_train_loss += loss.item()
        
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0) # Gradient clipping
        optimizer.step()
        scheduler.step()

        if step % 200 == 0 and not step == 0:
            print(f'  Batch {step:>5} of {len(train_dataloader):>5}. Loss: {loss.item():.4f}')

    # --- Validation Phase ---
    print("\nEvaluating Model Stability...")
    model.eval()
    total_eval_loss = 0
    total_eval_accuracy = 0
    
    for batch in val_dataloader:
        b_input_ids, b_input_mask, b_labels = [t.to(device) for t in batch]
        with torch.no_grad():
            outputs = model(b_input_ids, attention_mask=b_input_mask, labels=b_labels)
        
        total_eval_loss += outputs.loss.item()
        logits = outputs.logits.detach().cpu().numpy()
        label_ids = b_labels.to('cpu').numpy()
        total_eval_accuracy += flat_accuracy(logits, label_ids)

    avg_val_loss = total_eval_loss / len(val_dataloader)
    print(f"  Val Loss: {avg_val_loss:.4f} | Accuracy: {total_eval_accuracy / len(val_dataloader):.4f}")

    # --- Early Stopping & Checkpointing ---
    if avg_val_loss < best_val_loss:
        best_val_loss = avg_val_loss
        save_path = "./best_welfake_deberta"
        if not os.path.exists(save_path): os.makedirs(save_path)
        model.save_pretrained(save_path)
        tokenizer.save_pretrained(save_path)
        print("🌟 New Best Model Saved!")
    else:
        # If loss increases, we stop to prevent the model from overfitting the training set
        print("⚠️ Warning: Validation Loss increased. Stopping early to preserve generalization.")
        break

print("\n🏁 Final robust model is saved and ready for evaluation.")