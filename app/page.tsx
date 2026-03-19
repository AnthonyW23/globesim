'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

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

export default function GlobeSimPage() {
  const [query, setQuery] = useState('');
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [streamText, setStreamText] = useState('');
  const [globeReady, setGlobeReady] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [showVideo, setShowVideo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setGlobeReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (showVideo && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
    if (showVideo && videoSectionRef.current) {
      videoSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showVideo]);

  const simulate = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;
    setRunning(true);
    setStreamText('');
    setVideoUrl(null);
    setShowVideo(false);
    const initialSteps: AgentStep[] = AGENTS.map(a => ({
      id: a.id,
      name: a.name,
      status: 'pending',
    }));
    setSteps(initialSteps);

    for (let i = 0; i < AGENTS.length; i++) {
      setSteps(prev =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: 'running' } : s
        )
      );
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
      const output = `[${AGENTS[i].model}] Processing ${AGENTS[i].name.toLowerCase()} layer...`;
      setSteps(prev =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: 'done', output } : s
        )
      );
      const chunk = `\n\u2713 ${AGENTS[i].name}: ${output}`;
      setStreamText(prev => prev + chunk);
      if (streamRef.current) {
        streamRef.current.scrollTop = streamRef.current.scrollHeight;
      }
    }

    const picked = DEMO_VIDEOS[Math.floor(Math.random() * DEMO_VIDEOS.length)];
    setVideoUrl(picked);
    setVideoTitle(prompt.trim());
    setRunning(false);
    await new Promise(r => setTimeout(r, 700));
    setShowVideo(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !running) simulate(query);
  };

  const handleReset = () => {
    setShowVideo(false);
    setVideoUrl(null);
    setSteps([]);
    setStreamText('');
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const statusColor = (status: AgentStep['status']) => {
    if (status === 'done') return 'text-emerald-400';
    if (status === 'running') return 'text-yellow-400 animate-pulse';
    return 'text-zinc-600';
  };

  const statusIcon = (status: AgentStep['status']) => {
    if (status === 'done') return '\u2713';
    if (status === 'running') return '\u25B6';
    return '\u25CB';
  };

  return (
    <main className="relative min-h-screen w-screen overflow-x-hidden bg-black text-white">
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-slide-up {
          animation: fadeSlideUp 0.65s cubic-bezier(0.16,1,0.3,1) both;
        }
      `}</style>

      {globeReady && (
        <div className="absolute inset-0 opacity-60 pointer-events-none">
          <Globe
            width={typeof window !== 'undefined' ? window.innerWidth : 1920}
            height={typeof window !== 'undefined' ? window.innerHeight : 1080}
            backgroundColor="rgba(0,0,0,0)"
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            atmosphereColor="#1a3a5c"
            atmosphereAltitude={0.25}
            animateIn
          />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center px-4 py-16 min-h-screen">
        <div className="mb-10 text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-3 bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-500 bg-clip-text text-transparent">
            GlobeSim
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-xl">
            Type any movie idea. Watch 12 AI agents build your cinematic universe.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-2xl">
          <div className="flex gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 backdrop-blur-xl shadow-2xl">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              disabled={running}
              placeholder="A lone astronaut discovers alien ruins on Europa..."
              className="flex-1 bg-transparent outline-none text-white placeholder-zinc-500 px-4 py-3 text-lg"
            />
            <button
              type="submit"
              disabled={running || !query.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 font-semibold text-white disabled:opacity-40 hover:from-cyan-400 hover:to-violet-500 transition-all duration-200 whitespace-nowrap"
            >
              {running ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </form>

        {steps.length > 0 && (
          <div className="mt-8 w-full max-w-2xl bg-black/60 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Agent Pipeline</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4">
              {steps.map(step => (
                <div key={step.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                  <span className={`text-xs font-mono ${statusColor(step.status)}`}>
                    {statusIcon(step.status)}
                  </span>
                  <span className="text-xs text-zinc-300 truncate">{step.name}</span>
                </div>
              ))}
            </div>
            {streamText && (
              <div
                ref={streamRef}
                className="px-6 pb-4 max-h-48 overflow-y-auto font-mono text-xs text-emerald-400 whitespace-pre-wrap"
              >
                {streamText}
              </div>
            )}
          </div>
        )}

        {showVideo && videoUrl && (
          <div
            ref={videoSectionRef}
            className="mt-10 w-full max-w-4xl fade-slide-up"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-cyan-400 uppercase tracking-widest font-semibold mb-1">
                  \u2728 GlobeSim Cinematic Output
                </p>
                <h2 className="text-xl md:text-2xl font-bold text-white leading-snug">
                  {videoTitle}
                </h2>
              </div>
              <button
                onClick={handleReset}
                className="shrink-0 text-zinc-400 hover:text-white text-sm transition-colors px-4 py-2 rounded-xl border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10"
              >
                \u00d7 New Film
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-violet-950/60 bg-black">
              <div className="absolute top-0 left-0 right-0 h-8 bg-black z-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-black z-10 pointer-events-none" />

              <video
                ref={videoRef}
                src={videoUrl}
                controls
                autoPlay
                playsInline
                className="w-full aspect-video object-cover block"
              >
                Your browser does not support the video tag.
              </video>

              <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-inset ring-white/5" />
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
              <span>Rendered by <span className="text-violet-400 font-medium">Sora 2</span></span>
              <span>VFX by <span className="text-cyan-400 font-medium">Veo 3.1</span></span>
              <span>Orchestrated by <span className="text-emerald-400 font-medium">Demiurge Tribunal (Grok 4)</span></span>
              <span className="text-zinc-600">GlobeSim v2.0 \u2014 12 macro-agents</span>
            </div>
          </div>
        )}

        {!running && steps.length === 0 && !showVideo && (
          <p className="mt-8 text-zinc-600 text-sm">
            Powered by 12 specialized macro-agents \u2014 Demiurge \u00b7 Lore \u00b7 VFX \u00b7 Dialogue \u00b7 and more
          </p>
        )}
      </div>
    </main>
  );
}
