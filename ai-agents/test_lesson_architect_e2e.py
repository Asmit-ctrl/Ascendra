#!/usr/bin/env python3
"""Quick end-to-end test for LessonArchitectAgent."""

import asyncio
import sys
sys.path.insert(0, "src")

from syncsenta_agents.agents.lesson_architect import LessonArchitectAgent
from syncsenta_agents.curriculum import CURRICULUM_REGISTRY


async def test_scheme_generation():
    """Test scheme generation with realistic frontend inputs."""
    
    print("=" * 60)
    print("Testing LessonArchitectAgent End-to-End")
    print("=" * 60)
    
    # Show available curriculum
    print(f"\n✓ Curriculum loaded: {len(CURRICULUM_REGISTRY)} grade/subject combinations")
    print(f"  Sample keys: {list(CURRICULUM_REGISTRY.keys())[:5]}")
    
    # Create agent (without Supabase for testing)
    agent = LessonArchitectAgent(supabase_client=None)
    print("\n✓ Agent initialized")
    
    # Test 1: Scheme generation with frontend-style input
    print("\n" + "=" * 60)
    print("TEST 1: Generate scheme (frontend format)")
    print("=" * 60)
    
    request = "Create a comprehensive 13-week Scheme of Work for Grade 2 Mathematics - Term 1"
    context = {
        "grade": "grade-2",  # Frontend sends kebab-case
        "subject": "mathematics",  # Frontend sends lowercase
        "term": "Term 1",
        "role": "teacher",
        "teacher_id": "test_teacher_001",
    }
    
    try:
        result = await agent.execute_task(request, context)
        
        if result.get("agent") == "lesson_architect":
            print("✓ Agent executed successfully")
            print(f"✓ Action: {result.get('action')}")
            print(f"✓ Response: {result.get('response')}")
            
            scheme = result.get("scheme", {})
            if scheme:
                print(f"✓ Scheme ID: {scheme.get('scheme_id')}")
                print(f"✓ Title: {scheme.get('title')}")
                print(f"✓ Weeks: {scheme.get('total_weeks')}")
                print(f"✓ Lessons/week: {scheme.get('lessons_per_week')}")
                
                rows = scheme.get("rows", [])
                if rows:
                    print(f"✓ Generated {len(rows)} week rows")
                    print(f"\n  Week 1 sample:")
                    week1 = rows[0]
                    print(f"    Strand: {week1.get('strand')}")
                    print(f"    Sub-strand: {week1.get('sub_strand')}")
                    print(f"    SLOs: {len(week1.get('specific_learning_outcomes', []))}")
                    print(f"    KIQs: {len(week1.get('key_inquiry_questions', []))}")
                    print(f"    Activities: {len(week1.get('learning_experiences', []))}")
                else:
                    print("✗ No rows generated")
            else:
                print("✗ No scheme in result")
        else:
            print(f"✗ Unexpected agent: {result.get('agent')}")
            
    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 2: Different grade/subject
    print("\n" + "=" * 60)
    print("TEST 2: Generate scheme (different subject)")
    print("=" * 60)
    
    request2 = "Generate scheme of work for Grade 4 English Term 2"
    context2 = {
        "grade": "Grade 4",  # Already normalized
        "subject": "English",
        "term": "Term 2",
        "role": "teacher",
    }
    
    try:
        result2 = await agent.execute_task(request2, context2)
        print(f"✓ {result2.get('response')}")
        scheme2 = result2.get("scheme", {})
        if scheme2:
            print(f"✓ Generated {scheme2.get('total_weeks')} weeks for {scheme2.get('title')}")
    except Exception as e:
        print(f"✗ Test 2 failed: {e}")
    
    # Test 3: Error handling - invalid subject
    print("\n" + "=" * 60)
    print("TEST 3: Error handling (invalid subject)")
    print("=" * 60)
    
    context3 = {
        "grade": "Grade 4",
        "subject": "InvalidSubject",
        "term": "Term 1",
    }
    
    try:
        result3 = await agent.execute_task("Generate scheme", context3)
        print(f"✗ Should have raised error but got: {result3}")
    except Exception as e:
        print(f"✓ Correctly raised error: {str(e)[:100]}")
    
    print("\n" + "=" * 60)
    print("ALL TESTS COMPLETED")
    print("=" * 60)
    
    return True


if __name__ == "__main__":
    success = asyncio.run(test_scheme_generation())
    sys.exit(0 if success else 1)
