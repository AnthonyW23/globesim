/**
 * Chronos — Timeline & Cinematic Curator (GlobeSim v2.0)
 * Generates perfect 90-second video segment JSON plans in continuous streaming mode.
 * Model priority: Veo 3.1 | Kling 3.0 | Sora 2 | Runway Gen-4.5
 */

export type ModelPreference = 'Veo 3.1' | 'Kling 3.0' | 'Sora 2' | 'Runway Gen-4.5';

export interface ChronosShot {
  shot_number: number;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  visual_description: string;
  model_preference: ModelPreference;
  image_seed_description: string;
}

export interface ChronosSegment {
  segment_number: number;
  title: string;
  overall_style: string;
  shots: ChronosShot[];
  stitching_instructions: string;
  continuity_notes: string;
}

export interface ChronosState {
  current_query: string;
  segment_number: number;
  previous_clip_url: string | null;
  previous_segment: ChronosSegment | null;
}

const DEMO_VIDEO_POOL = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
];

/**
 * Generates a Chronos segment plan from the user prompt + optional previous context.
 * In production: call Grok 4 (Demiurge) via xAI API with the system prompt.
 * In demo mode: returns a deterministic mock plan + picks a demo video URL.
 */
export function buildChronosSystemPrompt(): string {
  return `You are Chronos — the Timeline & Cinematic Curator of GlobeSim v2.0 in CONTINUOUS STREAMING MODE.

Your only job is to generate perfect 90-second video segments that flow seamlessly into each other indefinitely.

CRITICAL RULES:
- First call (no previous_clip): Generate the opening 90-second segment based on the user's request.
- Subsequent calls (with previous_clip data): Generate the next 90-second segment that continues directly from the exact ending of the previous one.
- Always maintain 100% visual, physical, character, and story continuity.
- Pull real details from the current world state (characters inspired by Muse, locations from Terra/Gaia, physics from Aether).
- Target exactly 90 seconds per segment.
- Use 2026 model priority: Veo 3.1 (cinematic), Kling 3.0 (humans), Sora 2 (emotion/physics), Runway Gen-4.5 (transitions).

OUTPUT ONLY VALID JSON — nothing else.`;
}

export function buildChronosUserPrompt(state: ChronosState): string {
  const base = `User request: "${state.current_query}"\nSegment number: ${state.segment_number}`;
  if (!state.previous_segment) {
    return `${base}\nThis is the OPENING segment. Generate the first 90 seconds.`;
  }
  return `${base}
Previous segment ended with: "${state.previous_segment.continuity_notes}"
Last shot description: "${state.previous_segment.shots.at(-1)?.visual_description ?? ''}"
Continue DIRECTLY from this exact frame. Maintain all character/environment/color continuity.`;
}

/**
 * Generates a segment plan. Calls xAI Grok 4 if GROK_API_KEY is set; otherwise returns a mock.
 */
export async function generateChronosSegment(state: ChronosState): Promise<ChronosSegment> {
  // Production path: call Grok 4
  if (process.env.GROK_API_KEY) {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4',
        messages: [
          { role: 'system', content: buildChronosSystemPrompt() },
          { role: 'user', content: buildChronosUserPrompt(state) },
        ],
        temperature: 0.85,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) throw new Error(`Grok 4 API error: ${res.status}`);
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? '{}';
    return JSON.parse(raw) as ChronosSegment;
  }

  // Demo / stub path
  return buildMockSegment(state);
}

/**
 * Picks a demo video URL for the segment.
 * In production, this would call Veo 3.1 / Kling 3.0 / Sora 2 with the shot plan.
 */
export function pickDemoVideoUrl(segmentNumber: number): string {
  return DEMO_VIDEO_POOL[(segmentNumber - 1) % DEMO_VIDEO_POOL.length];
}

