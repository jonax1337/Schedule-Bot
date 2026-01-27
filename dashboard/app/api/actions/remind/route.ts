import { NextRequest, NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date } = await request.json();

    const response = await fetch(`${BOT_API_URL}/api/actions/remind`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ date }),
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
