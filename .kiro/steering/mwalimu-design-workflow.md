---
inclusion: manual
---

# 🎨 Mwalimu AI Design Workflow

**Use this steering when:** Designing student or teacher interfaces for Mwalimu AI

## Quick Start

1. **Load the skill**: `.kiro/skills/mwalimu-ui-ux-design.md`
2. **Follow the design process**: Discovery → Design → Verification
3. **Reference the design system**: Colors, typography, spacing, components
4. **Check accessibility**: WCAG AA compliance
5. **Iterate with tweaks**: Expose design variations
6. **Verify before delivery**: Screenshots, testing, console check

---

## Design Process

### Phase 1: Discovery

**Questions to Ask:**
- Which screen are we designing? (Dashboard, Chat, Competency Map, etc.)
- Student or teacher interface?
- What's the primary goal of this screen?
- What data/content needs to be displayed?
- Are there existing designs to reference?
- What interactions are needed?
- Mobile-first or desktop-first?

**Context to Gather:**
- Read the Mwalimu AI vision document
- Review the UI mockup descriptions
- Check the design system (colors, typography, spacing)
- Identify similar screens in existing projects
- Understand the user flow

### Phase 2: Design

**Steps:**
1. Create a wireframe or low-fidelity sketch
2. Apply the design system (colors, typography, spacing)
3. Add interactions and animations
4. Implement accessibility features
5. Make it responsive (mobile-first)
6. Add tweaks for design variations
7. Test and iterate

**Design Principles:**
- **Student Interface**: Engaging, gamified, celebratory
- **Teacher Interface**: Professional, data-driven, efficient
- **Both**: Accessible, responsive, Kenyan context

### Phase 3: Verification

**Checklist:**
- [ ] Design system applied consistently
- [ ] Accessibility standards met (WCAG AA)
- [ ] Responsive on mobile, tablet, desktop
- [ ] No console errors
- [ ] Interactions tested
- [ ] Kiswahili/Kikuyu support verified
- [ ] Kenyan context examples included
- [ ] Performance optimized
- [ ] Descriptive filenames used
- [ ] Next steps documented

---

## Design System Quick Reference

### Colors

**Student (Engaging)**
- Primary: #7C3AED (Violet)
- Success: #10B981 (Green)
- Warning: #F59E0B (Amber)
- Error: #EF4444 (Red)
- Accent: #EC4899 (Pink)

**Teacher (Professional)**
- Primary: #2563EB (Blue)
- Secondary: #64748B (Slate)
- Success: #059669 (Emerald)
- Warning: #F97316 (Orange)
- Error: #DC2626 (Rose)

### Typography

- **Headings**: Inter (600-700)
- **Body**: Plus Jakarta Sans (400-500)
- **Monospace**: JetBrains Mono

### Spacing

4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px

### Border Radius

- Tight: 4px
- Default: 8px
- Loose: 12px
- Very Loose: 16px+

---

## Student Interface Patterns

### Real-Time Feedback (Suzuki Method)
- ✓ Correct (green, +points)
- 🎯 Hint (amber, scaffolding)
- 💡 Explanation (blue, step-by-step)
- No harsh red X (positive reinforcement)

### Gamification
- Points counter (top right)
- Streak counter (fire icon)
- Level indicator (progress bar)
- Badges (earned achievements)
- Leaderboard (class-wide)

### Competency Visualization
- Tree structure (subjects → topics)
- Color-coded mastery (green/yellow/red)
- 🎮 Badge for weak areas
- Percentage labels
- Recommended next topic

---

## Teacher Interface Patterns

### Dashboard
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

### Analytics
- Individual student profile
- Competency breakdown
- Learning patterns
- Recommended interventions
- Generate intervention button

---

## Accessibility Checklist

- [ ] Color contrast 4.5:1 for text
- [ ] Semantic HTML (h1, button, nav, etc.)
- [ ] ARIA labels for icons and images
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Focus indicators visible (2px ring)
- [ ] Alt text for images
- [ ] Form labels associated with inputs
- [ ] Error messages clear and actionable
- [ ] Loading states announced
- [ ] Tested with screen reader

---

## Responsive Design

### Breakpoints
- Mobile: 320px - 640px
- Tablet: 641px - 1024px
- Desktop: 1025px+

### Mobile-First Approach
1. Design for mobile first
2. Add complexity for larger screens
3. Use CSS media queries
4. Test on real devices

### Touch Targets
- Minimum 44px × 44px
- Adequate spacing between targets
- Avoid hover-only interactions
- Support both touch and mouse

---

## Kenyan Context Integration

### Language Support
- Kiswahili (Sw)
- Kikuyu (Ki)
- English (En)
- Language toggle in settings

### Examples & Context
- Currency: KES (Kenyan Shilling)
- Places: Nairobi, Turkana, Great Rift Valley
- Culture: Mau Mau, matatu, local traditions
- Global: SDG 4, world context

---

## Common Mistakes to Avoid

1. **Too many colors** — Stick to 3-5 colors max
2. **Inconsistent spacing** — Use the spacing scale
3. **Poor contrast** — Test with accessibility tools
4. **Hover-only interactions** — Support keyboard and touch
5. **Placeholder content** — Use real content or meaningful placeholders
6. **Overuse of animations** — Keep animations purposeful
7. **Unresponsive design** — Test on mobile first
8. **Inaccessible forms** — Always label inputs
9. **Broken links** — Test all navigation
10. **Slow performance** — Optimize images and code

---

## Tools & Resources

### Design Tools
- Figma (design and prototyping)
- Adobe XD (design and prototyping)

### Accessibility Tools
- WAVE (accessibility checker)
- Lighthouse (performance and accessibility)
- Axe DevTools (accessibility testing)
- Color Contrast Analyzer (contrast checking)

### Resources
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design](https://material.io/design)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn/UI](https://ui.shadcn.com/)

---

## Next Steps

1. **Design Student Dashboard** — Home screen with progress overview
2. **Design Chat Interface** — Conversational learning with Mwalimu
3. **Design Competency Map** — Visual progress tracking
4. **Design Teacher Dashboard** — Class overview and student status
5. **Design Magic School AI** — Auto-generation tools
6. **Design Student Analytics** — Individual student profile
7. **Implement and test** — Build and verify all screens
8. **Iterate based on feedback** — Refine based on user testing

---

**Status:** Ready for Design Implementation | **Last Updated:** May 2026
