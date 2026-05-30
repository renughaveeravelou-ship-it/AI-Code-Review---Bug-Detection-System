import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import tensorflow as tf
import numpy as np
import requests
import datetime
from tensorflow.keras.layers import Layer, Embedding, Dense, LayerNormalization, Dropout
from tensorflow.keras import Model

class MultiHeadSelfAttention(Layer):
    def __init__(self, embed_dim, num_heads):
        super().__init__()
        self.num_heads = num_heads
        self.embed_dim = embed_dim
        self.depth = embed_dim // num_heads

        self.wq = Dense(embed_dim)
        self.wk = Dense(embed_dim)
        self.wv = Dense(embed_dim)

        self.dense = Dense(embed_dim)

    def split_heads(self, x, batch_size):
        x = tf.reshape(x, (batch_size, -1, self.num_heads, self.depth))
        return tf.transpose(x, perm=[0, 2, 1, 3])

    def call(self, v, k, q, mask):
        batch_size = tf.shape(q)[0]
        q = self.split_heads(self.wq(q), batch_size)
        k = self.split_heads(self.wk(k), batch_size)
        v = self.split_heads(self.wv(v), batch_size)

        matmul_qk = tf.matmul(q, k, transpose_b=True)
        dk = tf.cast(tf.shape(k)[-1], tf.float32)
        scaled_attention_logits = matmul_qk / tf.math.sqrt(dk)

        if mask is not None:
            scaled_attention_logits += (mask * -1e9)

        attention_weights = tf.nn.softmax(scaled_attention_logits, axis=-1)
        output = tf.matmul(attention_weights, v)
        output = tf.transpose(output, perm=[0, 2, 1, 3])
        concat_attention = tf.reshape(output, (batch_size, -1, self.embed_dim))
        return self.dense(concat_attention)

class FeedForwardNetwork(Layer):
    def __init__(self, embed_dim, dff):
        super().__init__()
        self.dense1 = Dense(dff, activation='gelu')
        self.dense2 = Dense(embed_dim)

    def call(self, x):
        return self.dense2(self.dense1(x))

class TransformerBlock(Layer):
    def __init__(self, embed_dim, num_heads, dff, dropout_rate=0.1):
        super().__init__()
        self.att = MultiHeadSelfAttention(embed_dim, num_heads)
        self.ffn = FeedForwardNetwork(embed_dim, dff)
        self.norm1 = LayerNormalization(epsilon=1e-6)
        self.norm2 = LayerNormalization(epsilon=1e-6)
        self.dropout1 = Dropout(dropout_rate)
        self.dropout2 = Dropout(dropout_rate)

    def call(self, x, training=None, mask=None):
        attn_output = self.att(x, x, x, mask)
        attn_output = self.dropout1(attn_output, training=training)
        out1 = self.norm1(x + attn_output)

        ffn_output = self.ffn(out1)
        ffn_output = self.dropout2(ffn_output, training=training)
        return self.norm2(out1 + ffn_output)

class GPT2(Model):
    def __init__(self, vocab_size, max_length, embed_dim=768, num_heads=12, dff=3072, num_layers=12, dropout_rate=0.1):
        super().__init__()

        self.max_length = max_length
        self.token_emb = Embedding(vocab_size, embed_dim)
        self.pos_emb = Embedding(max_length, embed_dim)

        self.transformer_blocks = [TransformerBlock(embed_dim, num_heads, dff, dropout_rate) for _ in range(num_layers)]

        self.norm = LayerNormalization(epsilon=1e-6)
        self.out = Dense(vocab_size)

    def create_causal_mask(self, seq_len):
        mask = tf.linalg.band_part(tf.ones((seq_len, seq_len)), -1, 0)
        return 1 - mask

    def call(self, x, training=None):
        seq_len = tf.shape(x)[1]
        mask = self.create_causal_mask(seq_len)

        token_embeddings = self.token_emb(x)
        position_ids = tf.range(start=0, limit=seq_len, delta=1)
        position_embeddings = self.pos_emb(position_ids)

        x = token_embeddings + position_embeddings

        for transformer in self.transformer_blocks:
            x = transformer(x, training=training, mask=mask)

        x = self.norm(x)
        return self.out(x)

    def generate(self, input_ids, max_new_tokens, temperature=1.0, top_k=50):
        for _ in range(max_new_tokens):
            # Crop to max_length
            idx_cond = input_ids[:, -self.max_length:]
            logits = self(idx_cond, training=False)
            # Focus on the last token's logits
            next_token_logits = logits[:, -1, :] / temperature
            
            # Top-K sampling (k cannot exceed vocabulary width)
            k = min(top_k, int(self.out.units))
            top_k_logits, top_k_indices = tf.math.top_k(next_token_logits, k=k)
            next_token_idx = tf.random.categorical(top_k_logits, num_samples=1, dtype=tf.int32)
            
            # Map back to original indices
            next_token = tf.gather(top_k_indices, next_token_idx, batch_dims=1)
            
            input_ids = tf.concat([input_ids, next_token], axis=-1)
        return input_ids

class CharTokenizer:
    def __init__(self, text):
        self.chars = sorted(list(set(text)))
        self.vocab_size = len(self.chars)
        self.stoi = {ch: i for i, ch in enumerate(self.chars)}
        self.itos = {i: ch for i, ch in enumerate(self.chars)}

    def encode(self, s):
        return [self.stoi[c] for c in s]

    def decode(self, l):
        return ''.join(self.itos[int(i)] for i in l)

