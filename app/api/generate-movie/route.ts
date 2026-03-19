import { NextResponse } from 'next/server';
import { generateFirstSegment, queueNextSegment } from '@/lib/background-worker';
import type { SegmentRecord } from '@/lib/background-worker';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, sessionId } = body as { prompt: string; sessionId: string };

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // 1. Generate segment 1 synchronously
    const first: SegmentRecord = await generateFirstSegment(sessionId, prompt.trim());

    // 2. Kick off segment 2 in the background (fire-and-forget)
    //    Vercel serverless: this continues briefly after response is sent.
    //    For guaranteed background execution, move this to a Vercel Cron or Queue.
    void queueNextSegment(
      sessionId,
      prompt.trim(),
      2,
      first.url,
      first.plan,
    );

    return NextResponse.json({
      segmentNumber: first.segmentNumber,
      videoUrl: first.url,
      plan: first.plan,
      sessionId,
    });
  } catch (err) {
    console.error('[generate-movie] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
