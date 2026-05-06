# Design Document: Interactive Sandbox

## Overview

The Interactive Sandbox is a Canvas-based interactive learning environment that replaces passive multiple-choice assessments with active manipulation and exploration. Students interact with mathematical objects (fraction bars, number lines, geometry tools) while the system captures rich behavioral telemetry (dwell time, pathing, erasure rate, tool usage) to enable AI-driven personalized feedback and teacher interventions. Built with Konva.js for 2D manipulatives, the sandbox integrates seamlessly with the existing MeTTa student flow (Grade → Subject → Activity) and supports mobile touch interactions with culturally relevant Kenyan context examples.

## Architecture

### System Overview

```mermaid
graph TB
    subgraph "Student Frontend (Next.js)"
        A[StudentFlow Component]
        B[SandboxContainer]
        C[KonvaCanvas]
        D[TelemetryCapture]
        E[AITutorOverlay]
    end
    
    subgraph "Sandbox Core"
        F[SandboxEngine]
        G[ManipulativeFactory]
        H[InteractionHandler]
        I[StateManager]
    end
    
    subgraph "Telemetry Layer"
        J[EventCollector]
        K[xAPIGenerator]
        L[TelemetryBuffer]
        M[TelemetryAPI Client]
    end
    
    subgraph "Backend (FastAPI)"
        N[Telemetry API]
        O[Telemetry Agent]
        P[Analysis Agent]
        Q[Tutoring Agent]
    end
    
    subgraph "Data Layer (Supabase)"
        R[(student_telemetry)]
        S[(xapi_statements)]
        T[(sandbox_sessions)]
    end
    
    subgraph "External Services"
        U[Groq AI]
    end
    
    A --> B
    B --> C
    B --> D
    B --> E
    
    C --> F
    F --> G
    F --> H
    F --> I
    
    H --> J
    J --> K
    K --> L
    L --> M
    
    M --> N
    N --> O
    O --> P
    P --> Q
    
    O --> R
    K --> S
    F --> T
    
    Q --> U
    E --> U
```

### Data Flow Sequence

```mermaid
sequenceDiagram
    participant Student
    participant Canvas
    participant TelemetryCapture
    participant Backend
    participant AITutor
    participant Database
    
    Student->>Canvas: Interact with manipulative
    Canvas->>TelemetryCapture: Emit interaction event
    TelemetryCapture->>TelemetryCapture: Calculate dwell time, pathing
    TelemetryCapture->>Backend: Send xAPI statement (batched)
    Backend->>Database: Store telemetry
    Backend->>Backend: Analyze behavior patterns
    Backend->>AITutor: Generate Socratic question
    AITutor-->>Student: Display contextual prompt
    Student->>AITutor: Respond to question
    AITutor->>Backend: Process response
    Backend->>Database: Update session state
