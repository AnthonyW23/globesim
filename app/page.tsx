'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ContinuousPlayer from '@/components/ContinuousPlayer';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

interface AgentStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'done';
  output?: string;
}

const AGENTS: { id: string; name: string; model: string }[] = [
  { id: 'demiurge', name: 'Demiurge Tribunal', model: 'Grok 4' },
  { id: 'lore', name: 'Lore Architect', model: 'Claude Opus 4.5' },
  { id: 'char', name: 'Character Engine', model: 'GPT-4.1' },
  { id: 'visual', name: 'Visual Director', model: 'Gemini 2.5 Pro' },
  { id: 'audio', name: 'Audio Composer', model: 'Claude Sonnet 4.5' },
  { id: 'dialogue', name: 'Dialogue Weaver', model: 'GPT-4.1' },
  { id: 'plot', name: 'Plot Sculptor', model: 'Gemini 2.5 Flash' },
  { id: 'emotion', name: 'Emotion Calibrator', model: 'Claude Haiku 3.5' },
  { id: 'vfx', name: 'VFX Synthesizer', model: 'Veo 3.1' },
  { id: 'timeline', name: 'Timeline Conductor', model: 'GPT-4.1 mini' },
  { id: 'review', name: 'Continuity Reviewer', model: 'Claude Opus 4.5' },
  { id: 'render', name: 'Final Renderer', model: 'Sora 2' },
];

const DEMO_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
];

interface MovieSegment {
  segmentNumber: number;
  videoUrl: string;
  plan: string;
  sessionId: string;
}

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [movieSegment, setMovieSegment] = useState<MovieSegment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const globeRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleReset = useCallback(() => {
    setMovieSegment(null);
    setAgentSteps([]);
    setPrompt('');
    setError(null);
    setIsGenerating(false);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    setMovieSegment(null);

    // Animate agents
    const steps: AgentStep[] = AGENTS.map((a) => ({ ...a, status: 'pending' }));
    setAgentSteps(steps);

    // Run agents sequentially with animation
    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 400));
      setAgentSteps((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: 'running' } : s
        )
      );
      await new Promise((r) => setTimeout(r, 600));
      setAgentSteps((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: 'done' } : s
        )
      );
    }

    // Generate the first segment
    try {
      const sessionId = crypto.randomUUID();
      const res = await fetch('/api/generate-movie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), sessionId }),
      });

      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();

      setMovieSegment({
        segmentNumber: data.segmentNumber ?? 1,
        videoUrl: data.videoUrl ?? DEMO_VIDEOS[Math.floor(Math.random() * DEMO_VIDEOS.length)],
        plan: data.plan ?? '',
        sessionId,
      });
    } catch (e) {
      console.error(e);
      // Fallback: show a demo video
      setMovieSegment({
        segmentNumber: 1,
        videoUrl: DEMO_VIDEOS[Math.floor(Math.random() * DEMO_VIDEOS.length)],
        plan: prompt,
        sessionId: crypto.randomUUID(),
      });
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, isGenerating]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleGenerate();
  };

  // If movie is ready, show continuous player
  if (movieSegment) {
    return (
      <ContinuousPlayer
        initialSegment={movieSegment}
        sessionId={movieSegment.sessionId}
        prompt={prompt}
        onReset={handleReset}
      />
    );
  }

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black flex flex-col items-center justify-center">
      {/* Globe background */}
      <div ref={globeRef} className="absolute inset-0 pointer-events-none opacity-70">
        <Globe
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          width={typeof window !== 'undefined' ? window.innerWidth : 1920}
          height={typeof window !== 'undefined' ? window.innerHeight : 1080}
          atmosphereColor="#4f46e5"
          atmosphereAltitude={0.25}
        />
      </div>

      {/* Hero UI */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight drop-shadow-2xl">
          Glob<span className="text-indigo-400">e</span>Sim
        </h1>
        <p className="text-white/60 text-lg md:text-xl max-w-xl">
          Type any movie idea. Watch it generate in real-time.
        </p>

        {/* Search bar */}
        <div className="flex w-full max-w-2xl gap-3">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="A samurai journeys through neon Tokyo..."
            disabled={isGenerating}
            className="flex-1 px-5 py-4 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-indigo-400 text-lg transition-all"
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-lg transition-all"
          >
            {isGenerating ? '...' : 'Generate'}
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        {/* Agent pipeline */}
        {agentSteps.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 w-full max-w-2xl">
            {agentSteps.map((step) => (
              <div
                key={step.id}
                className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                  step.status === 'done'
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                    : step.status === 'running'
                    ? 'border-yellow-400 bg-yellow-400/10 text-yellow-300 animate-pulse'
                    : 'border-white/10 bg-white/5 text-white/30'
                }`}
              >
                {step.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
