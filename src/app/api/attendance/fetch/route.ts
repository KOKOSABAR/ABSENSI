import { NextResponse } from 'next/server';
import { scrapeAttendance } from '@/lib/scraper';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    // Check if we have credentials (can be from env if not provided)
    const user = username || process.env.ATTENDANCE_USERNAME;
    const pass = password || process.env.ATTENDANCE_PASSWORD;

    const records = await scrapeAttendance(user, pass);
    
    return NextResponse.json({ success: true, records });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengambil data absensi.' },
      { status: 500 }
    );
  }
}
