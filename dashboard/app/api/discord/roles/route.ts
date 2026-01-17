import { NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001';

export async function GET() {
  try {
    const response = await fetch(`${BOT_API_URL}/api/discord/roles`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch roles' },
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
