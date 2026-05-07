# Mwalimu AI - Self-Learning EdTech Platform for Kenya

**AI-Powered Education Platform with Self-Learning Pedagogical Intelligence**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/dgithinjibit/Ascendra)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Groq](https://img.shields.io/badge/AI-Groq-blue)](https://groq.com)

## 🎯 What is Mwalimu AI?

Mwalimu AI is Kenya's first **self-learning AI tutor** that gets smarter with every teacher interaction. Unlike generic AI tutors, Mwalimu AI:

- **🇰🇪 Culturally Grounded**: Uses matatu, shamba, M-Pesa, and ugali in examples
- **📚 CBC-Aligned**: Every response follows Kenya's Competency-Based Curriculum
- **🧠 Self-Learning**: Learns from teacher feedback to improve over time
- **🎓 Adaptive**: Adjusts scaffolding based on student behavior (erasures, dwell time, attempts)
- **💰 Free Forever**: Powered by Groq AI (free tier) + Vercel (free hosting)

### The Competitive Moat

By 2030, Mwalimu AI will have **1,000+ pedagogical rules** learned from Kenyan teachers - cultural knowledge that competitors cannot replicate:
- Which examples work in Nairobi vs rural areas
- How to explain fractions using matatu fares
- When to use shamba examples for measurement
- Misconception patterns unique to Kenyan students

**This is defensible IP worth millions.**

## 🚀 Quick Start (5 Minutes)

### Option 1: Deploy to Production (Vercel + Render + Supabase)

1. **Get API Keys** (all free):
   - Groq: https://console.groq.com/keys
   - Supabase: https://app.supabase.com (create project)

2. **Deploy Frontend** (Vercel):
   ```bash
   cd studio
   vercel --prod
   ```
   Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_AI_AGENTS_URL`

3. **Deploy Backend** (Render):
   - Push code to GitHub
   - Connect to Render
   - Render auto-detects `ai-agents/render.yaml`
   - Add environment variables:
     - `GROQ_API_KEY`
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_KEY`

4. **Setup Database** (Supabase):
   - Run SQL migration: `ai-agents/src/syncsenta_agents/db/teacher_feedback_schema.sql`
   - Verify 6 tables created

**Total cost: $7/month** (Render Starter) for 100+ users

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

### Option 2: Local Development

```bash
# 1. Clone repository
git clone https://github.com/dgithinjibit/Ascendra.git
cd Ascendra

# 2. Set up environment
cp .env.example .env
# Add your GROQ_API_KEY to .env

# 3. Start backend
cd ai-agents
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 -m syncsenta_agents.main  # http://localhost:8001

# 4. Start frontend (new terminal)
cd studio
npm install
npm run dev  # http://localhost:3000
```

Visit:
- **Student Chat**: http://localhost:3000/student
- **Teacher Dashboard**: http://localhost:3000/teacher

## 🎓 Key Features

### For Students

**Mwalimu AI Tutor**
- Chat interface with voice input/output
- Culturally-relevant examples (matatu, shamba, M-Pesa)
- Adaptive scaffolding based on behavior
- Real-time teacher interventions
- Works on mobile and desktop

**Example Interaction:**
```
Student: "I don't understand fractions"

Mwalimu: "Karibu! Let me explain using something you know. 
Imagine you have one chapati and want to share it equally 
with your friend. If you cut it into 2 equal pieces, each 
piece is 1/2 (one half) of the chapati..."
```

### For Teachers

**Real-Time Monitoring**
- Live student activity dashboard
- AI decision transparency (which rules fired, why)
- Intervention center (send messages to students)
- Analytics and progress tracking

**Teacher Feedback Loop** (Self-Learning System)
- Review every AI decision
- Mark as "Helpful" or "Not Helpful"
- Propose new pedagogical rules
- Vote on community-proposed rules
- System learns and improves automatically

**Magic School AI**
- Generate CBC-aligned lesson plans
- Create quizzes with answers
- Generate worksheets and activities
- Create assessment rubrics
- Differentiation strategies

## 🧠 Self-Learning Intelligence

### How It Works

```
1. Student asks question
   ↓
2. AI makes decision (with reasoning)
   ↓
3. Decision logged to database
   ↓
4. Teacher reviews and provides feedback
   ↓
5. System detects patterns (10+ feedback, 70%+ success)
   ↓
6. Proposes new rule: "use_matatu_for_nairobi_ratios"
   ↓
7. Teachers vote on proposal
   ↓
8. A/B testing (50% get new rule, 50% get old)
   ↓
9. If successful (88% vs 65%), activate rule
   ↓
10. All future students benefit
```

### Neuro-Symbolic Reasoning

Mwalimu AI combines:
- **Neural**: LLM (Groq Llama 3.3 70B) for natural language
- **Symbolic**: Rule engine for explainable decisions

Every AI response includes:
- Which pedagogical rules fired
- Why those rules fired
- Confidence scores
- Recommended scaffolding level
- Cultural examples used

### MeTTa Dynamic Rules

Rules are **data, not code**:
- Stored in database (not hardcoded)
- Can be added/removed without deployment
- Learned from teacher feedback patterns
- Exported for version control
- A/B tested before activation

**Example Rule:**
```json
{
  "rule_name": "use_matatu_for_nairobi_ratios",
  "conditions": {
    "region": "Nairobi",
    "competency": "MATH.G4.FRACTIONS",
    "topic": "ratios"
  },
  "action": "Use matatu fare examples (50 bob, 100 bob)",
  "confidence": 0.92,
  "times_applied": 156,
  "success_rate": 0.88
}
```

## 📊 Technology Stack

| Component | Technology | Purpose | Cost |
|-----------|-----------|---------|------|
| **Frontend** | Next.js 14 + TypeScript | Student/Teacher UI | Free (Vercel) |
| **Backend** | Python FastAPI | API + AI Agents | $7/mo (Render) |
| **Database** | Supabase (PostgreSQL) | Teacher feedback, rules | Free tier |
| **AI** | Groq (Llama 3.3 70B) | Natural language | Free tier |
| **Dataset** | Kenya-LLM-Bench-v2 | Few-shot examples | N/A |
| **Reasoning** | Neuro-Symbolic Engine | Explainable AI | N/A |
| **Rules** | MeTTa Dynamic Storage | Self-learning | N/A |

**Total: $7/month** for 100+ users

## 📁 Project Structure

```
mwalimu-ai/
├── studio/                    # Frontend (Next.js)
│   ├── src/
│   │   ├── app/              # Pages (student, teacher)
│   │   ├── components/
│   │   │   ├── student/      # Student chat UI
│   │   │   └── teacher/      # Teacher dashboard
│   │   └── data/curriculum/  # CBC curriculum data
│   └── package.json
│
├── ai-agents/                 # Backend (Python)
│   ├── src/syncsenta_agents/
│   │   ├── api/              # FastAPI endpoints
│   │   ├── agents/           # AI agents (tutoring, assessment)
│   │   ├── reasoning/        # Neuro-symbolic engine
│   │   │   ├── pedagogical_rules.py
│   │   │   ├── knowledge_tracer.py
│   │   │   ├── misconception_detector.py
│   │   │   ├── metta_engine.py
│   │   │   └── few_shot_examples.py
│   │   ├── db/               # Database & logging
│   │   │   ├── decision_logger.py
│   │   │   └── teacher_feedback_schema.sql
│   │   └── jobs/             # Scheduled jobs
│   │       └── rule_learning_job.py
│   ├── data/training/        # Kenya-LLM-Bench-v2 dataset
│   │   ├── kenya-llm-bench-v2-complete.jsonl (1,020 examples)
│   │   └── splits/           # train/val/test
│   └── requirements.txt
│
├── docs/                      # Documentation
├── DEPLOYMENT.md              # Production deployment guide
├── HANDOFF_TO_SENIOR_DEV.md  # Technical handoff
└── README.md                  # This file
```

## 🔧 Configuration

### Environment Variables

**Backend (Render):**
```bash
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
FRONTEND_URL=https://mwalimu-ai.vercel.app
```

**Frontend (Vercel):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_AI_AGENTS_URL=https://mwalimu-ai-agents.onrender.com
```

## 📚 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide (Vercel + Render + Supabase)
- **[HANDOFF_TO_SENIOR_DEV.md](HANDOFF_TO_SENIOR_DEV.md)** - Technical architecture and handoff
- **[ai-agents/docs/TEACHER_FEEDBACK_LOOP.md](ai-agents/docs/TEACHER_FEEDBACK_LOOP.md)** - Self-learning system architecture
- **[ai-agents/docs/METTA_INTEGRATION.md](ai-agents/docs/METTA_INTEGRATION.md)** - MeTTa dynamic rules guide
- **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)** - Complete directory structure

## 🧪 Testing

```bash
# Backend tests
cd ai-agents
pytest tests/test_neuro_symbolic.py -v

# Run demo
python examples/neuro_symbolic_demo.py

# Test production flow
# 1. Student asks question → AI responds
# 2. Check ai_decisions table → Decision logged
# 3. Teacher opens dashboard → Sees pending decision
# 4. Teacher provides feedback → Feedback recorded
# 5. Next day: Rule learning job runs → Proposes new rules
```

## 📈 Scaling Plan

| Users | Vercel | Render | Supabase | Groq | Total |
|-------|--------|--------|----------|------|-------|
| 0-100 | Free | $7/mo | Free | Free | **$7/mo** |
| 100-1K | $20/mo | $25/mo | $25/mo | Free | **$70/mo** |
| 1K+ | $20/mo | $85/mo | $25/mo | Free | **$130/mo** |

Groq remains free even at scale (30 req/min free tier).

## 🎯 Competitive Advantage

### vs. MagicSchool AI
- ❌ MagicSchool: Generic US/UK examples
- ✅ Mwalimu AI: Kenyan cultural context (matatu, shamba, M-Pesa)

### vs. Synthesis Tutor
- ❌ Synthesis: Socratic method, no curriculum alignment
- ✅ Mwalimu AI: CBC-aligned, culturally grounded

### vs. DreamBox
- ❌ DreamBox: Adaptive but generic content
- ✅ Mwalimu AI: Adaptive + culturally relevant + self-learning

### By 2030
- **1,000+ learned rules** from Kenyan teachers
- **100% cultural relevance** (impossible to replicate without our data)
- **Defensible IP** worth millions

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Groq** - Free AI inference (30 req/min)
- **Vercel** - Free hosting (100 GB bandwidth)
- **Supabase** - Free database (500 MB)
- **KICD** - CBC curriculum standards
- **Kenyan Teachers** - Feedback and testing

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/dgithinjibit/Ascendra/issues)
- **Email**: team@syncsenta.ke
- **Deployment Help**: See [DEPLOYMENT.md](DEPLOYMENT.md)

## 🗺️ Roadmap

### ✅ Completed (MVP)
- [x] Student AI tutor with cultural context
- [x] Teacher dashboard with real-time monitoring
- [x] Neuro-symbolic reasoning engine
- [x] Teacher feedback loop (self-learning)
- [x] MeTTa dynamic rules system
- [x] Kenya-LLM-Bench-v2 dataset (1,020 examples)
- [x] Few-shot prompting integration
- [x] Mobile-responsive UI
- [x] Production deployment (Vercel + Render + Supabase)

### 🚧 In Progress
- [ ] User authentication (Supabase Auth)
- [ ] Progress tracking and analytics
- [ ] Rule A/B testing automation
- [ ] Parent dashboard

### 🔮 Future
- [ ] Mobile app (React Native)
- [ ] Offline mode
- [ ] Voice-first interface
- [ ] Multi-language support (Kiswahili, Kikuyu)
- [ ] Integration with Kenya Education Cloud

## 💡 Why Mwalimu AI?

Traditional education platforms are expensive and not aligned with Kenyan curriculum. Mwalimu AI is:

- **Free**: $7/month for 100+ users (vs $50+/month for competitors)
- **Local**: CBC-aligned with Kenyan cultural context
- **Fast**: Powered by Groq's lightning-fast AI (sub-second responses)
- **Scalable**: Vercel Edge Network handles traffic spikes
- **Self-Learning**: Gets smarter with every teacher interaction
- **Open Source**: Community-driven development

## 🏆 Success Metrics

### Week 1
- [ ] 10+ AI decisions logged
- [ ] 5+ teacher feedback entries
- [ ] System deployed and stable

### Month 1
- [ ] 100+ AI decisions
- [ ] 50+ feedback entries
- [ ] 50%+ feedback rate
- [ ] First proposed rule

### Month 3
- [ ] 500+ decisions
- [ ] 5+ learned rules active
- [ ] 3+ cultural patterns identified

### Year 1
- [ ] 10,000+ decisions
- [ ] 100+ learned rules
- [ ] Self-improving system operational

---

**🇰🇪 Built for Kenya, by Kenyans, with Kenyan teachers.**

[Website](https://syncsenta.com) • [GitHub](https://github.com/dgithinjibit/Ascendra) • [LinkedIn](https://linkedin.com/company/syncsenta)
