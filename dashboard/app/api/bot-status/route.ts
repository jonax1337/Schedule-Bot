import { NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001';

export async function GET() {
  try {
    const response = await fetch(`${BOT_API_URL}/api/health`, {
      method: 'GET',
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { status: 'offline', botReady: false },
      { status: 503 }
    );
  }
}

export const dynamic = 'force-dynamic';
