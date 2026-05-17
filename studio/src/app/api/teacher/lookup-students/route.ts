/**
 * Student Lookup API
 * 
 * Looks up student IDs from email addresses.
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
      return NextResponse.json({ error: 'Only teachers can lookup students' }, { status: 403 });
    }

    const body = await request.json();
    const { emails } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Email addresses are required' }, { status: 400 });
    }

    // Look up students by email
    const { data: students, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .in('email', emails)
      .eq('role', 'student');

    if (error) {
      console.error('Error looking up students:', error);
      return NextResponse.json({ error: 'Failed to lookup students' }, { status: 500 });
    }

    const studentIds = students?.map((s) => s.id) || [];
    const foundEmails = students?.map((s) => s.email) || [];
    const notFound = emails.filter((email) => !foundEmails.includes(email));

    return NextResponse.json({
      studentIds,
      students: students?.map((s) => ({
        id: s.id,
        email: s.email,
        name: s.full_name,
      })),
      notFound,
    });
  } catch (error) {
    console.error('Lookup students error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
