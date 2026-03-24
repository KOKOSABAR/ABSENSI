import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { records } = await request.json();
    
    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ success: false, error: 'Data tidak valid' }, { status: 400 });
    }

    // We can't update state directly from API, 
    // but the extension can send data which we could store in a DB or 
    // we can return it.
    // However, the best way for "scrpy langsung" is to provide the data 
    // to the dashboard.
    
    // In this case, we'll return the records and maybe the frontend can 
    // poll or we can use a simpler approach.
    
    // For now, let's just confirm receipt. 
    // To make it truly "automatic", the frontend page.tsx will listen 
    // for updates (if we use a database or a global store).
    
    // Since this is a local app, we can just return success and 
    // the user will see the update if we implement a broadcast.
    
    return NextResponse.json({ 
      success: true, 
      message: `Berhasil menerima ${records.length} data.`,
      records 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}