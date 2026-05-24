/**
 * Referral Program API (FREE)
 * Stores referrals in Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Create a new referral
 */
export async function POST(req: NextRequest) {
  try {
    const { referrerId, referredEmail, referredName } = await req.json();

    // Validate input
    if (!referrerId || !referredEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: referrerId and referredEmail' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(referredEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if referral already exists
    const { data: existing } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', referrerId)
      .eq('referred_email', referredEmail)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Referral already exists' },
        { status: 409 }
      );
    }

    // Create referral record
    const { data, error } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referred_email: referredEmail,
        referred_name: referredName || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Referral created successfully' 
    });
  } catch (error) {
    console.error('Referral creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get referrals for a user
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const referrerId = searchParams.get('referrerId');

    if (!referrerId) {
      return NextResponse.json(
        { error: 'Missing referrerId parameter' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', referrerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Calculate statistics
    const stats = {
      total: data.length,
      pending: data.filter(r => r.status === 'pending').length,
      completed: data.filter(r => r.status === 'completed').length,
      rewarded: data.filter(r => r.status === 'rewarded').length,
    };

    return NextResponse.json({ 
      success: true, 
      data,
      stats 
    });
  } catch (error) {
    console.error('Referral fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Update referral status
 */
export async function PATCH(req: NextRequest) {
  try {
    const { referralId, status } = await req.json();

    if (!referralId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: referralId and status' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'completed', 'rewarded', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('referrals')
      .update({ 
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', referralId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Referral status updated successfully' 
    });
  } catch (error) {
    console.error('Referral update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Made with Bob
