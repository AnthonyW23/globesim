/**
 * Background worker for GlobeSim v2.0 — Chronos segment queue.
 *
 * Architecture:
 *  - Segment queue is an in-memory Map<string, SegmentRecord> keyed by `${sessionId}:${segmentNumber}`.
 *  - In production: replace with Redis (Upstash), Convex, or a Vercel Background Function.
 *  - Each record holds: url, plan JSON, ready flag, timestamp.
 *
 * The POST /api/generate-movie endpoint calls `queueNextSegment` immediately after
 * returning the first clip, so segment N+1 is being generated while the viewer
 * watches segment N.
 */

import { generateChronosSegment, pickDemoVideoUrl } from './chronos-agent';
import type { ChronosSegment, ChronosState } from './chronos-agent';

export interface SegmentRecord {
  segmentNumber: number;
  url: string;
  plan: ChronosSegment;
  readyAt: number;
}

// ---------------------------------------------------------------------------
// In-memory store (edge-safe, resets on cold start)
// In production: replace with Redis/Convex/KV
// ---------------------------------------------------------------------------
const segmentStore = new Map<string, SegmentRecord>();

function storeKey(sessionId: string, segmentNumber: number): string {
  return `${sessionId}:${segmentNumber}`;
}

export function storeSegment(sessionId: string, record: SegmentRecord): void {
  segmentStore.set(storeKey(sessionId, record.segmentNumber), record);
}

export function getSegment(sessionId: string, segmentNumber: number): SegmentRecord | undefined {
  return segmentStore.get(storeKey(sessionId, segmentNumber));
}

export function clearSession(sessionId: string): void {
  for (const key of segmentStore.keys()) {
    if (key.startsWith(`${sessionId}:`)) segmentStore.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Core background job — generate & store the next segment plan + video URL
// ---------------------------------------------------------------------------
export async function queueNextSegment(
  sessionId: string,
  userPrompt: string,
  nextSegmentNumber: number,
  previousClipUrl: string,
  previousSegment: ChronosSegment | null,
): Promise<void> {
  try {
    const state: ChronosState = {
      current_query: userPrompt,
      segment_number: nextSegmentNumber,
      previous_clip_url: previousClipUrl,
      previous_segment: previousSegment,
    };

    // 1. Generate the Chronos shot plan (Grok 4 in prod / mock in demo)
    const plan = await generateChronosSegment(state);

    // 2. Generate the actual video (Veo 3.1/Sora 2/Kling 3.0 in prod / demo URL for now)
    //    In production: pass `plan.shots` to your video gen pipeline and await the URL.
    const url = pickDemoVideoUrl(nextSegmentNumber);

    // 3. Store for polling
    const record: SegmentRecord = {
      segmentNumber: nextSegmentNumber,
      url,
      plan,
      readyAt: Date.now(),
    };

    storeSegment(sessionId, record);
  } catch (err) {
    console.error(`[Chronos] Failed to generate segment ${nextSegmentNumber}:`, err);
  }
}

// ---------------------------------------------------------------------------
// Immediately generate the first segment synchronously (called from API route)
// ---------------------------------------------------------------------------
export async function generateFirstSegment(
  sessionId: string,
  userPrompt: string,
): Promise<SegmentRecord> {
  const state: ChronosState = {
    current_query: userPrompt,
    segment_number: 1,
    previous_clip_url: null,
    previous_segment: null,
  };

  const plan = await generateChronosSegment(state);
  const url = pickDemoVideoUrl(1);

  const record: SegmentRecord = {
    segmentNumber: 1,
    url,
    plan,
    readyAt: Date.now(),
  };

  storeSegment(sessionId, record);
  return record;
}
