# Mwalimu AI - Quick Start Guide

**Get up and running in 5 minutes!**

---

## 🚀 Prerequisites

- **Node.js:** v18+ (for frontend)
- **Rust:** 1.70+ (for backend)
- **PostgreSQL:** 14+ (for database)
- **Git:** For version control

---

## 📦 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <repository-name>
```

---

### 2. Setup Backend (Rust)

```bash
cd backend/syncsenta-backend

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Required Environment Variables:**

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/syncsenta

# JWT
JWT_SECRET=your-secret-key-here

# mem0 (Long-term memory)
MEM0_API_KEY=your-mem0-api-key
MEM0_ORG_ID=your-mem0-org-id
MEM0_PROJECT_ID=your-mem0-project-id

# LLM (for content generation)
LLM_API_KEY=your-openai-or-groq-key
LLM_MODEL=gpt-4
LLM_BASE_URL=https://api.openai.com/v1

# ElevenLabs (for TTS)
ELEVENLABS_API_KEY=your-elevenlabs-key
```

**Run Database Migrations:**

```bash
# Install sqlx-cli if not already installed
cargo install sqlx-cli --no-default-features --features postgres

# Run migrations
sqlx migrate run
```

**Start Backend Server:**

```bash
cargo run --release
```

Backend will run on `http://localhost:8080`

---

### 3. Setup Frontend (Next.js)

```bash
cd studio

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local
nano .env.local
```

**Required Environment Variables:**

```bash
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_BACKEND_WS_URL=ws://localhost:8080/api/v1/mvp/ws

# Optional: Analytics, monitoring, etc.
```

**Start Frontend Server:**

```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

---

## 🎓 Access the Application

### Student Interface

1. Navigate to `http://localhost:3000/student`
2. Login with student credentials
3. Explore:
   - **Overview Tab:** Learning progress, assignments, classes
   - **Achievements Tab:** Points, levels, badges, streaks
   - **Learning Map Tab:** Competency tree with mastery tracking
4. Click "Start Chat Session" to interact with Mwalimu AI

### Teacher Interface

1. Navigate to `http://localhost:3000/teacher`
2. Login with teacher credentials
3. Explore:
   - **Chat History Tab:** View student conversations
   - **AI Agents Tab:** Monitor multi-agent activity
   - **Analytics Tab:** Student performance insights
   - **Magic School AI Tab:** Generate lessons, quizzes, reports

---

## 🧪 Test with Sample Data

### Create Test Student

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "password123",
    "name": "Test Student",
    "role": "student",
    "grade": "Grade 5"
  }'
```

### Create Test Teacher

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@test.com",
    "password": "password123",
    "name": "Test Teacher",
    "role": "teacher"
  }'
```

---

## 🎮 Try the Features

### Student Features

1. **Gamification:**
   - Go to Achievements tab
   - View points, level, streak, badges
   - See class ranking

2. **Competency Map:**
   - Go to Learning Map tab
   - Expand Mathematics → Fractions
   - Click practice button on a competency

3. **Real-Time Feedback:**
   - Start a chat session
   - Answer a question
   - See ✓ correct, 🎯 hint, or 💡 explanation feedback

4. **Language Selector:**
   - Click language dropdown in header
   - Switch between English, Kiswahili, Kikuyu

### Teacher Features

1. **Generate Lesson Plan:**
   - Go to Magic School AI tab
   - Select "Lesson" tab
   - Fill in: Topic, Grade, Subject, Duration
   - Click "Generate Lesson Plan"
   - Download or copy the result

2. **Generate Quiz:**
   - Select "Quiz" tab
   - Fill in: Topic, Grade, Subject, Difficulty, Questions
   - Click "Generate Quiz"
   - Download or copy the result

3. **Generate Report:**
   - Select "Report" tab
   - Enter Student ID
   - Select Report Type and Period
   - Click "Generate Report"
   - Download or copy the result

---

## 🔧 Troubleshooting

### Backend won't start

**Error:** `Database connection failed`

**Solution:**
1. Check PostgreSQL is running: `sudo systemctl status postgresql`
2. Verify DATABASE_URL in `.env`
3. Run migrations: `sqlx migrate run`

---

**Error:** `Port 8080 already in use`

**Solution:**
1. Kill existing process: `lsof -ti:8080 | xargs kill -9`
2. Or change port in `.env`: `PORT=8081`

---

### Frontend won't start

**Error:** `Module not found`

**Solution:**
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again

---

**Error:** `API connection failed`

**Solution:**
1. Check backend is running on `http://localhost:8080`
2. Verify `NEXT_PUBLIC_API_URL` in `.env.local`
3. Check CORS settings in backend

---

### WebSocket not connecting

**Error:** `WebSocket connection failed`

**Solution:**
1. Check `NEXT_PUBLIC_BACKEND_WS_URL` in `.env.local`
2. Verify WebSocket endpoint is running: `ws://localhost:8080/api/v1/mvp/ws`
3. Check browser console for errors

---

### Content generation not working

**Error:** `LLM API error`

**Solution:**
1. Verify `LLM_API_KEY` in backend `.env`
2. Check API quota/credits
3. Try different model: `LLM_MODEL=gpt-3.5-turbo`

---

## 📚 Documentation

- **MVP Features:** `studio/MVP_FEATURES.md`
- **Integration Guide:** `studio/INTEGRATION_GUIDE.md`
- **Implementation Summary:** `IMPLEMENTATION_SUMMARY.md`
- **Design System:** `.kiro/skills/mwalimu-ui-ux-design.md`
- **Workflow:** `.kiro/steering/mwalimu-design-workflow.md`

---

## 🆘 Getting Help

### Check Logs

**Backend:**
```bash
cd backend/syncsenta-backend
RUST_LOG=debug cargo run
```

**Frontend:**
```bash
cd studio
npm run dev
```

### Common Issues

1. **Database connection:** Check PostgreSQL is running and credentials are correct
2. **API errors:** Check backend logs for detailed error messages
3. **WebSocket issues:** Verify WebSocket URL and backend is running
4. **Content generation:** Check LLM API key and quota

---

## 🎯 Next Steps

1. **Explore the codebase:**
   - `studio/src/components/student/` - Student components
   - `studio/src/components/teacher/` - Teacher components
   - `backend/syncsenta-backend/src/services/` - Backend services

2. **Read the documentation:**
   - MVP Features guide
   - Integration guide
   - Design system

3. **Implement backend services:**
   - Gamification service
   - Competency tracking service
   - Content generation service

4. **Deploy to production:**
   - Setup production database
   - Configure environment variables
   - Deploy backend and frontend
   - Setup monitoring and logging

---

## 🚀 Production Deployment

### Backend (Rust)

```bash
# Build release binary
cargo build --release

# Run with production settings
./target/release/syncsenta-backend
```

### Frontend (Next.js)

```bash
# Build production bundle
npm run build

# Start production server
npm start
```

### Docker (Optional)

```bash
# Build and run with Docker Compose
docker-compose up -d
```

---

## 🎉 You're Ready!

You now have Mwalimu AI running locally with:
- ✅ Student gamification and competency tracking
- ✅ Real-time feedback (Suzuki method)
- ✅ Language support (English, Kiswahili, Kikuyu)
- ✅ Teacher content generation (Magic School AI)
- ✅ Live WebSocket updates
- ✅ CBC-aligned curriculum

**Happy coding!** 🚀

---

**Need help?** Check the documentation or open an issue on GitHub.
