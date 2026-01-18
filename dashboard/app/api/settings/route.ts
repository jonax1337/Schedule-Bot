import { NextRequest, NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001';

export async function GET() {
  try {
    const response = await fetch(`${BOT_API_URL}/api/settings`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error('Backend settings fetch failed:', response.status);
      throw new Error('Failed to fetch settings from backend');
    }
    
    const settings = await response.json();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error loading settings:', error);
    return NextResponse.json(
      { error: 'Failed to read settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Note: Settings updates are handled via the bot's settings manager
    // This endpoint triggers a config reload
    const response = await fetch(`${BOT_API_URL}/api/reload-config`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to reload config');
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
