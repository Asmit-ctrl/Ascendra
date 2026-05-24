
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { role, name } = await request.json();

    if (!role || !name) {
      return NextResponse.json({ success: false, message: 'Role and name are required.' }, { status: 400 });
    }

    const cookieStore = await cookies();
    cookieStore.set('userRole', role, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    cookieStore.set('userName', name, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    
    return NextResponse.json({ success: true, message: 'Auth cookies set successfully.' });
  } catch (error) {
    console.error('=== SET-AUTH-COOKIE ROUTE ERROR ===');
    console.error('Error name:', (error as Error)?.name);
    console.error('Error message:', (error as Error)?.message);
    console.error('Error stack:', (error as Error)?.stack);
    console.error('===================================');
    return NextResponse.json({ success: false, message: 'Failed to set auth cookies.' }, { status: 500 });
  }
}
