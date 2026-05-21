CBC Kenyan scheme of work generator - design constraints and key decisions

## Column Headers
- English: "Lesson Learning Outcomes" (not "Specific Learning Outcomes"), "Lesson Learning Experiences" (not "Learning Experiences")
- Kiswahili: "MATOKEO MAALUM YANAYOTARAJIWA", "MAPENDEKEZO YA SHUGHULI ZA UJIFUNZAJI"

## Books
- Grades 1-3 use KLB Visionary series (NOT "Curriculum Design" or generic references)
- English: KLB Visionary English Literacy Activities Grade X
- Kiswahili: KLB Visionary Kiswahili Gredi X
- Math: KLB Visionary Mathematical Activities Grade X
- Env: KLB Visionary Environmental Activities Grade X
- Creative: KLB Visionary Creative Activities Grade X
- CRE: KLB Visionary CRE Activities Grade X
- IRE: KLB Visionary IRE Activities Grade X
- HRE: KLB Visionary HRE Activities Grade X

## KSA Verb Framework (Grade 1-3 Non-Language)
- BANNED informal verbs: "carry out", "find out", "look at", "do", "make", "get to know", "learn about", "talk about", "go through"
- BANNED literacy verbs (non-language only): write, read, compose, draft, author, journal
- BANNED advanced verbs: analyse, evaluate, critique, synthesize, hypothesize, infer, deduce
- Knowledge verbs: identify, explain, describe, recognize, compare, classify, define, list, name, state, outline, summarize
- Skills verbs: observe, record, differentiate, use, interpret, suggest, role-play, practice, conduct, demonstrate, participate, sort, measure, express, create, construct
- Attitudes verbs: appreciate, value, show, commit, prioritize, develop, care, respect, empathize
- Grade 1-2 prefer simpler: identify, name, describe, observe, sort, demonstrate, appreciate, show, participate, practice
- Grade 3 may also use: explain, compare, classify, suggest, interpret, value, commit, recognize
- RIGID KSA ordering: a)=Knowledge verb ONLY, b)=Skills verb ONLY, c)=Attitudes verb ONLY. Non-negotiable.

## Key Rules
- English: Each lesson = ONE letter sound. Never lump multiple letter sounds.
- Non-language subjects (Env, Math, CRE, Creative): SLOs must come DIRECTLY from KICD outcomes. No inventing content.
- Kiswahili: Term-to-Mada mappings are hardcoded. Mada 7.4 = Sarufi (not the Mada topic name).
- Term mappings exist for English Activities and Kiswahili per term.

## Feedback System
- Rate (thumbs up/down) + regenerate with feedback text stored in scheme_feedback table

## Removed
- Firecrawl connector disconnected and scrape-schemes edge function deleted (not needed)
