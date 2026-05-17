/**
 * Bulk Student Assignment API
 * 
 * Allows teachers to assign multiple students to their class at once.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a teacher
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can assign students' }, { status: 403 });
    }

    const body = await request.json();
    const { studentIds, className, subject } = body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'Student IDs are required' }, { status: 400 });
    }

    if (!className) {
      return NextResponse.json({ error: 'Class name is required' }, { status: 400 });
    }

    // Prepare bulk insert data
    const assignments = studentIds.map((studentId) => ({
      teacher_id: user.id,
      student_id: studentId,
      class_name: className,
      subject: subject || null,
    }));

    // Insert assignments (upsert to handle duplicates)
    const { data, error } = await supabase
      .from('teacher_students')
      .upsert(assignments, {
        onConflict: 'teacher_id,student_id,class_name',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error('Error assigning students:', error);
      return NextResponse.json({ error: 'Failed to assign students' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      assigned: data.length,
      message: `Successfully assigned ${data.length} student(s) to ${className}`,
    });
  } catch (error) {
    console.error('Bulk assign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
