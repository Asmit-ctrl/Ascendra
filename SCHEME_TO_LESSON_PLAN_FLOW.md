# Scheme to Lesson Plan Flow - Already Implemented ✅

## Overview

The connection between scheme generation and lesson plan generation is **already fully implemented and working**. Teachers can generate a scheme of work and then click a button on any row to generate a detailed lesson plan for that specific lesson.

## How It Works

### 1. Generate a Scheme
```
Teacher → Magic School Teacher → Scheme of Work tab
→ Select Grade, Subject, Term
→ Click "Generate Scheme of Work"
→ 13-week CBC scheme appears in table
```

### 2. Generate Lesson Plan from Scheme Row
```
Scheme Table → Each row has "Generate" button in last column
→ Click "Generate" on any row
→ LessonPlanDialog opens with row context pre-filled
→ Optionally add notes
→ Click "Generate Lesson Plan"
→ Detailed lesson plan appears
```

## Technical Implementation

### Frontend Flow

1. **SchemePreview Component** (`scheme-wizard/scheme-preview.tsx`):
   - Renders 10-column CBC scheme table
   - Last column has "Generate" button (if not readOnly)
   - Button calls `onGenerateLessonPlan(row, index)`

2. **SchemeOfWorkGenerator Component** (`teacher/scheme-of-work-generator.tsx`):
   - Passes handler: `onGenerateLessonPlan={(row) => setLessonPlanRow(row)}`
   - Opens LessonPlanDialog when row is selected
   - Passes row data, grade, subject, term to dialog

3. **LessonPlanDialog Component** (`scheme-wizard/lesson-plan-dialog.tsx`):
   - Receives SchemeRow with all context
   - Shows pre-filled form with strand, sub-strand, week, lesson
   - Calls backend API: `POST /lesson-architect/generate-lesson-plan`
   - Displays structured lesson plan with:
     - Title, duration, objectives
     - Introduction, development, conclusion (with timings)
     - Assessment methods
     - Differentiation (advanced/struggling learners)
     - Resources
     - Teacher reflection space
   - Export to PDF button

### Backend API

**Endpoint**: `POST /lesson-architect/generate-lesson-plan`

**Request**:
```json
{
  "teacher_id": "teacher_001",
  "scheme_id": "scheme_abc123",
  "week": 1,
  "lesson": 1,
  "row": {
    "strand": "Numbers",
    "subStrand": "Whole Numbers",
    "specificLearningOutcome": "...",
    "learningExperiences": "...",
    "keyInquiryQuestion": "...",
    "learningResources": "...",
    "assessmentMethods": "...",
    "reflection": "..."
  },
  "grade": "Grade 4",
  "subject": "Mathematics",
  "term": "Term 1",
  "additional_notes": "Optional teacher notes"
}
```

**Response**:
```json
{
  "success": true,
  "lesson_plan": {
    "title": "Whole Numbers: Place Value",
    "grade": "Grade 4",
    "subject": "Mathematics",
    "strand": "Numbers",
    "subStrand": "Whole Numbers",
    "duration": "40 minutes",
    "objectives": [
      "Identify place value up to thousands",
      "Read and write numbers in expanded form"
    ],
    "keyInquiryQuestion": "How do we represent large numbers?",
    "introduction": {
      "duration": "5 minutes",
      "activities": [
        "Review previous lesson on hundreds",
        "Introduce thousands place value"
      ]
    },
    "development": {
      "duration": "25 minutes",
      "activities": [
        "Demonstrate with place value chart",
        "Group activity: Build numbers with blocks",
        "Individual practice: Write numbers in expanded form"
      ]
    },
    "conclusion": {
      "duration": "5 minutes",
      "activities": [
        "Quick quiz on place value",
        "Recap key concepts"
      ]
    },
    "assessment": [
      "Oral questions during lesson",
      "Written exercise: 5 problems",
      "Observation during group work"
    ],
    "differentiation": {
      "advanced": "Challenge with 5-digit numbers and word problems",
      "struggling": "Use concrete materials, focus on 3-digit numbers"
    },
    "resources": [
      "Place value chart",
      "Number blocks",
      "Worksheets",
      "Chalkboard"
    ],
    "teacherReflection": "Space for post-lesson notes on what worked well and areas for improvement"
  },
  "lesson_plan_id": "lp_abc123",
  "source": "ai-generated"
}
```

