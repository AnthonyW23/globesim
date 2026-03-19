'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Segment {
  segmentNumber: number;
  videoUrl: string;
  plan: string;
}

interface ContinuousPlayerProps {
  initialSegment: Segment;
  sessionId: string;
  prompt: string;
  onReset: () => void;
}

export default function ContinuousPlayer({
  initialSegment,
  sessionId,
  prompt,
  onReset,
}: ContinuousPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [segments, setSegments] = useState<Segment[]>([initialSegment]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextQueued, setNextQueued] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSegment = segments[currentIndex];

  const queueNextSegment = useCallback(
    async (seg: Segment) => {
      if (nextQueued) return;
      setNextQueued(true);
      try {
        const res = await fetch('/api/next-segment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            prompt,
            nextSegmentNumber: seg.segmentNumber + 1,
            previousUrl: seg.videoUrl,
            previousPlan: seg.plan,
          }),
        });
        if (!res.ok) throw new Error('Failed to queue next segment');
      } catch (e) {
        console.error('[ContinuousPlayer] queue error:', e);
      }
    },
    [sessionId, prompt, nextQueued]
  );

  const fetchNextSegment = useCallback(
    async (seg: Segment) => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/generate-movie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            sessionId,
            segmentNumber: seg.segmentNumber + 1,
            previousUrl: seg.videoUrl,
            previousPlan: seg.plan,
          }),
        });
        if (!res.ok) throw new Error('Segment generation failed');
        const data = await res.json();
        const next: Segment = {
          segmentNumber: data.segmentNumber,
          videoUrl: data.videoUrl,
          plan: data.plan,
        };
        setSegments((prev) => [...prev, next]);
      } catch (e) {
        console.error('[ContinuousPlayer] fetch error:', e);
        setError('Could not load next segment.');
      } finally {
        setIsLoading(false);
        setNextQueued(false);
      }
    },
    [prompt, sessionId]
  );

  // When current video is 80% through, pre-fetch next segment
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !currentSegment) return;
    const pct = video.currentTime / video.duration;
    if (pct >= 0.8 && !nextQueued) {
      queueNextSegment(currentSegment);
    }
  }, [currentSegment, nextQueued, queueNextSegment]);

  // When video ends, advance to next segment or fetch it
  const handleEnded = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (segments[nextIndex]) {
      setCurrentIndex(nextIndex);
    } else {
      fetchNextSegment(currentSegment);
    }
  }, [currentIndex, segments, currentSegment, fetchNextSegment]);

  // Auto-play when index changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.load();
    video.play().catch(() => {});
  }, [currentIndex]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* Cinematic letterbox */}
      <div className="relative w-full max-w-6xl">
        <div className="absolute top-0 left-0 right-0 h-[8%] bg-black z-10" />
        <div className="absolute bottom-0 left-0 right-0 h-[8%] bg-black z-10" />
        <video
          ref={videoRef}
          className="w-full aspect-video object-cover"
          autoPlay
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        >
          <source src={currentSegment?.videoUrl} type="video/mp4" />
        </video>
      </div>

      {/* HUD */}
      <div className="mt-4 flex items-center gap-6 text-white/70 text-sm">
        <span>Segment {currentSegment?.segmentNumber}</span>
        {isLoading && (
          <span className="animate-pulse text-indigo-400">Generating next segment...</span>
        )}
        {error && <span className="text-red-400">{error}</span>}
        <button
          onClick={onReset}
          className="ml-6 px-4 py-1.5 rounded-full border border-white/30 hover:border-white hover:text-white transition-colors"
        >
          New Film
        </button>
      </div>
    </div>
  );
}
