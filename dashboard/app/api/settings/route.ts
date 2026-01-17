import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const SETTINGS_PATH = resolve(process.cwd(), '../settings.json');
const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001';

export async function GET() {
  try {
    const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to read settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    writeFileSync(SETTINGS_PATH, JSON.stringify(body, null, 2), 'utf-8');
    
    // Trigger config reload in the bot
    try {
      await fetch(`${BOT_API_URL}/api/reload-config`, {
        method: 'POST',
      });
    } catch (reloadError) {
      console.warn('Failed to reload bot config:', reloadError);
      // Don't fail the save operation if reload fails
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
