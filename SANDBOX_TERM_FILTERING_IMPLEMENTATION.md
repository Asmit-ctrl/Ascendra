# Sandbox Term-Based Content Filtering Implementation

## Overview

This implementation adds intelligent term-based content filtering to the Grade 2 sandbox, ensuring students only see content appropriate for their current academic term based on their device date.

## Key Features

### 1. **Device Date Detection**
- Automatically detects the current date from the student's device
- Respects the student's local time zone (similar to WhatsApp, Chrome, etc.)
- Validates device date and warns if it appears incorrect

### 2. **Kenyan Academic Calendar Integration**
- **Term 1**: January - April
- **Term 2**: May - August  
- **Term 3**: September - December

### 3. **Progressive Content Unlocking**
- Students only see content from completed and current terms
- Example: In May (Term 2), students see Term 1 and Term 2 content, but NOT Term 3
- Prevents exposure to future curriculum content

### 4. **Subject-Specific Content**
- **English**: Curriculum-aligned activities from KICD Grade 2 English Language Activities
- **Kiswahili**: Curriculum-aligned activities from KICD Grade 2 Kiswahili Language Activities
- **Mathematics**: Curriculum-aligned activities from KICD Grade 2 Mathematics Activities

## Implementation Details

### Files Created

1. **`src/lib/term-utils.ts`**
   - Term detection based on device date
   - Academic calendar management
   - Date validation utilities
   - Term information formatting

2. **`src/lib/curriculum-activities-mapper.ts`**
   - Maps KICD curriculum data to sandbox activities
   - Automatically assigns terms to curriculum strands
   - Generates activity metadata from learning outcomes
   - Subject-specific activity generation

3. **Updated Files**
   - `src/lib/sandbox-types.ts` - Added `term` field to Activity interface
   - `src/lib/sandbox-activities.ts` - Integrated term filtering and curriculum activities
   - `src/app/student/sandbox/[grade]/[subject]/page.tsx` - Added term UI and date warnings

### How It Works

#### 1. Term Detection
```typescript
// Automatically detects current term from device date
const currentTerm = getCurrentTerm(); // Returns 1, 2, or 3

// Get all available terms (up to current)
const availableTerms = getAvailableTerms(); // e.g., [1, 2] in Term 2
```

#### 2. Content Filtering
```typescript
// Activities are automatically filtered by term
const activities = getActivitiesForGradeSubject('g2', 'english', true);
// Only returns activities from Term 1 and Term 2 if we're in Term 2
```

#### 3. Curriculum Integration
```typescript
// Curriculum data is automatically converted to activities
const englishActivities = generateGrade2EnglishActivities();
// Each activity gets:
// - Proper term assignment
// - Learning outcomes from curriculum
// - Suggested activities
// - Key inquiry questions
```

### UI Features

1. **Term Information Banner**
   - Shows current term and date range
   - Explains what content is visible

2. **Date Warning Alert**
   - Appears if device date seems incorrect
   - Helps students/parents identify date issues

3. **Activity Term Badges**
   - Each activity shows which term it belongs to (T1, T2, T3)
   - Helps students understand content progression

4. **Smart Recommendations**
   - Prioritizes current term activities
   - Considers prerequisites and difficulty
   - Respects term boundaries

## Example Scenarios

### Scenario 1: Student in May (Term 2)
- Device date: May 15, 2026
- Current term: 2
- Visible content: Term 1 + Term 2 activities
- Hidden content: Term 3 activities
- Recommendation: Current term activities prioritized

### Scenario 2: Student in December (Term 3)
- Device date: December 10, 2026
- Current term: 3
- Visible content: All terms (1, 2, 3)
- Hidden content: None
- Recommendation: Term 3 activities prioritized

### Scenario 3: Wrong Device Date
- Device date: January 1, 2024 (2 years old)
- Warning displayed: "Your device date may be incorrect..."
- Fallback: Shows Term 1 content only
- Action: Student/parent should fix device date

## Subject-Specific Content

