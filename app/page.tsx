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

export default function GlobeSimPage() {
  const [query, setQuery] = useState('');
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [streamText, setStreamText] = useState('');
  const [globeReady, setGlobeReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setGlobeReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  const simulate = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;
    setRunning(true);
    setStreamText('');
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
    setRunning(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !running) simulate(query);
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
    <main className="relative min-h-screen w-screen overflow-hidden bg-black text-white">
      {/* Globe Background */}
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

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-3 bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-500 bg-clip-text text-transparent">
            GlobeSim
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-xl">
            Type any movie idea. Watch 12 AI agents build your cinematic universe.
          </p>
        </div>

        {/* Search Form */}
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

        {/* Agent Pipeline */}
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

        {!running && steps.length === 0 && (
          <p className="mt-8 text-zinc-600 text-sm">
            Powered by 12 specialized macro-agents — Demiurge · Lore · VFX · Dialogue · and more
          </p>
        )}
      </div>
    </main>
  );
}
