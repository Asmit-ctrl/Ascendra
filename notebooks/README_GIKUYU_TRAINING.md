# Mwalimu — Gikuyu Tutor Fine-tuning

Fine-tune `unsloth/gemma-2b-bnb-4bit` into **Mwalimu**, a Gikuyu-speaking CBC curriculum tutor. Notebook: [`Fine_tune_Gikuyu_Mwalimu.ipynb`](./Fine_tune_Gikuyu_Mwalimu.ipynb).

## Open in Colab

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/dgithinjibit/syncsenta-studio/blob/main/Fine_tune_Gikuyu_Mwalimu.ipynb)

1. Open the badge above (or `File → Open notebook → GitHub → dgithinjibit/syncsenta-studio`).
2. **Runtime → Change runtime type → T4 GPU** (free tier).
3. Run cells top-to-bottom. Cell 1 installs the stack on Colab automatically.

## Expected training time on a free T4

| Mode | `MAX_STEPS` | Wall time | Use for |
|---|---|---|---|
| Smoke test | 60 | ~5 min | Confirm the pipeline runs end-to-end |
| Full run | 500 | ~30 min | Production-quality adapter |

Set `MAX_STEPS` in **Cell 4**. The smoke test is the default so a Colab session never accidentally consumes your free GPU budget.

## Using the trained model

After Cell 7 finishes you'll have a LoRA adapter in `mwalimu-gemma-2b-lora/`. Three deployment paths:

### 1. Hugging Face Inference API — free tier

Set `PUSH_TO_HUB = True` in Cell 7, edit `HUB_REPO`, and run. Then:

```bash
curl https://api-inference.huggingface.co/models/your-hf-username/mwalimu-gemma-2b \
  -H "Authorization: Bearer $HF_TOKEN" \
  -d '{"inputs": "Niĩ ndĩ Wanjiku. Ndeithia na ithabu."}'
```

Free tier gives ~30k characters/month — fine for dev, not for classroom traffic.

### 2. Ollama (local / Codespaces)

Set `EXPORT_GGUF = True` in Cell 7. After it writes `mwalimu-gemma-2b-lora-gguf/`:

```bash
ollama create mwalimu -f Modelfile        # Modelfile FROM ./mwalimu-gemma-2b-lora-gguf/*.gguf
ollama run mwalimu "Nĩ ũndũ ũrĩkũ 2+2 nĩ 4?"
```

### 3. Python (Unsloth direct load)

```python
from unsloth import FastLanguageModel
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="./mwalimu-gemma-2b-lora",
    max_seq_length=1024, load_in_4bit=True,
)
FastLanguageModel.for_inference(model)
```

## Integration with the SyncSenta backend

The tutoring agent at `ai-agents/src/syncsenta_agents/agents/tutoring.py` ships in offline-stub mode (`SYNCSENTA_OFFLINE_DEMO=1`). To swap in the fine-tuned model:

1. Export GGUF (Cell 7) and load it into Ollama as `mwalimu` (above).
2. In your shell:
   ```bash
   export SYNCSENTA_OFFLINE_DEMO=0
   export OLLAMA_HOST=http://localhost:11434
   export SYNCSENTA_MODEL=mwalimu
   bash start.sh
   ```
3. Hit `POST /agents/chat` (or use the Tutor page at `localhost:5000`). The agent will now route through Mwalimu instead of the deterministic stub.

For the `$0` deployment plan (Vercel frontend + Render backend + HF Inference API), set `SYNCSENTA_LLM_PROVIDER=huggingface` and `HF_API_TOKEN=…` instead of the Ollama vars — the agent will hit the Inference API directly.

## Failure modes the fine-tune fixes

| Symptom in base Gemma | What the dataset adds |
|---|---|
| Invents Gikuyu names (e.g. *Loibor*) | 18 real Gikuyu names + dictionary anchors |
| Misreads "I'm Kikuyu" as a country | CBC dialogues that anchor identity statements |
| Loses context across turns | Multi-turn examples in Cell 3 |

## Troubleshooting

- **`OutOfMemoryError` on T4** — drop `MAX_SEQ_LEN` to 512 or `per_device_train_batch_size` to 1 (Cell 4).
- **Loss is `nan`** — confirm `fp16=True` and `bf16=False`. T4 doesn't support bf16.
- **`bitsandbytes` import fails locally** — expected; it's CUDA-only. Build the dataset in Cell 3 locally, then move to Colab for cells 2 and 4–7.
- **HF Hub push returns 401** — recreate your token at https://huggingface.co/settings/tokens with **write** scope.

## License

Apache 2.0. Authored for [SyncSenta](https://github.com/dgithinjibit/syncsenta-studio).
