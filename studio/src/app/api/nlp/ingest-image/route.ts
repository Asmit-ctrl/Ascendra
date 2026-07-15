import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabase/server';

const ALLOWED_DEVICE_KEYS = process.env.ESP32_DEVICE_KEYS ? process.env.ESP32_DEVICE_KEYS.split(',') : [];

export async function POST(request: NextRequest) {
  try {
    const authKey = request.headers.get('x-device-key');
    if (!authKey || !ALLOWED_DEVICE_KEYS.includes(authKey)) {
      return NextResponse.json({ error: 'Unauthorized device' }, { status: 401 });
    }

    const formData = await request.formData();
    const imageFile = formData.get('image');
    const device_id = formData.get('device_id');
    const timestamp = formData.get('timestamp');
    const metadata = formData.get('metadata');

    if (!imageFile || !(imageFile instanceof File) || !device_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase.storage
      .from('esp32-uploads')
      .upload(`esp32/${device_id}/${Date.now()}.jpg`, imageBuffer, {
        contentType: imageFile.type,
        upsert: false,
      });

    if (error) {
      console.error('Error uploading ESP32 image:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: record, error: insertError } = await supabase
      .from('camera_frames')
      .insert({
        device_id: String(device_id),
        image_path: data.path,
        timestamp: timestamp ? new Date(String(timestamp)).toISOString() : new Date().toISOString(),
        metadata: metadata ? JSON.parse(String(metadata)) : null,
        status: 'pending',
      } as any)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting camera frame record:', insertError);
      return NextResponse.json({ error: 'Failed to store frame metadata' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error('Error in /api/nlp/ingest-image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
