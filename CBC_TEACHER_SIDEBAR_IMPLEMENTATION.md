# CBC Teacher Sidebar Implementation Plan

## Phase 1: Audit & Planning - COMPLETED ✅

### Current Structure Analysis

#### Database Schema
- **profiles table** (001_core_schema.sql):
  - Has `subjects TEXT[]` and `classes TEXT[]` for teachers
  - Missing: Grade-specific assignments, CBC curriculum structure
  - Need: Separate tables for grade/subject assignments

#### Teacher Dashboard
- **Current Layout** (teacher/layout.tsx):
  - Uses AppSidebar component
  - Static navigation items
  - No grade/subject context

- **Current Sidebar** (app-sidebar.tsx):
  - Role-based navigation (teacher/school_head/county_officer)
  - Static menu items
  - No collapsible sections
  - No grade/subject filtering

#### Student Dashboard Pattern
- **Student Layout** (student/layout.tsx):
  - Simple layout without sidebar
  - Uses StudentHeader component
  - Grade stored in sessionStorage

- **Key Insight**: Student dashboard doesn't have a sidebar pattern to copy, but uses session-based grade selection

### Gap Analysis

#### Missing Components:
1. ❌ Teacher grade/subject assignment tables
2. ❌ CBC curriculum data structure
3. ❌ Teacher sidebar with collapsible sections
4. ❌ Grade/subject context management
5. ❌ Dynamic routing for grade/subject
6. ❌ Teacher0 demo data setup
7. ❌ Multi-step signup wizard

#### Existing Assets:
1. ✅ Basic teacher dashboard structure
2. ✅ Supabase migrations framework
3. ✅ Role-based authentication
4. ✅ Student0 demo pattern (can replicate for teacher0)

## Phase 2: Backend Development

### 2.1 Database Migration - Teacher Assignments

Create: `Ascendra/studio/supabase/migrations/003_teacher_grade_assignments.sql`

```sql
-- Teacher Grade Assignments
CREATE TABLE IF NOT EXISTS teacher_grade_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  grade TEXT NOT NULL CHECK (grade IN (
    'PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3',
    'Grade 4', 'Grade 5', 'Grade 6',
    'Grade 7', 'Grade 8', 'Grade 9'
  )),
  level TEXT NOT NULL CHECK (level IN ('pre-primary', 'lower-primary', 'upper-primary', 'junior-secondary')),
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, grade)
);

-- Teacher Subject Assignments (for Upper Primary and Junior Secondary)
CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, grade, subject),
  FOREIGN KEY (teacher_id, grade) REFERENCES teacher_grade_assignments(teacher_id, grade) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_teacher_grade_teacher ON teacher_grade_assignments(teacher_id);
CREATE INDEX idx_teacher_grade_level ON teacher_grade_assignments(level);
CREATE INDEX idx_teacher_subject_teacher ON teacher_subject_assignments(teacher_id);
CREATE INDEX idx_teacher_subject_grade ON teacher_subject_assignments(grade);

-- RLS Policies
ALTER TABLE teacher_grade_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subject_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own assignments"
  ON teacher_grade_assignments FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view own subject assignments"
  ON teacher_subject_assignments FOR SELECT
  USING (auth.uid() = teacher_id);
```

### 2.2 CBC Curriculum Data Structure

Create: `Ascendra/studio/src/lib/cbc-curriculum.ts`

