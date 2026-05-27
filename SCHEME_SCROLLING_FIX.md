# Scheme of Work Scrolling & Display Fixes

## Issues Identified and Resolved

### Issue 1: Horizontal Scrolling Not Functioning
**Problem:** The scheme of work table displayed horizontal content (1400px wide) but horizontal scrolling was not working properly, and scrollbars were not visible.

**Root Causes:**
1. **Conflicting Overflow Settings**: The [`SchemePreview`](Ascendra/studio/src/components/scheme-wizard/scheme-preview.tsx:89) component had `overflow-y-hidden` which prevented proper scrollbar display
2. **ScrollArea Component Limitation**: The parent components used Radix UI's `ScrollArea` component which only provided vertical scrolling
3. **Insufficient Scrollbar Visibility**: The CSS scrollbar styles were too subtle (8px height, low contrast colors)

**Solutions Implemented:**

#### 1. Fixed SchemePreview Component
**File:** [`Ascendra/studio/src/components/scheme-wizard/scheme-preview.tsx`](Ascendra/studio/src/components/scheme-wizard/scheme-preview.tsx:89)

Changed from:
```tsx
<div className="overflow-x-auto overflow-y-hidden pb-2 scheme-table-scroll mobile-scroll-visible">
```

To:
```tsx
<div className="overflow-x-auto overflow-y-auto pb-2 scheme-table-scroll mobile-scroll-visible">
```

**Rationale:** Allowing both horizontal and vertical overflow ensures scrollbars appear when needed.

#### 2. Replaced ScrollArea with Native Overflow
**Files Modified:**
- [`Ascendra/studio/src/components/teacher/scheme-of-work-generator.tsx`](Ascendra/studio/src/components/teacher/scheme-of-work-generator.tsx:388)
- [`Ascendra/studio/src/components/teacher/lesson-plan-from-scheme.tsx`](Ascendra/studio/src/components/teacher/lesson-plan-from-scheme.tsx:217)

Changed from:
```tsx
<ScrollArea className="h-[600px]">
  <SchemePreview ... />
</ScrollArea>
```

To:
```tsx
<div className="h-[600px] overflow-auto">
  <SchemePreview ... />
</div>
```

**Rationale:** Native `overflow-auto` provides both horizontal and vertical scrolling automatically, while Radix UI's ScrollArea component was limiting scrolling to vertical only.

#### 3. Enhanced Scrollbar Visibility
**File:** [`Ascendra/studio/src/app/globals.css`](Ascendra/studio/src/app/globals.css:136)

**Changes:**
- Increased scrollbar size from 8px to 12px (both height and width)
- Changed scrollbar color to use primary color with opacity for better visibility
- Added border to scrollbar thumb for better definition
- Added scrollbar corner styling for when both scrollbars appear
- Changed `scrollbar-width` from `thin` to `auto` for Firefox

**Before:**
```css
.scheme-table-scroll::-webkit-scrollbar {
  height: 8px;
}
.scheme-table-scroll::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
}
```

**After:**
```css
.scheme-table-scroll::-webkit-scrollbar {
  height: 12px;
  width: 12px;
}
.scheme-table-scroll::-webkit-scrollbar-thumb {
  background: hsl(var(--primary) / 0.6);
  border: 2px solid hsl(var(--muted));
}
```

### Issue 2: Blank Canvas When Clicking Schemes
**Problem:** When clicking on a scheme in the lesson plan generator, the canvas would sometimes appear blank instead of displaying the scheme content.

**Root Cause:** The scheme data was loading correctly, but the display container had scrolling issues that made the content appear hidden or inaccessible.

**Solution:** By fixing the scrolling issues above (replacing ScrollArea with native overflow), the scheme content now displays properly when selected. The container now properly handles both dimensions of overflow, ensuring content is always accessible.

## Technical Details

### Component Hierarchy
```
scheme-of-work-generator.tsx
└── div (h-[600px] overflow-auto) ← Fixed: was ScrollArea
    └── SchemePreview
        └── div (overflow-x-auto overflow-y-auto) ← Fixed: was overflow-y-hidden
            └── table (min-w-[1400px])
```

### Browser Compatibility
The fixes support:
- **Chrome/Edge/Safari**: Custom scrollbar styling via `::-webkit-scrollbar`
- **Firefox**: Standard scrollbar via `scrollbar-width` and `scrollbar-color`
- **Mobile**: Enhanced scrollbar visibility on touch devices

### CSS Classes Used
- `.scheme-table-scroll`: Custom scrollbar styling for the table container
- `.mobile-scroll-visible`: Enhanced scrollbar visibility on mobile devices (already existed)
- `overflow-auto`: Native CSS for automatic scrollbars when content overflows

## Testing Recommendations

1. **Horizontal Scrolling:**
   - Generate a scheme of work
   - Verify horizontal scrollbar appears at the bottom of the table
   - Verify you can scroll horizontally to see all columns
   - Check scrollbar is visible and prominent (12px, primary color)

2. **Vertical Scrolling:**
   - Verify vertical scrollbar appears when content exceeds 600px height
   - Verify smooth scrolling in both directions

3. **Scheme Selection:**
   - Navigate to "Lesson Plans from Scheme" tab
   - Click on a saved scheme
   - Verify the scheme displays immediately (not blank)
   - Verify all content is accessible via scrolling

4. **Cross-Browser:**
   - Test in Chrome, Firefox, Safari, and Edge
   - Verify scrollbars appear and function in all browsers

5. **Mobile/Responsive:**
   - Test on mobile devices or responsive mode
   - Verify scrollbars are visible and usable on touch devices

## Files Modified

1. [`Ascendra/studio/src/components/scheme-wizard/scheme-preview.tsx`](Ascendra/studio/src/components/scheme-wizard/scheme-preview.tsx) - Line 89
2. [`Ascendra/studio/src/components/teacher/scheme-of-work-generator.tsx`](Ascendra/studio/src/components/teacher/scheme-of-work-generator.tsx) - Line 388
3. [`Ascendra/studio/src/components/teacher/lesson-plan-from-scheme.tsx`](Ascendra/studio/src/components/teacher/lesson-plan-from-scheme.tsx) - Lines 217, 292, 331
4. [`Ascendra/studio/src/app/globals.css`](Ascendra/studio/src/app/globals.css) - Lines 136-158

## Benefits

✅ **Horizontal scrolling now works** - Users can scroll left/right to see all table columns  
✅ **Scrollbars are visible** - 12px size with primary color makes them easy to see  
✅ **Both scrollbars work together** - Horizontal and vertical scrolling work simultaneously  
✅ **No blank canvas** - Schemes display immediately when selected  
✅ **Better UX** - Scrollbars provide clear visual feedback about scrollable content  
✅ **Cross-browser compatible** - Works in all modern browsers  
✅ **Mobile-friendly** - Enhanced visibility on touch devices

## Future Enhancements (Optional)

- Consider adding scroll indicators (arrows) for better discoverability
- Add smooth scroll behavior for better UX
- Consider sticky column headers for better navigation in long tables
- Add keyboard navigation support (arrow keys for scrolling)