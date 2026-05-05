# SyncSenta Production-Ready Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SyncSenta Production                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐          ┌──────────────────┐         │
│  │   Frontend       │          │   Backend        │         │
│  │  (Next.js)       │◄────────►│  (FastAPI)       │         │
│  │                  │          │                  │         │
│  │ ┌──────────────┐ │          │ ┌──────────────┐ │         │
│  │ │ Student Chat │ │          │ │ Orchestrator │ │         │
│  │ └──────────────┘ │          │ └──────────────┘ │         │
│  │                  │          │        │         │         │
│  │ ┌──────────────┐ │          │ ┌──────┴──────┐  │         │
│  │ │ Teacher      │ │          │ │   Agents    │  │         │
│  │ │ Magic School │ │          │ ├─────────────┤  │         │
│  │ └──────────────┘ │          │ │ Socratic    │  │         │
│  │                  │          │ │ Assessment  │  │         │
│  │ ┌──────────────┐ │          │ │ Magic School│  │         │
│  │ │ Agent Monitor│ │          │ └─────────────┘  │         │
│  │ └──────────────┘ │          │        │         │         │
│  └──────────────────┘          │ ┌──────▼──────┐  │         │
│                                │ │ Groq AI     │  │         │
│                                │ │ (llama-3.3) │  │         │
│                                │ └─────────────┘  │         │
│                                └──────────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
syncsenta/
├── studio/                          # Frontend (Next.js)
│   ├── src/
│   │   ├── app/
│   │   │   ├── student/            # Student pages
│   │   │   │   ├── chat/
│   │   │   │   ├── journey/
│   │   │   │   └── page.tsx
│   │   │   ├── teacher/            # Teacher pages
│   │   │   │   ├── page.tsx
│   │   │   │   └── exams/
│   │   │   ├── api/                # API routes
│   │   │   │   ├── agents/
│   │   │   │   └── mwalimu/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── student/            # Student components
│   │   │   ├── teacher/            # Teacher components
│   │   │   └── ui/                 # UI components
│   │   ├── data/
│   │   │   └── curriculum/         # CBC curriculum data
│   │   ├── lib/
│   │   │   ├── groq-client.ts      # Groq integration
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │   └── styles/
│   ├── public/
│   │   ├── favicon.svg             # Circular SyncSenta logo
│   │   └── ...
│   └── package.json
│
├── ai-agents/                       # Backend (Python FastAPI)
│   ├── src/syncsenta_agents/
│   │   ├── api/
│   │   │   ├── server.py           # FastAPI app
│   │   │   └── routes.py
│   │   ├── agents/
│   │   │   ├── socratic_tutor.py   # Socratic Tutor Agent
│   │   │   ├── assessment.py       # Assessment Agent
│   │   │   ├── magic_school.py     # Magic School Agent
│   │   │   └── base.py             # Base Agent class
│   │   ├── orchestrator/
│   │   │   ├── workflow.py         # LangGraph orchestrator
│   │   │   └── router.py           # Request routing
│   │   ├── core/
│   │   │   ├── models.py           # Data models
│   │   │   ├── config.py
│   │   │   └── logging.py
│   │   └── monitoring/
│   │       ├── agent_monitor.py    # Agent monitoring
│   │       ├── metrics.py          # Metrics collection
│   │       └── logger.py           # Structured logging
│   ├── requirements.txt
│   └── pyproject.toml
│
├── docs/                            # Documentation
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── AGENTS.md
│   └── DEPLOYMENT.md
│
├── scripts/                         # Utility scripts
│   ├── cleanup.sh
│   └── setup.sh
│
├── .env                             # Configuration
├── .env.example
├── vercel.json                      # Vercel config
├── README.md
└── .gitignore
```

## Agent Design

### Base Agent Class
```python
class Agent:
    def __init__(self, name: str):
        self.name = name
        self.state = AgentState()
        self.monitor = AgentMonitor(name)
    
    async def process(self, request: Request) -> Response:
        # Log incoming request
        self.monitor.log_request(request)
        
        # Analyze context
        context = self.analyze_context(request)
        
        # Make decision
        decision = await self.decide(context)
        
        # Execute action
        response = await self.execute(decision)
        
        # Update state
        self.state.update(response)
        
        # Log outcome
        self.monitor.log_response(response)
        
        return response