```typescript
export const CBC_LEVELS = {
  'pre-primary': { grades: ['PP1', 'PP2'], model: 'generalist' },
  'lower-primary': { grades: ['Grade 1', 'Grade 2', 'Grade 3'], model: 'generalist' },
  'upper-primary': { grades: ['Grade 4', 'Grade 5', 'Grade 6'], model: 'specialist' },
  'junior-secondary': { grades: ['Grade 7', 'Grade 8', 'Grade 9'], model: 'specialist' }
} as const;

export const CBC_SUBJECTS = {
  'lower-primary': [
    'Mathematics Activities',
    'English Language Activities',
    'Kiswahili Language Activities',
    'Environmental Activities',
    'Creative Activities',
    'CRE/IRE/HRE',
    'Indigenous Language'
  ],
  'upper-primary': [
    'Mathematics',
    'English',
    'Kiswahili',
    'Science & Technology',
    'Social Studies',
    'CRE/IRE/HRE',
    'Creative Arts & Sports',
    'Agriculture & Nutrition'
  ],
  'junior-secondary': [
    'Mathematics',
    'English',
    'Kiswahili',
    'Biology',
    'Physics',
    'Chemistry',
    'History',
    'Geography',
    'Business Studies',
    'Computer Science',
    'Agriculture',
    'Home Science',
    'Creative Arts',
    'Physical Education'
  ]
} as const;

export function getSubjectsForGrade(grade: string): string[] {
  if (['PP1', 'PP2'].includes(grade)) return CBC_SUBJECTS['lower-primary'];
  if (['Grade 1', 'Grade 2', 'Grade 3'].includes(grade)) return CBC_SUBJECTS['lower-primary'];
  if (['Grade 4', 'Grade 5', 'Grade 6'].includes(grade)) return CBC_SUBJECTS['upper-primary'];
  if (['Grade 7', 'Grade 8', 'Grade 9'].includes(grade)) return CBC_SUBJECTS['junior-secondary'];
  return [];
}

export function isLowerPrimary(grade: string): boolean {
  return ['Grade 1', 'Grade 2', 'Grade 3'].includes(grade);
}

export function getTeacherModel(grade: string): 'generalist' | 'specialist' {
  return isLowerPrimary(grade) || ['PP1', 'PP2'].includes(grade) ? 'generalist' : 'specialist';
}
```

### 2.3 API Endpoints

Create: `Ascendra/studio/src/app/api/teacher/assignments/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: grades } = await supabase
    .from('teacher_grade_assignments')
    .select('*')
    .eq('teacher_id', user.id)
    .eq('is_active', true);

  const { data: subjects } = await supabase
    .from('teacher_subject_assignments')
    .select('*')
    .eq('teacher_id', user.id)
    .eq('is_active', true);

  return NextResponse.json({ grades, subjects });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { grades, subjects } = body;

  // Insert grade assignments
  if (grades && grades.length > 0) {
    await supabase.from('teacher_grade_assignments').insert(
      grades.map((g: any) => ({ teacher_id: user.id, ...g }))
    );
  }

  // Insert subject assignments
  if (subjects && subjects.length > 0) {
    await supabase.from('teacher_subject_assignments').insert(
      subjects.map((s: any) => ({ teacher_id: user.id, ...s }))
    );
  }

  return NextResponse.json({ success: true });
}
```

### 2.4 Demo Data - Teacher0 Setup

Create: `Ascendra/studio/scripts/seed-teacher0.sql`

```sql
-- Insert teacher0 profile if not exists
INSERT INTO profiles (id, email, full_name, role, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'teacher0@demo.com',
  'Demo Teacher',
  'teacher',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Assign Grade 4 Mathematics
INSERT INTO teacher_grade_assignments (teacher_id, grade, level)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Grade 4',
  'upper-primary'
) ON CONFLICT (teacher_id, grade) DO NOTHING;

INSERT INTO teacher_subject_assignments (teacher_id, grade, subject)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Grade 4',
  'Mathematics'
) ON CONFLICT (teacher_id, grade, subject) DO NOTHING;

-- Assign Grade 5 English
INSERT INTO teacher_grade_assignments (teacher_id, grade, level)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Grade 5',
  'upper-primary'
) ON CONFLICT (teacher_id, grade) DO NOTHING;

INSERT INTO teacher_subject_assignments (teacher_id, grade, subject)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Grade 5',
  'English'
) ON CONFLICT (teacher_id, grade, subject) DO NOTHING;
```

## Phase 3: Frontend - Teacher Sidebar

### 3.1 Teacher Context Store

Create: `Ascendra/studio/src/stores/teacher-context.ts`

```typescript
import { create } from 'zustand';

interface TeacherAssignment {
  grade: string;
  level: string;
  subjects: string[];
}

interface TeacherContextState {
  assignments: TeacherAssignment[];
  currentGrade: string | null;
  currentSubject: string | null;
  setAssignments: (assignments: TeacherAssignment[]) => void;
  setContext: (grade: string, subject?: string) => void;
}

export const useTeacherContext = create<TeacherContextState>((set) => ({
  assignments: [],
  currentGrade: null,
  currentSubject: null,
  setAssignments: (assignments) => set({ assignments }),
  setContext: (grade, subject) => set({ currentGrade: grade, currentSubject: subject || null }),
}));
```

