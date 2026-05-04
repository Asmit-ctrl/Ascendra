# SyncSenta Notebooks

This directory contains Jupyter notebooks for training and fine-tuning AI models.

## 📓 Available Notebooks

### Fine_tune_Gikuyu_Mwalimu.ipynb
Fine-tuning notebook for the Gikuyu language educational chatbot (Mwalimu = teacher).

**Purpose:** Train a Gikuyu-speaking CBC curriculum tutor using Google Colab's FREE T4 GPU.

**Features:**
- Fine-tunes `unsloth/gemma-2b-bnb-4bit` model
- Uses LoRA + 4-bit quantization
- Trains on Gikuyu educational dialogues
- Optimized for Google Colab FREE tier
- Exports to HuggingFace Hub

**How to Use:**
1. Open in Google Colab: [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/dgithinjibit/syncsenta-studio/blob/main/notebooks/Fine_tune_Gikuyu_Mwalimu.ipynb)
2. Run all cells (requires T4 GPU - select Runtime > Change runtime type > T4 GPU)
3. Training takes ~30 minutes
4. Model is saved to HuggingFace Hub

**Requirements:**
- Google Colab account (FREE)
- HuggingFace account (FREE)
- ~30 minutes training time

**Integration:**
After training, the model can be used with:
- HuggingFace Inference API (FREE tier)
- Ollama (local deployment)
- SyncSenta Python backend

See [Development Guide](../docs/development/START_SYNCSENTA.md) for integration instructions.

## 🔧 Local Development

To run notebooks locally:

```bash
# Install Jupyter
pip install notebook

# Start Jupyter
jupyter notebook

# Or use the provided script
bash scripts/start_notebook.sh
```

## 📚 Additional Resources

- [AI Architecture Plan](../docs/architecture/AI_ARCHITECTURE_PLAN.md)
- [Student Chatbot Architecture](../docs/architecture/STUDENT_CHATBOT_ARCHITECTURE.md)
- [Unsloth Documentation](https://github.com/unslothai/unsloth)
- [HuggingFace Hub](https://huggingface.co/)

## 💡 Tips

- **Use Colab FREE tier** - T4 GPU is sufficient
- **Save checkpoints** - Training can be interrupted
- **Test locally first** - Run data prep cells before uploading to Colab
- **Monitor costs** - HuggingFace Inference API has FREE tier limits

## 🤝 Contributing

Have improvements to the training process? See [CONTRIBUTING.md](../CONTRIBUTING.md).
