import { NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '100';
    const level = searchParams.get('level') || '';
    
    const url = `${BOT_API_URL}/api/logs?limit=${limit}${level ? `&level=${level}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch logs' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to communicate with bot' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