### 3.2 Teacher Sidebar Component

Create: `Ascendra/studio/src/components/layout/teacher-sidebar.tsx`

```typescript
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTeacherContext } from '@/stores/teacher-context';
import { getSubjectsForGrade, isLowerPrimary } from '@/lib/cbc-curriculum';

export function TeacherSidebar() {
  const pathname = usePathname();
  const { assignments, currentGrade, currentSubject, setContext } = useTeacherContext();
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());

  const toggleGrade = (grade: string) => {
    const newExpanded = new Set(expandedGrades);
    if (newExpanded.has(grade)) {
      newExpanded.delete(grade);
    } else {
      newExpanded.add(grade);
    }
    setExpandedGrades(newExpanded);
  };

  const menuItems = [
    { label: 'Dashboard', path: 'dashboard' },
    { label: 'Schemes of Work', path: 'scheme-wizard' },
    { label: 'Lesson Plans', path: 'lesson-plans' },
    { label: 'Assessments', path: 'assessments' },
    { label: 'Students', path: 'students' },
    { label: 'Resources', path: 'resources' }
  ];

  return (
    <div className="space-y-2">
      {assignments.map((assignment) => {
        const isExpanded = expandedGrades.has(assignment.grade);
        const isLower = isLowerPrimary(assignment.grade);

        return (
          <div key={assignment.grade} className="border rounded-lg">
            <button
              onClick={() => toggleGrade(assignment.grade)}
              className="w-full flex items-center justify-between p-3 hover:bg-muted"
            >
              <span className="font-medium">{assignment.grade}</span>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>

            {isExpanded && (
              <div className="border-t">
                {isLower ? (
                  // Lower Primary: No subject breakdown
                  <div className="p-2 space-y-1">
                    {menuItems.map((item) => (
                      <Link
                        key={item.path}
                        href={`/teacher/grade/${assignment.grade}/${item.path}`}
                        className="block px-3 py-2 rounded hover:bg-muted text-sm"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  // Upper Primary+: Show subjects
                  assignment.subjects.map((subject) => (
                    <div key={subject} className="border-t first:border-t-0">
                      <div className="px-3 py-2 bg-muted/50 font-medium text-sm">
                        {subject}
                      </div>
                      <div className="p-2 space-y-1">
                        {menuItems.map((item) => (
                          <Link
                            key={item.path}
                            href={`/teacher/grade/${assignment.grade}/subject/${subject}/${item.path}`}
                            className="block px-3 py-2 rounded hover:bg-muted text-sm"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

## Phase 4: Routing & Navigation

### 4.1 Dynamic Routes

Create route structure:
- `/teacher/grade/[grade]/dashboard/page.tsx`
- `/teacher/grade/[grade]/subject/[subject]/dashboard/page.tsx`

### 4.2 Route Guards

Create: `Ascendra/studio/src/middleware/teacher-guard.ts`

## Phase 5: Testing Scenarios

1. ✅ Teacher0 with Grade 4 Math + Grade 5 English
2. ✅ Lower Primary teacher (Grade 2, all subjects)
3. ✅ Upper Primary teacher (Grade 4 Math only)
4. ✅ Multi-grade teacher
5. ✅ Teacher with no assignments (setup flow)
6. ✅ Mobile responsiveness

## Implementation Timeline

- **Day 1-2**: Database migrations + API endpoints
- **Day 3-4**: CBC curriculum data + Teacher sidebar component
- **Day 5-6**: Dynamic routing + Context management
- **Day 7-8**: Teacher signup wizard
- **Day 9-10**: Testing + Polish
- **Day 11-12**: Documentation

## Next Steps

1. Create database migration file
2. Create CBC curriculum data structure
3. Create API endpoints
4. Seed teacher0 demo data
5. Build teacher sidebar component
6. Implement dynamic routing
7. Add signup wizard
8. Test all scenarios