import { GoogleGenerativeAI } from '@google/generative-ai';
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
 * Analyze climbing video frames using Gemini Vision
 */
export async function analyzeWithClaude(
  frameUrls: string[],
  routeName: string
): Promise<ClaudeAnalysisResult> {
  if (!env.GOOGLE_API_KEY) {
    throw new Error('Google API key not configured');
  }

  const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });

  // Fetch frames and convert to base64 inline data
  const imageParts = await Promise.all(
    frameUrls.map(async (url) => {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      return {
        inlineData: {
          mimeType: 'image/jpeg' as const,
          data: Buffer.from(buffer).toString('base64'),
        },
      };
    })
  );

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

  const result = await model.generateContent([...imageParts, { text: prompt }]);
  const text = result.response.text().trim();

  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not extract JSON from Gemini response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as ClaudeAnalysisResult;

  // Validate and clamp scores
  for (const key of ['fluidite', 'technique', 'precision', 'endurance', 'creativite'] as const) {
    parsed.scores[key] = Math.max(0, Math.min(100, Math.round(parsed.scores[key] ?? 50)));
  }

  if (!Array.isArray(parsed.suggestions)) parsed.suggestions = [];
  if (!Array.isArray(parsed.highlights)) parsed.highlights = [];

  return parsed;
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
