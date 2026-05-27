import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * API Route: /api/teacher/assignments
 * 
 * Handles CRUD operations for teacher grade and subject assignments
 * following the CBC curriculum structure.
 */

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey);
}

// ═══════════════════════════════════════════════════════════════════════════
// GET: Fetch teacher's assignments
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // Get teacher ID from query params or auth
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    
    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      );
    }

    // Fetch grade assignments
    const { data: gradeAssignments, error: gradeError } = await supabase
      .from('teacher_grade_assignments')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('is_active', true)
      .order('grade');

    if (gradeError) {
      console.error('Error fetching grade assignments:', gradeError);
      return NextResponse.json(
        { error: 'Failed to fetch grade assignments' },
        { status: 500 }
      );
    }

    // Fetch subject assignments
    const { data: subjectAssignments, error: subjectError } = await supabase
      .from('teacher_subject_assignments')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('is_active', true)
      .order('grade, subject');

    if (subjectError) {
      console.error('Error fetching subject assignments:', subjectError);
      return NextResponse.json(
        { error: 'Failed to fetch subject assignments' },
        { status: 500 }
      );
    }

    // Group subjects by grade
    const assignmentsByGrade = gradeAssignments.map((grade) => ({
      ...grade,
      subjects: subjectAssignments
        .filter((subject) => subject.grade === grade.grade)
        .map((subject) => subject.subject)
    }));

    return NextResponse.json({
      success: true,
      data: {
        grades: gradeAssignments,
        subjects: subjectAssignments,
        grouped: assignmentsByGrade
      }
    });

  } catch (error) {
    console.error('Error in GET /api/teacher/assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST: Create new teacher assignments
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    
    const { teacherId, assignments } = body;

    if (!teacherId || !assignments || !Array.isArray(assignments)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected teacherId and assignments array' },
        { status: 400 }
      );
    }

    // Prepare grade assignments
    const gradeAssignments = assignments.map((assignment) => ({
      teacher_id: teacherId,
      grade: assignment.grade,
      level: assignment.level,
      teaching_model: assignment.teaching_model || 'specialist',
      is_active: true
    }));

    // Insert grade assignments
    const { data: insertedGrades, error: gradeError } = await supabase
      .from('teacher_grade_assignments')
      .upsert(gradeAssignments, {
        onConflict: 'teacher_id,grade',
        ignoreDuplicates: false
      })
      .select();

    if (gradeError) {
      console.error('Error inserting grade assignments:', gradeError);
      return NextResponse.json(
        { error: 'Failed to create grade assignments', details: gradeError.message },
        { status: 500 }
      );
    }

    // Prepare subject assignments (only for specialist grades)
    const subjectAssignments = assignments
      .filter((assignment) => assignment.subjects && assignment.subjects.length > 0)
      .flatMap((assignment) =>
        assignment.subjects.map((subject: string) => ({
          teacher_id: teacherId,
          grade: assignment.grade,
          subject: subject,
          subject_category: assignment.subject_category || null,
          is_active: true
        }))
      );

    let insertedSubjects = null;
    if (subjectAssignments.length > 0) {
      const { data, error: subjectError } = await supabase
        .from('teacher_subject_assignments')
        .upsert(subjectAssignments, {
          onConflict: 'teacher_id,grade,subject',
          ignoreDuplicates: false
        })
        .select();

      if (subjectError) {
        console.error('Error inserting subject assignments:', subjectError);
        return NextResponse.json(
          { error: 'Failed to create subject assignments', details: subjectError.message },
          { status: 500 }
        );
      }
      insertedSubjects = data;
    }

    return NextResponse.json({
      success: true,
      data: {
        grades: insertedGrades,
        subjects: insertedSubjects
      }
    });

  } catch (error) {
    console.error('Error in POST /api/teacher/assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUT: Update existing teacher assignments
// ═══════════════════════════════════════════════════════════════════════════

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    
    const { teacherId, assignmentId, updates } = body;

    if (!teacherId || !assignmentId || !updates) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Determine if this is a grade or subject assignment update
    const isGradeUpdate = updates.grade !== undefined;

    if (isGradeUpdate) {
      const { data, error } = await supabase
        .from('teacher_grade_assignments')
        .update(updates)
        .eq('id', assignmentId)
        .eq('teacher_id', teacherId)
        .select();

      if (error) {
        console.error('Error updating grade assignment:', error);
        return NextResponse.json(
          { error: 'Failed to update grade assignment' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: data[0]
      });
    } else {
      const { data, error } = await supabase
        .from('teacher_subject_assignments')
        .update(updates)
        .eq('id', assignmentId)
        .eq('teacher_id', teacherId)
        .select();

      if (error) {
        console.error('Error updating subject assignment:', error);
        return NextResponse.json(
          { error: 'Failed to update subject assignment' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: data[0]
      });
    }

  } catch (error) {
    console.error('Error in PUT /api/teacher/assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE: Remove teacher assignments
// ═══════════════════════════════════════════════════════════════════════════

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const teacherId = searchParams.get('teacherId');
    const assignmentId = searchParams.get('assignmentId');
    const type = searchParams.get('type'); // 'grade' or 'subject'

    if (!teacherId || !assignmentId || !type) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    if (type === 'grade') {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('teacher_grade_assignments')
        .update({ is_active: false })
        .eq('id', assignmentId)
        .eq('teacher_id', teacherId);

      if (error) {
        console.error('Error deleting grade assignment:', error);
        return NextResponse.json(
          { error: 'Failed to delete grade assignment' },
          { status: 500 }
        );
      }
    } else if (type === 'subject') {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('teacher_subject_assignments')
        .update({ is_active: false })
        .eq('id', assignmentId)
        .eq('teacher_id', teacherId);

      if (error) {
        console.error('Error deleting subject assignment:', error);
        return NextResponse.json(
          { error: 'Failed to delete subject assignment' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid assignment type' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Assignment deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/teacher/assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Made with Bob
