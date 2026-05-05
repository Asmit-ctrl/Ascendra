# SyncSenta Education OS

**AI-Powered Education Platform for Kenyan CBC Curriculum**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/syncsenta)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Groq](https://img.shields.io/badge/AI-Groq-blue)](https://groq.com)

## 🎯 Overview

SyncSenta is a **$0/month** AI education platform designed for Kenyan teachers and students, featuring:

- **🎓 Student Chat**: AI tutor (Mwalimu) for homework help and concept explanations
- **✨ Teacher Magic School**: Generate CBC-aligned lesson plans, quizzes, worksheets, and rubrics
- **🇰🇪 Kenyan Context**: All content aligned with CBC curriculum and local culture
- **💰 Free Forever**: Powered by Groq AI (free tier) + Vercel (free hosting)

## 🚀 Quick Start

### Deploy to Vercel (5 minutes)

1. **Get Groq API Key** (free): https://console.groq.com/keys
2. **Click Deploy**: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
3. **Add Environment Variable**:
   ```bash
   GROQ_API_KEY=your_groq_api_key_here
   ```
4. **Done!** Your app is live at `https://your-app.vercel.app`

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/yourusername/syncsenta.git
cd syncsenta

# 2. Set up environment
cp .env.example .env
# Add your GROQ_API_KEY to .env

# 3. Start frontend
cd studio
npm install
npm run dev  # http://localhost:5173

# 4. Start backend (new terminal)
cd ai-agents
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn syncsenta_agents.api.server:app --reload --port 8001
```

Visit:
- **Student Chat**: http://localhost:5173/student
- **Teacher Magic School**: http://localhost:5173/teacher

## 📁 Project Structure

```
syncsenta/
├── studio/              # Frontend (Next.js + TypeScript)
│   ├── src/
│   │   ├── app/        # Pages (student, teacher)
│   │   ├── components/ # React components
│   │   └── data/       # CBC curriculum data
│   └── package.json
│
├── ai-agents/          # Backend (FastAPI + Python)
│   ├── src/syncsenta_agents/
│   │   ├── api/       # API endpoints
│   │   ├── agents/    # AI agents (tutoring, assessment)
│   │   ├── orchestrator/ # Multi-agent orchestration
│   │   └── inference/ # Groq AI client
│   └── pyproject.toml
│
├── docs/               # All documentation
│   ├── deployment/    # Deployment guides
│   ├── development/   # Development setup
│   ├── status/        # Implementation status
│   └── architecture/  # System design
│
├── scripts/            # Build and utility scripts
├── .kiro/              # Kiro AI specs and configuration
├── .env                # Environment variables (gitignored)
└── vercel.json         # Vercel deployment config
```

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for detailed documentation.

## 🎓 Features

### For Students

- **Chat with Mwalimu**: AI tutor for homework help
- **CBC-Aligned**: Answers follow Kenyan curriculum
- **Kenyan Context**: Uses local examples (shillings, matatu, ugali)
- **Real-time**: Instant responses powered by Groq AI

### For Teachers

- **Lesson Plans**: Generate CBC-aligned lesson plans
- **Quizzes**: Create quizzes with answers and explanations
- **Worksheets**: Generate activities and exercises
- **Rubrics**: Create assessment rubrics
- **Differentiation**: Strategies for different learning levels
- **Parent Letters**: Communication templates

## 🛠️ Technology Stack

| Component | Technology | Cost |
|-----------|-----------|------|
| Frontend | Next.js 14 + TypeScript | Free |
| Backend | Python FastAPI | Free |
| AI | Groq (llama-3.3-70b) | Free |
| Hosting | Vercel Edge Network | Free |
| **Total** | | **$0/month** |

## 🔧 Configuration

### Environment Variables

```bash
# AI Configuration (REQUIRED)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
LLM_PROVIDER=groq

# Frontend URLs
NEXT_PUBLIC_AI_AGENTS_URL=http://localhost:8001

# Development
ENVIRONMENT=development
DEBUG=true
```

### Groq API Keys

You can rotate between multiple Groq API keys:

```bash
GROQ_API_KEY=gsk_primary_key_here
GROQ_API_KEY_2=gsk_backup_key_1_here
GROQ_API_KEY_3=gsk_backup_key_2_here
```

## 📚 Documentation

- **[Project Structure](PROJECT_STRUCTURE.md)** - Complete directory structure
- **[Vercel Deployment Guide](docs/deployment/VERCEL_DEPLOYMENT.md)** - Step-by-step deployment
- **[Groq Setup Guide](docs/development/GROQ_SETUP.md)** - AI configuration
- **[Adaptive Learning Status](docs/status/ADAPTIVE_LEARNING_STATUS.md)** - Current implementation status
- **[Architecture Overview](docs/architecture/)** - System design
- **[Development Guide](docs/development/)** - Contributing

## 🧪 Testing

```bash
# Frontend tests
cd studio
npm test

# Backend tests
cd ai-agents
pytest

# E2E tests
npm run test:e2e
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Groq** - Free AI inference
- **Vercel** - Free hosting
- **KICD** - CBC curriculum standards
- **Kenyan Teachers** - Feedback and testing

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/syncsenta/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/syncsenta/discussions)
- **Email**: support@syncsenta.com

## 🗺️ Roadmap

- [x] Student AI tutor
- [x] Teacher Magic School
- [x] CBC curriculum alignment
- [x] Groq AI integration
- [x] Vercel deployment
- [ ] User authentication
- [ ] Progress tracking
- [ ] Parent dashboard
- [ ] Mobile app

## 💡 Why SyncSenta?

Traditional education platforms are expensive and not aligned with Kenyan curriculum. SyncSenta is:

- **Free**: $0/month forever
- **Local**: CBC-aligned with Kenyan context
- **Fast**: Powered by Groq's lightning-fast AI
- **Scalable**: Vercel Edge Network handles traffic spikes
- **Open Source**: Community-driven development

---

**Made with ❤️ for Kenyan Education**

[Website](https://syncsenta.com) • [Twitter](https://twitter.com/syncsenta) • [LinkedIn](https://linkedin.com/company/syncsenta)
