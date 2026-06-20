# Fine-Tuning an AI Nutrition Coach

To build a specialized nutrition coach that behaves like a professional registered dietitian, we can customize a Large Language Model (LLM). This guide covers how to fine-tune a model using Google's Gemini Tuning API and how to perform local, parameter-efficient fine-tuning on open-source models (like Gemma 2B) using PyTorch.

---

## 1. Concept: How Fine-Tuning Works
While **Prompt Engineering** tells the model *how to behave* using system prompts, **Fine-Tuning** actually updates the internal neural network weights of the model. 

### Why LoRA (Low-Rank Adaptation)?
Standard fine-tuning requires updating all parameters of a model, which is computationally expensive (requiring multiple enterprise-grade GPUs). To solve this, we use **PEFT (Parameter-Efficient Fine-Tuning)**, specifically **LoRA**.

During LoRA training:
1. The original pre-trained model weights ($W_0$) are **frozen** (they do not change).
2. We add small, trainable rank decomposition matrices (A and B) to the attention layers:
   $$\Delta W = B \times A$$
3. If $W$ is a $4096 \times 4096$ matrix (16 million parameters), LoRA with a rank $r=8$ uses matrices of size $4096 \times 8$ and $8 \times 4096$ (only 65,536 parameters!).
4. This reduces memory usage by over **99%**, allowing you to fine-tune an LLM on a consumer GPU.

---

## 2. API Tuning via Google AI Studio
Google allows fine-tuning `gemini-1.5-flash` using their cloud infrastructure for free or low cost.

### Dataset Format (JSONL)
To tune Gemini, prepare a dataset where each row is a conversation containing system, user, and assistant roles:
```json
{"messages": [{"role": "system", "content": "You are a professional registered dietitian."}, {"role": "user", "content": "How do I deal with muscle soreness?"}, {"role": "model", "content": "Muscle soreness (DOMS) is normal. Focus on 20-30g of fast-digesting protein and high potassium foods like bananas within 2 hours of training."}]}
```

### Upload and Train
You can upload this file directly in the **Google AI Studio Tuning Console**, choose the model, set epochs (e.g. 3-5), and let Google train the custom model. Once completed, your model identifier changes to `tunedModels/your-custom-name`.

---

## 3. Local Fine-Tuning Script (PyTorch + Hugging Face)
If you want to train an open-source model (like Google's `google/gemma-2b-it`) locally, create a file `fine_tune.py` in your backend.

Here is the complete template script using `transformers`, `peft`, and `trl` (Transformer Reinforcement Learning):

```python
import torch
from datasets import Dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments
)
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer

# 1. Prepare sample training dataset
# In practice, collect 500+ nutritionist question-and-answer pairs
training_data = [
    {
        "instruction": "Explain how to calculate daily protein targets.",
        "response": "For active adults, aim for 1.6 to 2.2 grams of protein per kilogram of bodyweight. This supports muscle synthesis and keeps you full during caloric deficits."
    },
    {
        "instruction": "What should I eat if I am constantly tired on a deficit?",
        "response": "Fatigue on a deficit usually points to low electrolytes or insufficient complex carbohydrates. Try adding 50g of oats or sweet potato prior to workouts, and ensure you consume enough sodium and potassium."
    },
    {
        "instruction": "Recommend a meal with high iron and low fat.",
        "response": "Spinach and lentil salad topped with squeezed lemon juice (Vitamin C improves iron absorption) and 150g grilled chicken breast or lean beef sirloin."
    }
]

# Map to conversational template
def format_prompts(batch):
    formatted = []
    for inst, resp in zip(batch["instruction"], batch["response"]):
        formatted.append(f"<start_of_turn>user\n{inst}<end_of_turn>\n<start_of_turn>model\n{resp}<end_of_turn>")
    return {"text": formatted}

dataset = Dataset.from_list(training_data)
dataset = dataset.map(format_prompts, batched=True)

# 2. Configure QLoRA (4-bit quantization to run on consumer GPUs)
quant_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True
)

model_id = "google/gemma-2-2b-it"
print(f"[*] Loading model {model_id}...")

tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    quantization_config=quant_config,
    device_map="auto"
)

# 3. Configure LoRA
peft_params = LoraConfig(
    r=8,
    lora_alpha=16,
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)
model = get_peft_model(model, peft_params)

# 4. Configure Training parameters
training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=3,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    optim="paged_adamw_32bit",
    save_steps=25,
    logging_steps=5,
    learning_rate=2e-4,
    weight_decay=0.001,
    fp16=True,
    max_grad_norm=0.3,
    warmup_ratio=0.03,
    group_by_length=True,
    lr_scheduler_type="cosine"
)

# 5. Initialize Supervised Fine-Tuning Trainer (SFTTrainer)
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    peft_config=peft_params,
    dataset_text_field="text",
    max_seq_length=512,
    tokenizer=tokenizer,
    args=training_args
)

print("[*] Starting Local LoRA Fine-Tuning...")
# trainer.train()  # Uncomment this when running on an active CUDA GPU!
print("[+] Model training complete.")

# 6. Save the adapter weights
# model.save_pretrained("./nutrition_coach_lora_adapter")
```
