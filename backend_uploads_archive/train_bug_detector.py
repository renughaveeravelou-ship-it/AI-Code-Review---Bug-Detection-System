from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer
)

MODEL_NAME = "microsoft/codebert-base"


dataset = load_dataset("DetectVul/devign")


tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)


def tokenize(example):
    return tokenizer(
        example["func"],
        truncation=True,
        padding="max_length",
        max_length=512
    )


encoded_dataset = dataset.map(tokenize)


model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME,
    num_labels=2
)


training_args = TrainingArguments(
    output_dir="./results",
    evaluation_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=4,
    num_train_epochs=1
)


trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=encoded_dataset["train"],
    eval_dataset=encoded_dataset["validation"]
)


trainer.train()