### English Activities
Generated from Grade 2 English Language Activities curriculum:
- Pronunciation and Vocabulary
- Fluency
- Comprehension
- Grammar (verb 'to be')
- Handwriting

### Kiswahili Activities
Generated from Grade 2 Kiswahili Language Activities curriculum:
- Maamkuzi na Maagano (Greetings)
- Kusoma Ufahamu (Reading Comprehension)
- Hati Nadhifu (Neat Writing)
- Matumizi ya Lugha (Language Usage)
- Matamshi Bora (Pronunciation)

### Mathematics Activities
Generated from Grade 2 Mathematics Activities curriculum:
- Number Concept (1-100)
- Whole Numbers
- Addition and Subtraction
- Multiplication and Division
- Fractions
- Measurement (Length, Mass, Capacity, Time, Money)
- Geometry (Lines, Shapes)

## Benefits

### For Students
1. **Appropriate Content**: Only see what they should be learning now
2. **No Confusion**: Won't encounter future topics prematurely
3. **Clear Progress**: See which term they're in and what's available
4. **Curriculum-Aligned**: Activities match what teachers are teaching

### For Teachers
1. **Synchronized Learning**: Sandbox aligns with classroom teaching
2. **Term-Based Planning**: Content follows academic calendar
3. **No Manual Updates**: System automatically adjusts based on date
4. **Curriculum Compliance**: Activities derived from KICD curriculum

### For Parents
1. **Date Awareness**: Alerts if device date is wrong
2. **Progress Visibility**: Can see which term child is working on
3. **Relevant Practice**: Child practices current term content
4. **Educational Alignment**: Matches school curriculum

## Technical Architecture

### Data Flow
```
Device Date → Term Detection → Available Terms → Filter Activities → Display
     ↓              ↓                ↓                  ↓              ↓
  May 15      Term 2 (May)      [1, 2]         Term 1 & 2      Show UI
```

### Activity Generation
```
KICD Curriculum → Mapper → Activities with Terms → Registry → Filtered Display
      ↓             ↓              ↓                  ↓             ↓
  Strands      Map to T1-3    Add metadata      Store all    Show available
```

## Future Enhancements

1. **Server-Side Date Validation**
   - Cross-check device date with server time
   - More robust date validation

2. **Teacher Override**
   - Allow teachers to unlock specific content early
   - Support for remedial or advanced students

3. **Progress Analytics**
   - Track which terms students complete
   - Identify struggling areas per term

4. **Multi-Grade Support**
   - Extend to Grades 1, 3, 4, 5, 6
   - Consistent term filtering across all grades

5. **Offline Support**
   - Cache term data for offline use
   - Sync when connection restored

## Testing Checklist

- [x] Term detection works correctly for all months
- [x] Activities filter by term properly
- [x] UI shows current term information
- [x] Date warnings appear for incorrect dates
- [x] English activities load from curriculum
- [x] Kiswahili activities load from curriculum
- [x] Mathematics activities load from curriculum
- [x] Term badges display on activities
- [x] Recommendations prioritize current term
- [ ] Test with actual device date changes
- [ ] Test across term boundaries (end of April, start of May)
- [ ] Verify all subjects have proper content

## Maintenance

### Adding New Subjects
1. Create curriculum file in `src/curriculum/`
2. Add generation function in `curriculum-activities-mapper.ts`
3. Update `getCurriculumActivities()` switch statement
4. Test term assignments

### Updating Term Dates
1. Modify `KENYAN_TERMS` array in `term-utils.ts`
2. Adjust month ranges as needed
3. Test boundary conditions

### Adding New Grades
1. Create curriculum files for the grade
2. Add grade-specific generation functions
3. Update activity registry
4. Test term filtering

## Support

For issues or questions:
1. Check device date is correct
2. Verify term dates in `term-utils.ts`
3. Ensure curriculum files are properly imported
4. Check browser console for errors

---

**Implementation Date**: May 27, 2026  
**Version**: 1.0  
**Status**: ✅ Complete and Ready for Testing