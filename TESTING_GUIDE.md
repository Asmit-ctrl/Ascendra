# Testing Guide: Scheme-Scribe-AI Integration

## Quick Test Commands

### Test 1: English Subject (Mathematics)
```
Generate a scheme of work for Grade 4 Mathematics Term 1
```

**Expected Output:**
- Scheme with 11-13 weeks
- Each week has exactly 3 SLOs (a, b, c)
- SLO a) starts with Knowledge verb (identify, describe, etc.)
- SLO b) starts with Skills verb (demonstrate, calculate, etc.)
- SLO c) starts with Attitudes verb (appreciate, value, etc.)
- Resources are specific (not just "textbook")
- Learning experiences use active language
- Kenyan cultural examples (shillings, matatu, shamba)

### Test 2: Kiswahili Subject
```
Tengeneza mpango wa kazi kwa Gredi 4 Kiswahili Muhula wa 1
```

**Expected Output:**
- Headers in Kiswahili (Mpango wa Kazi, Gredi, Somo, Muhula)
- SLOs in Kiswahili with proper structure
- Kenyan cultural context
- Kiswahili-specific verbs (kutambua, kutekeleza, kuthamini)

### Test 3: Science & Technology
```
Generate a scheme of work for Grade 4 Science & Technology Term 2
```

**Expected Output:**
- Hands-on activities (observe, measure, record)
- Scientific inquiry questions
- Practical resources (thermometers, magnets, etc.)
- Safety considerations

## What to Check

### ✅ SLO Structure
```markdown
### Specific Learning Outcomes
- a) Identify place value in 4-digit numbers  ← Knowledge verb
- b) Demonstrate addition using concrete materials  ← Skills verb
- c) Appreciate the importance of accuracy  ← Attitudes verb
```

### ✅ No Banned Verbs
Should NOT see:
- "know about"
- "understand"
- "learn about"
- "be aware of"
- "carry out"
- "find out"

### ✅ Specific Resources
Good:
- "KLB Visionary Mathematics Grade 4 Learner's Book pages 12-18"
- "Place value charts showing thousands, hundreds, tens, ones"
- "Sample M-Pesa receipts for real-world context"

Bad:
- "textbook"
- "charts"
- "videos"

### ✅ Active Learning Experiences
Good:
- "Explore place value using bundles of sticks"
- "Practice addition with M-Pesa transactions"
- "Demonstrate subtraction using real money"

Bad:
- "Learn about place value"
- "Understand addition"
- "Know how to subtract"

## Render Logs to Monitor

After deployment, check Render logs for:

### Success Indicators
```
[info] Generating scheme grade=Grade 4 subject=Mathematics term=Term 1
[info] Scheme generated scheme_id=scheme_xxx weeks=11
```

### Guardrail Warnings (Expected)
```
[warning] Banned verb 'know' found in SLO week=3 slo=...
[warning] SLO a) doesn't start with Knowledge verb week=5
[warning] Generic resource found: textbook week=2
[warning] Passive learning experience: learn about... week=4
```

These warnings show the guardrails are working and fixing issues!

### Error Indicators (Investigate)
```
[error] Scheme generation failed error=...
[error] LLM did not return valid JSON
[error] Failed to save scheme
```

## Deployment Status

Check Render dashboard:
- **URL**: https://dashboard.render.com/
- **Service**: ascendra-1
- **Expected**: "Deploy succeeded" within 2-3 minutes

## Testing Checklist

- [ ] Render deployment succeeded
- [ ] Test English subject (Mathematics)
- [ ] Test Kiswahili subject
- [ ] Test Science & Technology
- [ ] Verify SLO structure (a, b, c)
- [ ] Check for banned verbs (should be none)
- [ ] Verify resource specificity
- [ ] Check active language in experiences
- [ ] Review Render logs for guardrail warnings
- [ ] Confirm scheme saves to Supabase

## Expected Timeline

1. **Push to GitHub**: ✅ Complete
2. **Render detects push**: ~30 seconds
3. **Build starts**: ~1 minute
4. **Deploy completes**: ~2-3 minutes total
5. **Ready to test**: ~3-4 minutes from push

## Troubleshooting

### Issue: Deployment fails
**Check**: Render logs for Python errors
**Solution**: Verify syntax in `lesson_architect.py`

### Issue: Still seeing banned verbs
**Check**: Render logs for guardrail warnings
**Solution**: Guardrails log warnings but may not catch all cases in first pass

### Issue: JSON parsing errors
**Check**: Raw LLM response in logs
**Solution**: `_extract_json()` should handle most cases, but LLM might need prompt adjustment

### Issue: Wrong language
**Check**: Subject name contains "kiswahili"
**Solution**: Verify case-insensitive matching in code

## Success Criteria

Integration is successful when:
1. ✅ All generated schemes have 3 SLOs per week
2. ✅ SLOs follow a/b/c KSA structure
3. ✅ No banned verbs in output
4. ✅ Resources are specific
5. ✅ Experiences use active language
6. ✅ Kiswahili schemes use Kiswahili prompts
7. ✅ Guardrail warnings appear in logs
8. ✅ Schemes save to Supabase successfully

## Next Steps After Testing

If all tests pass:
- [ ] Mark Phase 0 as complete
- [ ] Move to Phase 1 (consolidate on Python backend)
- [ ] Plan batch generation implementation
- [ ] Design teacher feedback loop

If issues found:
- [ ] Document specific failures
- [ ] Check Render logs for errors
- [ ] Review guardrail logic
- [ ] Adjust prompts if needed
- [ ] Re-test after fixes

---

**Commit**: 2f9bf58  
**Deployed**: Waiting for Render  
**Test when**: Deployment shows "Live"