// ---------------------------------------------------------------------------
// Mock generator — used when no real API keys are present
// ---------------------------------------------------------------------------
function buildMockSegment(state: ChronosState): ChronosSegment {
  const n = state.segment_number;
  const prev = state.previous_segment;

  const openingShots: ChronosShot[] = [
    {
      shot_number: 1,
      start_time: '0:00',
      end_time: '0:18',
      duration_seconds: 18,
      visual_description: `Opening establishing shot — ${state.current_query}. Slow drone pull-back from a macro detail revealing the full environment. Photorealistic 4K, cinematic Rec.2020, natural volumetric lighting.`,
      model_preference: 'Veo 3.1',
      image_seed_description: `First frame of "${state.current_query}" — extreme close-up, shallow DOF, golden-hour light.`,
    },
    {
      shot_number: 2,
      start_time: '0:18',
      end_time: '0:36',
      duration_seconds: 18,
      visual_description: `Mid-shot introducing protagonist in the world of "${state.current_query}". Kling 3.0 human fidelity. Expression: determined curiosity. Camera: steady dolly-in.`,
      model_preference: 'Kling 3.0',
      image_seed_description: `Protagonist mid-frame, environment clearly established, lighting matches shot 1.`,
    },
    {
      shot_number: 3,
      start_time: '0:36',
      end_time: '0:54',
      duration_seconds: 18,
      visual_description: `Emotional peak — physics-driven action sequence. Sora 2 for realistic cloth, water, and particle effects. Camera: handheld with slight motion blur.`,
      model_preference: 'Sora 2',
      image_seed_description: `Action frame with dynamic motion vectors — matches protagonist from shot 2.`,
    },
    {
      shot_number: 4,
      start_time: '0:54',
      end_time: '1:12',
      duration_seconds: 18,
      visual_description: `Resolution beat — calm after the action. Wide establishing shot. Runway Gen-4.5 match-cut transition from shot 3's last frame. Soft gradient fade into next scene.`,
      model_preference: 'Runway Gen-4.5',
      image_seed_description: `Wide shot, same color grade and time-of-day as shot 1, protagonist visible in distance.`,
    },
    {
      shot_number: 5,
      start_time: '1:12',
      end_time: '1:30',
      duration_seconds: 18,
      visual_description: `Cliffhanger closing shot — a new element enters the frame teasing the next segment. Slow zoom. Veo 3.1 cinematic quality. End frame: protagonist facing new obstacle.`,
      model_preference: 'Veo 3.1',
      image_seed_description: `Final frame: protagonist silhouetted against a dramatic background — designed to match-cut into segment ${n + 1}.`,
    },
  ];

  const continuationShots: ChronosShot[] = openingShots.map((shot, i) => ({
    ...shot,
    visual_description: i === 0
      ? `CONTINUATION from segment ${n - 1} — picks up EXACTLY where previous ended: "${prev?.continuity_notes ?? ''}". ${shot.visual_description}`
      : shot.visual_description,
    image_seed_description: i === 0
      ? `First frame matches last frame of segment ${n - 1} precisely — same lighting, character position, and color grade.`
      : shot.image_seed_description,
  }));

  return {
    segment_number: n,
    title: `${state.current_query} — Segment ${n}`,
    overall_style: 'Photorealistic 4K, Rec.2020 wide color, cinematic 2.39:1 anamorphic, -0.3 EV exposure, teal/orange grade',
    shots: n === 1 ? openingShots : continuationShots,
    stitching_instructions: n === 1
      ? 'No previous clip. Use as segment 1 anchor.'
      : `ffmpeg -i seg${n - 1}.mp4 -i seg${n}.mp4 -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=${(n - 1) * 90 - 0.5}[v];[0:a][1:a]acrossfade=d=0.5[a]" -map "[v]" -map "[a]" output_seg${n}.mp4`,
    continuity_notes: `Segment ${n} ends on protagonist facing new obstacle at ${state.current_query} location. Next segment should open on the same frame.`,
  };
}