### Database Storage

**Table**: `lesson_plans`

Columns:
- `lesson_plan_id` (PK)
- `scheme_id` (FK to schemes)
- `teacher_id`
- `title`, `grade`, `subject`, `week`, `lesson_number`
- `duration_minutes`
- `learning_outcomes` (JSONB)
- `key_questions` (JSONB)
- `introduction`, `main_activities`, `differentiation`, `assessment`, `conclusion` (JSONB)
- `teacher_notes` (TEXT)
- `created_at`, `updated_at`

## User Experience

### Step-by-Step Flow

1. **Teacher generates scheme**:
   - Selects Grade 4, Mathematics, Term 1
   - Clicks "Generate Scheme of Work"
   - Sees 13-week scheme with 65 lessons (5 per week)

2. **Teacher wants detailed plan for Week 1, Lesson 1**:
   - Scrolls to first row in scheme table
   - Clicks "Generate" button in last column
   - Dialog opens showing:
     - Grade: Grade 4
     - Subject: Mathematics
     - Strand: Numbers
     - Sub-Strand: Whole Numbers
     - Lesson 1, Week 1

3. **Teacher adds optional notes**:
   - Types: "Class has 30 students, limited resources"
   - Clicks "Generate Lesson Plan"

4. **Lesson plan appears**:
   - Structured format with all sections
   - Timed activities (5 min intro, 25 min development, 5 min conclusion)
   - Differentiation strategies
   - Assessment methods
   - Resource list

5. **Teacher exports**:
   - Clicks "Export PDF"
   - Browser print dialog opens
   - Saves as PDF or prints physical copy

## Features

### ✅ Already Working

- [x] Generate button on each scheme row
- [x] LessonPlanDialog with pre-filled context
- [x] Backend API endpoint
- [x] Structured lesson plan format
- [x] Kiswahili language support
- [x] PDF export via print
- [x] Database persistence
- [x] Regenerate option
- [x] Additional notes field

### 🎯 Key Benefits

1. **Context-Aware**: Lesson plan inherits all context from scheme row
2. **CBC-Aligned**: Uses strand, sub-strand, SLO from scheme
3. **Time-Structured**: Breaks lesson into intro/development/conclusion with timings
4. **Differentiated**: Includes strategies for advanced and struggling learners
5. **Printable**: One-click PDF export for physical lesson plans
6. **Bilingual**: Supports English and Kiswahili UI

## Testing the Flow

### Quick Test

1. Navigate to Magic School Teacher → Scheme of Work tab
2. Select: Grade 4, Mathematics, Term 1
3. Click "Generate Scheme of Work"
4. Wait for scheme to generate (~30-60 seconds)
5. Scroll to any row in the scheme table
6. Click "Generate" button in the last column
7. Dialog opens with lesson context
8. Click "Generate Lesson Plan"
9. Structured lesson plan appears
10. Click "Export PDF" to download

### Expected Result

- Lesson plan should have:
  - Title matching the sub-strand
  - 40-minute duration (default)
  - 3-5 learning objectives
  - Timed sections (intro, development, conclusion)
  - Assessment methods
  - Differentiation strategies
  - Resource list
  - Teacher reflection space

## Code Locations

### Frontend
- `studio/src/components/scheme-wizard/scheme-preview.tsx` - Scheme table with Generate buttons
- `studio/src/components/teacher/scheme-of-work-generator.tsx` - Scheme generator with handler
- `studio/src/components/scheme-wizard/lesson-plan-dialog.tsx` - Lesson plan dialog

### Backend
- `ai-agents/src/syncsenta_agents/agents/scheme/lesson_plan.py` - Lesson plan generator
- `ai-agents/src/syncsenta_agents/api/lesson_architect_api.py` - API endpoint
- `ai-agents/src/syncsenta_agents/agents/lesson_architect.py` - Main orchestrator

### Database
- `supabase/migrations/` - lesson_plans table migration (already in SUPABASE_MISSING_TABLES.sql)

## Summary

**The scheme-to-lesson-plan flow is fully implemented and working!** 

Teachers can:
1. Generate a 13-week scheme of work
2. Click "Generate" on any row
3. Get a detailed, CBC-aligned lesson plan
4. Export to PDF

No additional work needed - this feature is ready to use! ✅
