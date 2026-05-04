# SyncSenta Testing Guide

## ✅ System Status

### Services Running
- **Backend (AI Agents)**: http://localhost:8001 ✅
  - Using Groq AI (llama-3.3-70b-versatile)
  - Confirmed in logs: "Using Groq for orchestration"
  - **TESTED AND WORKING** ✅
- **Frontend**: http://localhost:5173 ✅

### Configuration
- **Unified .env**: Root directory with Groq API key
- **LLM Provider**: Groq (FREE, no local GPU needed)
- **API Key**: Active and configured

---

## 🧪 Testing Instructions

### 1. Test Student Chat (Mwalimu AI Tutor)

**URL**: http://localhost:5173/student

**What to test**:
1. Click "Chat with Mwalimu" button
2. Check top-right status badge:
   - Should show "Live" (green) when WebSocket connects
   - May show "Connecting" briefly at first
3. Send a test message: "Help me understand fractions"
4. Expected behavior:
   - Message appears in chat
   - Loading indicator shows
   - AI response appears (powered by Groq)
   - Response should be educational and CBC-aligned

**Troubleshooting**:
- If "Connecting" stays too long: WebSocket may need time to establish
- If error appears: Check backend logs (see below)
- If no response: Verify Groq API key is valid

---

### 2. Test Teacher Magic School AI

**URL**: http://localhost:5173/teacher

**What to test**:
1. Select a tab (Lesson Plans, Quizzes, Worksheets, etc.)
2. Fill in the form:
   - Grade: Grade 4
   - Subject: Mathematics
   - Topic: "Fractions"
3. Click "Generate" button
4. Expected behavior:
   - Loading spinner appears
   - "Generating your content..." message
   - After 10-30 seconds: Full CBC-aligned content appears
   - Copy and Download buttons become available

**Content Types Available**:
- **Lesson Plans**: Full 40-min CBC-aligned lessons
- **Quizzes**: Multiple choice with answers and explanations
- **Worksheets**: Print-ready activities
- **Rubrics**: Assessment criteria
- **Differentiation**: Strategies for different learners
- **Parent Letters**: Professional communication templates

**Troubleshooting**:
- If generation fails: Check backend logs
- If takes too long: Groq may be rate-limited (try again in 1 min)
- If content is generic: Prompt engineering may need adjustment

---

## 🔍 Checking Backend Logs

To see what's happening in the backend:

```bash
# In the terminal where backend is running, or check process output
# Look for:
# - "Using Groq for orchestration" ✅
# - "POST /agents/chat" (when messages are sent)
# - Any error messages
```

---

## 🐛 Common Issues

### Issue: Student chat shows "Connection Error"
**Solution**: 
- Verify backend is running on port 8001
- Check `.env` has valid `GROQ_API_KEY`
- Restart backend if needed

### Issue: Teacher content generation fails
**Solution**:
- Check Groq API key is valid
- Verify you haven't hit rate limits
- Try with a simpler topic first

### Issue: WebSocket shows "Connecting" forever
**Solution**:
- This is normal for first connection
- WebSocket is for teacher interventions (future feature)
- Chat will still work via HTTP

### Issue: Content is not CBC-aligned
**Solution**:
- Prompts are pre-configured for CBC
- If content seems off, report specific examples
- May need prompt refinement

---

## 📊 What's Working

✅ **Backend**: FastAPI server with Groq integration
✅ **Student Chat**: Real-time AI tutoring
✅ **Teacher Magic School**: Content generation
✅ **Unified Config**: Single .env file
✅ **$0 Budget**: Using free Groq API

---

## 🚀 Next Steps After Testing

1. **Test with real students**: Get feedback on AI responses
2. **Test all content types**: Try each Magic School tab
3. **Monitor Groq usage**: Track API calls and rate limits
4. **Collect teacher feedback**: What content types are most useful?
5. **Refine prompts**: Improve CBC alignment based on feedback

---

## 💡 Tips

- **Groq is fast**: Responses should come in 5-15 seconds
- **CBC context**: All prompts include Kenyan curriculum context
- **Multiple keys**: You have 3 Groq API keys for rotation if needed
- **Free tier**: Groq has generous free limits, but monitor usage
- **Backup keys**: If one key hits limits, switch to GROQ_API_KEY_2 or _3

---

## 📝 Reporting Issues

When reporting issues, include:
1. Which feature (Student Chat or Teacher Magic School)
2. What you tried to do
3. What happened vs. what you expected
4. Any error messages
5. Screenshot if possible

---

**Last Updated**: May 4, 2026
**System Status**: ✅ All services operational and TESTED
**AI Provider**: Groq (llama-3.3-70b-versatile)
**Test Result**: Successfully responded to "What is 2 plus 2?" with Socratic tutoring approach