```

### Socratic Tutor Agent
```python
class SocraticTutorAgent(Agent):
    def __init__(self):
        super().__init__("socratic_tutor")
        self.student_profiles = {}  # Track student progress
    
    async def decide(self, context):
        # Analyze student's question
        # Check student's history
        # Decide: answer, hint, or guiding question
        # Return decision with reasoning
```

### Assessment Agent
```python
class AssessmentAgent(Agent):
    def __init__(self):
        super().__init__("assessment")
        self.quiz_history = {}  # Track quiz performance
    
    async def decide(self, context):
        # Analyze request (generate quiz, grade, feedback)
        # Check student's weak areas
        # Generate targeted assessment
        # Return assessment with metadata
```

### Teacher Magic School Agent
```python
class MagicSchoolAgent(Agent):
    def __init__(self):
        super().__init__("magic_school")
        self.content_history = {}  # Track generated content
    
    async def decide(self, context):
        # Analyze teacher's request
        # Check teacher's preferences
        # Generate content (lesson plan, quiz, rubric, etc.)
        # Return content with metadata
```

## Agent Monitoring

### Metrics Collected
- Request count per agent
- Response time per agent
- Error rate per agent
- User engagement metrics
- Content generation metrics

### Monitoring Dashboard
- Real-time agent activity
- Performance metrics
- Error logs
- User interactions

## UI Components

### Student Chat
```tsx
<StudentChat>
  <MessageList>
    <Message role="user" content="..." />
    <Message role="agent" agent="socratic_tutor" content="..." />
    <AgentThinking agent="assessment" />
  </MessageList>
  <InputBox />
</StudentChat>
```

### Teacher Magic School
```tsx
<MagicSchool>
  <ContentGenerator />
  <ContentHistory />
  <ContentPreview />
  <ExportButton />
</MagicSchool>
```

### Agent Monitor
```tsx
<AgentMonitor>
  <ActivityLog />
  <PerformanceMetrics />
  <ErrorLog />
</AgentMonitor>
```

## Favicon Design

### Circular SyncSenta Logo
- Perfect circle (SVG)
- Blue gradient background
- Book symbol (education)
- Neural network (AI)
- White foreground
- Scalable to any size

## Data Flow

### Student Chat Flow
```
User Input
    ↓
Frontend (student/chat)
    ↓
Backend API (/api/agents/chat)
    ↓
Orchestrator (route request)
    ↓
Socratic Tutor Agent
    ├─ Analyze context
    ├─ Check student history
    ├─ Decide action
    └─ Call Groq AI
    ↓
Response with agent metadata
    ↓
Frontend (display with agent info)
```

### Teacher Magic School Flow
```
Teacher Request
    ↓
Frontend (teacher/page)
    ↓
Backend API (/api/agents/generate)
    ↓
Orchestrator (route to Magic School)
    ↓
Magic School Agent
    ├─ Analyze request
    ├─ Check teacher preferences
    ├─ Generate content
    └─ Call Groq AI
    ↓
Content with metadata
    ↓
Frontend (preview & export)
```

## State Management

### Agent State
```python
class AgentState:
    user_id: str
    session_id: str
    conversation_history: List[Message]
    user_profile: Dict  # Student/teacher info
    context: Dict      # Current context
    metadata: Dict     # Agent-specific data
```

### Monitoring State
```python
class MonitoringState:
    agent_name: str
    request_count: int
    response_time_avg: float
    error_count: int
    last_activity: datetime
    active_sessions: int
```

## Error Handling

- Graceful fallback if Groq fails
- Retry logic with exponential backoff
- Error logging and monitoring
- User-friendly error messages

## Performance Considerations

- Cache curriculum data
- Optimize Groq API calls
- Minimize state storage
- Efficient monitoring queries
