import { NextRequest, NextResponse } from 'next/server';
import { queueNextSegment } from '@/lib/background-worker';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, prompt, nextSegmentNumber, previousUrl, previousPlan } = body as {
      sessionId: string;
      prompt: string;
      nextSegmentNumber: number;
      previousUrl: string;
      previousPlan: string;
    };

    if (!sessionId || !prompt || !nextSegmentNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Queue the next segment generation in the background
    await queueNextSegment(
      sessionId,
      prompt.trim(),
      nextSegmentNumber,
      previousUrl,
      previousPlan,
    );

    return NextResponse.json({ queued: true, segmentNumber: nextSegmentNumber });
  } catch (err) {
    console.error('[next-segment] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