def load_dataset(url, filename="input.txt"):
    if not os.path.exists(filename):
        print(f"Downloading dataset from {url}...")
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(response.text)
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()
    return text

VOCAB_SIZE = 50257  # Default, will be updated by tokenizer
MAX_LENGTH = 128    # Reduced for demonstration

# --- Dataset Preparation ---
print("\n--- Preparing Dataset ---")
DATA_URL = "https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt"
text_data = load_dataset(DATA_URL)
tokenizer = CharTokenizer(text_data)

print(f"Dataset loaded. Vocab size: {tokenizer.vocab_size}")
VOCAB_SIZE = tokenizer.vocab_size

# --- Split Data ---
data = np.array(tokenizer.encode(text_data), dtype=np.int32)
n = int(0.9 * len(data))
train_data = data[:n]
val_data = data[n:]

# --- Model Initialization ---
print("Initializing model (Upgraded Architecture)...")
gpt2 = GPT2(vocab_size=VOCAB_SIZE, max_length=MAX_LENGTH, embed_dim=384, num_heads=6, dff=1536, num_layers=6)
# Build the model by calling it with dummy data
_ = gpt2(tf.zeros((1, MAX_LENGTH), dtype=tf.int32))

CHECKPOINT_PATH = "gpt2_weights.weights.h5"
if os.path.exists(CHECKPOINT_PATH):
    print(f"Loading weights from {CHECKPOINT_PATH}...")
    try:
        gpt2.load_weights(CHECKPOINT_PATH)
    except (OSError, ValueError) as e:
        print(f"Could not load checkpoint (architecture mismatch or corrupt file): {e}")

gpt2.summary()

# --- Training Demo ---
print("\n--- Starting Training Demo ---")
# Learning Rate Scheduler (Simple decay)
lr_schedule = tf.keras.optimizers.schedules.ExponentialDecay(
    initial_learning_rate=1e-3,
    decay_steps=1000,
    decay_rate=0.96,
    staircase=True)
optimizer = tf.keras.optimizers.Adam(learning_rate=lr_schedule)
loss_fn = tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True)

# TensorBoard setup
log_dir = "logs/fit/" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
summary_writer = tf.summary.create_file_writer(log_dir)

def get_batch(data, batch_size, block_size):
    if len(data) <= block_size:
        raise ValueError(f"Need len(data) > block_size, got {len(data)} and {block_size}.")
    ix = np.random.randint(0, len(data) - block_size, batch_size)
    x = np.stack([data[i:i+block_size] for i in ix])
    y = np.stack([data[i+1:i+block_size+1] for i in ix])
    return tf.constant(x, dtype=tf.int32), tf.constant(y, dtype=tf.int32)

@tf.function
def train_step(x, y):
    with tf.GradientTape() as tape:
        logits = gpt2(x, training=True)
        loss = loss_fn(y, logits)
    gradients = tape.gradient(loss, gpt2.trainable_variables)
    optimizer.apply_gradients(zip(gradients, gpt2.trainable_variables))
    return loss

@tf.function
def val_step(x, y):
    logits = gpt2(x, training=False)
    loss = loss_fn(y, logits)
    return loss

TOTAL_ITERATIONS = int(os.environ.get("GPT2_ITERS", "5000"))
VALIDATION_FREQ = 250
SAVE_FREQ = 1000

print(f"Running {TOTAL_ITERATIONS} training iterations. Logs saved to: {log_dir}", flush=True)
try:
    for i in range(TOTAL_ITERATIONS):
        xb, yb = get_batch(train_data, batch_size=4, block_size=MAX_LENGTH)
        loss = train_step(xb, yb)
        
        with summary_writer.as_default():
            tf.summary.scalar('train_loss', loss, step=i)
            lr = optimizer.learning_rate
            if isinstance(lr, tf.keras.optimizers.schedules.LearningRateSchedule):
                lr = lr(i)
            tf.summary.scalar('learning_rate', lr, step=i)

        if (i + 1) % VALIDATION_FREQ == 0:
            # Run validation
            xv, yv = get_batch(val_data, batch_size=4, block_size=MAX_LENGTH)
            v_loss = val_step(xv, yv)
            print(f"Iteration {i+1}/{TOTAL_ITERATIONS}, Train Loss: {loss.numpy():.4f}, Val Loss: {v_loss.numpy():.4f}", flush=True)
            with summary_writer.as_default():
                tf.summary.scalar('val_loss', v_loss, step=i)
        
        # Save checkpoint
        if (i + 1) % SAVE_FREQ == 0:
            print(f"Saving checkpoint to {CHECKPOINT_PATH}...", flush=True)
            gpt2.save_weights(CHECKPOINT_PATH)
except KeyboardInterrupt:
    print("\nTraining interrupted by user. Saving current weights...")
    gpt2.save_weights(CHECKPOINT_PATH)
    print("Checkpoint saved.")

# --- Generation Demo ---
print("\n--- Starting Generation Demo ---")
prompt_text = "The "
prompt_encoded = tf.constant([tokenizer.encode(prompt_text)], dtype=tf.int32)

print(f"Prompt: '{prompt_text}'")
print("Generating 50 characters...")

generated_ids = gpt2.generate(prompt_encoded, max_new_tokens=50, top_k=10)
generated_text = tokenizer.decode(generated_ids.numpy()[0])
print(f"Generated text:\n{generated_text}")

print("\nDone!")
