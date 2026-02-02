import { NextRequest, NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001';

/**
 * Create a POST proxy handler that forwards requests to the backend API.
 */
export function createPostProxy(endpoint: string) {
  return async function POST(request: NextRequest) {
    try {
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();

      const response = await fetch(`${BOT_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(data, { status: response.status });
      }

      return NextResponse.json(data);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Failed to communicate with bot' },
        { status: 500 }
      );
    }
  };
}

/**
 * Create a GET proxy handler that forwards authenticated requests to the backend API.
 */
export function createGetProxy(endpoint: string) {
  return async function GET(request: NextRequest) {
    try {
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const response = await fetch(`${BOT_API_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch from ${endpoint}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch {
      return NextResponse.json(
        { error: 'Failed to communicate with bot' },
        { status: 500 }
      );
    }
  };
}
