# 🎨 Mwalimu AI - UI/UX Design Skill

**Version:** 1.0 | **Project:** SyncSenta Education OS

## Design System

### Color Palette

**Student Interface (Engaging, Gamified)**
- Primary: #7C3AED (Violet) — Learning, trust
- Success: #10B981 (Green) — Correct answers, progress
- Warning: #F59E0B (Amber) — Needs attention
- Error: #EF4444 (Red) — Mistakes
- Neutral: Slate scale (50-950)
- Accent: #EC4899 (Pink) — Achievements, badges

**Teacher Interface (Professional, Data-Driven)**
- Primary: #2563EB (Blue) — Authority, professionalism
- Secondary: #64748B (Slate) — Data, neutral
- Success: #059669 (Emerald) — Progress
- Warning: #F97316 (Orange) — Attention
- Error: #DC2626 (Rose) — Critical
- Neutral: Gray scale (50-950)

### Typography

- **Headings**: Inter (600-700 weight)
- **Body**: Plus Jakarta Sans (400-500 weight)
- **Monospace**: JetBrains Mono (code, data)
- **Sizes**: 24px (H1), 20px (H2), 16px (H3), 14px (body), 12px (small)

### Spacing Scale

4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px

### Border Radius

- Tight: 4px (inputs, small elements)
- Default: 8px (cards, buttons)
- Loose: 12px (modals, large cards)
- Very Loose: 16px+ (hero sections)

### Components

**Buttons**
- Primary: Violet bg, white text, 44px min height
- Secondary: Slate bg, dark text
- Tertiary: Transparent, colored text
- Disabled: 50% opacity, cursor: not-allowed

**Cards**
- 8px border radius
- Subtle shadow (0 1px 3px rgba(0,0,0,0.1))
- 16px padding
- Hover: shadow increase, slight scale

**Forms**
- Labels above inputs
- 44px min height for inputs
- Clear error messages
- Inline validation
- Accessible focus states

**Progress Bars**
- 8px height
- Rounded ends
- Color-coded (green for success, amber for warning)
- Percentage label

**Badges**
- 4px padding, 4px border radius
- Small text (12px)
- Color-coded by status
- Icon + text when possible

### Accessibility

- WCAG 2.1 AA compliance
- 4.5:1 contrast ratio for text
- Keyboard navigation (Tab, Enter, Escape)
- Focus indicators visible (2px ring)
- Semantic HTML
- ARIA labels for icons
- Alt text for images
- Screen reader tested

### Responsive Breakpoints

- Mobile: 320px - 640px
- Tablet: 641px - 1024px
- Desktop: 1025px+

---

## Student Interface Design

### Key Screens

1. **Dashboard** — Home, progress overview, daily challenges
2. **Chat with Mwalimu** — Conversational learning interface
3. **Competency Map** — Visual progress tracking
4. **Gamification** — Points, badges, leaderboard
5. **Lessons & Quizzes** — LMS content
6. **Settings** — Language, preferences

### Design Principles

- **Engaging**: Bright colors, gamification, celebration of wins
- **Clear**: Large text, simple navigation, obvious CTAs
- **Accessible**: High contrast, keyboard support, screen reader friendly
- **Mobile-First**: Touch targets 44px+, responsive layout
- **Kenyan Context**: Kiswahili/Kikuyu support, local examples

---

## Teacher Interface Design

### Key Screens

1. **Dashboard** — Class overview, student status, predictions
2. **Student Analytics** — Individual student profile, insights
3. **Magic School AI** — Auto-generate lessons, quizzes, reports
4. **Class Analytics** — Performance trends, competency gaps
5. **Interventions** — Personalized recommendations
6. **Reports** — Parent communication, progress summaries

### Design Principles

- **Professional**: Clean layout, data-focused, clear hierarchy
- **Actionable**: One-click generation, quick insights, clear next steps
- **Efficient**: Minimize clicks, show key metrics, export-ready
- **Accessible**: Keyboard navigation, screen reader support
- **Scalable**: Works for 1 student or 100+ students

---

## Interaction Patterns

### Hover States
- Subtle color shift (10% lighter/darker)
- Shadow increase
- Smooth transition (200ms)
- Cursor change (pointer for interactive)

### Focus States
- 2px ring in primary color
- Visible on keyboard navigation
- Maintained on all interactive elements

### Loading States
- Spinner or skeleton screen
- Prevent interaction during load
- Show progress if > 2 seconds

### Error States
- Red border on input
- Clear error message below
- Suggest correction
- Focus on error field

### Success States
- Green checkmark
- Celebration animation (optional)
- Brief success message
- Auto-dismiss after 3 seconds

---

## Mwalimu AI Specific Patterns

### Real-Time Feedback (Suzuki Method)
- Immediate response to student answer
- ✓ Correct (green, +points)
- 🎯 Hint (amber, scaffolding)
- 💡 Explanation (blue, step-by-step)
- No harsh red X (positive reinforcement)

### Gamification Elements
- Points counter (top right)
- Streak counter (fire icon)
- Level indicator (progress bar)
- Badges (earned achievements)
- Leaderboard (class-wide, privacy-respecting)

### Competency Visualization
- Tree structure (subjects → topics → competencies)
- Color-coded mastery (green 90%+, yellow 50-89%, red <50%)
- 🎮 Badge for "more games recommended"
- Percentage labels
- Recommended next topic

### Personalization (MeTTa)
- "Your personalized path for today"
- More games on weak areas
- Recommended next lesson
- "Based on your performance yesterday"

---

## Kenyan Context Integration

### Language Support
- Kiswahili (Sw)
- Kikuyu (Ki)
- English (En)
- Language toggle in settings

### Examples & Context
- Currency: KES (Kenyan Shilling)
- Places: Nairobi, Turkana, Great Rift Valley, etc.
- Culture: Mau Mau, matatu, local traditions
- Global: SDG 4, world context, international examples

### Accessibility for Low-Connectivity
- Offline-capable (Phase 2)
- Cached content
- Minimal data usage
- Works on shared tablets

---

## Quick Reference

### Student Dashboard
- Welcome message + streak
- Today's progress by subject
- Daily challenges
- Quick access buttons (Chat, Lessons, Leaderboard)

### Chat Interface
- Conversational layout (like WhatsApp)
- Socratic questions from Mwalimu
- Real-time feedback (✓, 🎯, 💡)
- Points + streak counter
- Buttons: Send, Hint, Explain

### Competency Map
- Tree view of all topics
- Mastery % per topic
- Color coding (green/yellow/red)
- 🎮 Badge for weak areas
- Recommended next topic

### Teacher Dashboard
- Class overview (45 students)
- Average mastery per competency
- Students needing help (red flags)
- Predictions (at-risk students)
- Quick action buttons

### Magic School AI
- Input: Topic, grade, difficulty
- Output: Lesson plan / Quiz / Report
- Download PDF, Edit, Use buttons
- One-click generation

---

## Verification Checklist

Before delivery:

- [ ] Design system applied consistently
- [ ] Accessibility standards met (WCAG AA)
- [ ] Responsive on mobile, tablet, desktop
- [ ] No console errors
- [ ] Interactions tested
- [ ] Kiswahili/Kikuyu support verified
- [ ] Kenyan context examples included
- [ ] Gamification elements visible
- [ ] Real-time feedback working
- [ ] Performance optimized
- [ ] Descriptive filenames used
- [ ] Next steps documented

---

**Status:** Ready for Implementation | **Next:** Design Student Dashboard
