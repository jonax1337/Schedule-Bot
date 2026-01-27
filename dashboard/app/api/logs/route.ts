import { NextRequest, NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '100';
    const level = searchParams.get('level') || '';

    // Validate limit is a reasonable number
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return NextResponse.json({ error: 'Invalid limit parameter' }, { status: 400 });
    }

    const url = `${BOT_API_URL}/api/logs?limit=${limitNum}${level ? `&level=${encodeURIComponent(level)}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
      },
    });

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
