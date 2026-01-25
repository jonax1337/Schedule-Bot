import { NextRequest, NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const { question, options, duration } = await request.json();
    
    // Forward request to bot API
    const response = await fetch(`${BOT_API_URL}/api/actions/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, options, duration }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to communicate with bot' },
      { status: 500 }
    );
  }
}
