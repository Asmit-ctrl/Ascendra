# Student0 Demo Account Setup

## Overview
Student0 is a demo/test student account that automatically gets Grade 2 access when accessing the student dashboard. This is useful for testing and demonstration purposes.

## How It Works

### Automatic Grade Assignment
When a user with `studentId = 'student0'` accesses the student dashboard:
1. The system automatically sets their grade to "Grade 2"
2. The system sets their level to "lower-primary"
3. They bypass the journey selection screen
4. They can immediately access the dashboard and all Grade 2 content

### Setting Up Student0

To use the student0 account, set the studentId in localStorage:

```javascript
// In browser console or during initialization
localStorage.setItem('studentId', 'student0');
```

Or create a simple setup page/button that does this for you.

### What Student0 Can Access

With Grade 2 automatically set, student0 can access:
- **Dashboard**: Full student dashboard with Grade 2 content
- **LMS/Tutor**: All Grade 2 subjects and lessons
- **Sandbox**: Interactive learning activities for Grade 2
- **Chat**: Subject-specific AI tutoring for Grade 2 curriculum

### Grade 2 Subjects Available
Based on the CBC curriculum, Grade 2 includes:
- Mathematics Activities
- English Language Activities
- Kiswahili Language Activities
- Environmental Activities
- Creative Activities
- CRE (Christian Religious Education)
- Indigenous Language

## Implementation Details

### Files Modified
1. **`src/app/student/page.tsx`**: Added logic to detect student0 and auto-set Grade 2
2. **`src/lib/auth/student-id.ts`**: Added DEMO_STUDENT_ID constant and priority check

### Code Flow
```typescript
// In student dashboard useEffect
const studentId = getStudentId();
if (studentId === 'student0') {
  sessionStorage.setItem('learningJourney.grade', 'Grade 2');
  sessionStorage.setItem('learningJourney.level', 'lower-primary');
}
```

## Testing

To test the student0 setup:

1. Open browser console
2. Set the student ID:
   ```javascript
   localStorage.setItem('studentId', 'student0');
   ```
3. Navigate to `/student`
4. Verify that:
   - Dashboard loads without redirecting to journey
   - Grade 2 content is displayed
   - All Grade 2 subjects are accessible

## Future Enhancements

Consider adding:
- A dedicated `/student/demo` route that automatically sets up student0
- A "Demo Mode" toggle in the UI
- Multiple demo students for different grades (student1 for Grade 1, etc.)
- Admin panel to manage demo accounts

## Notes

- Uses `sessionStorage` for grade/level (clears on tab close)
- Uses `localStorage` for studentId (persists across sessions)
- This is a temporary solution until full authentication is implemented
- For production, replace with proper user authentication and role management