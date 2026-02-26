import Anthropic from '@anthropic-ai/sdk';
import { env } from '../env';

export interface AnalysisScores {
  fluidite: number;
  technique: number;
  precision: number;
  endurance: number;
  creativite: number;
  global: number;
}

export interface ClaudeAnalysisResult {
  scores: {
    fluidite: number;
    technique: number;
    precision: number;
    endurance: number;
    creativite: number;
  };
  suggestions: string[];
  highlights: string[];
}

/**
 * Extract frame URLs from a Cloudinary video using percentage-based offsets
 */
export function extractCloudinaryFrames(videoPublicId: string, count: number = 5): string[] {
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('Cloudinary not configured');
  }

  // Use evenly spaced percentage offsets
  const offsets = count === 5
    ? [10, 25, 50, 70, 90]
    : Array.from({ length: count }, (_, i) => Math.round((i + 1) * (100 / (count + 1))));

  return offsets.map(pct =>
    `https://res.cloudinary.com/${cloudName}/video/upload/so_${pct}p/${videoPublicId}.jpg`
  );
}

/**
 * Analyze climbing video frames using Claude Vision
 */
export async function analyzeWithClaude(
  frameUrls: string[],
  routeName: string
): Promise<ClaudeAnalysisResult> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const imageContent: Anthropic.ImageBlockParam[] = frameUrls.map(url => ({
    type: 'image',
    source: { type: 'url', url },
  }));

  const prompt = `Tu es un coach d'escalade de bloc expert. Analyse ces ${frameUrls.length} frames extraites d'une vidéo de grimpe.

Route : "${routeName}"

Évalue le grimpeur sur 100 selon ces critères :
- Fluidité des mouvements (30% du score global) : transitions, continuité, absence de blocages
- Technique des pieds (25%) : placement précis, utilisation optimale
- Précision sur les prises (20%) : saisie efficace, économie d'effort
- Économie de mouvement / Endurance (15%) : gestion de l'énergie, positions de repos
- Créativité / Adaptabilité (10%) : solutions originales, lecture de voie

IMPORTANT : Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après, sans markdown :
{
  "scores": {
    "fluidite": <nombre entre 0 et 100>,
    "technique": <nombre entre 0 et 100>,
    "precision": <nombre entre 0 et 100>,
    "endurance": <nombre entre 0 et 100>,
    "creativite": <nombre entre 0 et 100>
  },
  "suggestions": [
    "<conseil d'amélioration 1>",
    "<conseil d'amélioration 2>",
    "<conseil d'amélioration 3>"
  ],
  "highlights": [
    "<point fort observé 1>",
    "<point fort observé 2>"
  ]
}`;

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: [
          ...imageContent,
          { type: 'text', text: prompt },
        ],
      },
    ],
  });

  const response = await stream.finalMessage();

  // Extract the text content (skip thinking blocks)
  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Parse JSON response
  const jsonText = textBlock.text.trim();
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not extract JSON from Claude response');
  }

  const result = JSON.parse(jsonMatch[0]) as ClaudeAnalysisResult;

  // Validate and clamp scores
  for (const key of ['fluidite', 'technique', 'precision', 'endurance', 'creativite'] as const) {
    result.scores[key] = Math.max(0, Math.min(100, Math.round(result.scores[key] ?? 50)));
  }

  if (!Array.isArray(result.suggestions)) result.suggestions = [];
  if (!Array.isArray(result.highlights)) result.highlights = [];

  return result;
}

/**
 * Compute the weighted global score from individual dimension scores
 */
export function aggregateScores(result: ClaudeAnalysisResult): AnalysisScores {
  const { fluidite, technique, precision, endurance, creativite } = result.scores;
  const global = Math.round(
    fluidite * 0.30 +
    technique * 0.25 +
    precision * 0.20 +
    endurance * 0.15 +
    creativite * 0.10
  );

  return { fluidite, technique, precision, endurance, creativite, global };
}
