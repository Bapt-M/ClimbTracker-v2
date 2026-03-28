import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
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

export function buildPrompt(routeName: string): string {
  return `Tu es un coach d'escalade de bloc expert. Analyse cette vidéo de grimpe dans son intégralité.

Route : "${routeName}"

Tu vois l'ensemble du bloc — utilise le contexte temporel pour évaluer les transitions, le rythme et les hésitations.

Évalue le grimpeur sur 100 selon ces critères :
- Fluidité des mouvements (30% du score global) : transitions, continuité, absence de blocages
- Technique des pieds (25%) : placement précis, utilisation optimale
- Précision sur les prises (20%) : saisie efficace, économie d'effort
- Économie de mouvement / Endurance (15%) : gestion de l'énergie, positions de repos
- Créativité / Adaptabilité (10%) : solutions originales, lecture de voie

Pour chaque suggestion, cite le moment précis si possible (ex: "À 0:12, le coude droit est trop fléchi").

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
}

export function parseAndValidate(text: string): ClaudeAnalysisResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not extract JSON from Gemini response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as ClaudeAnalysisResult;

  if (!parsed.scores || typeof parsed.scores !== 'object') {
    parsed.scores = { fluidite: 50, technique: 50, precision: 50, endurance: 50, creativite: 50 };
  }

  for (const key of ['fluidite', 'technique', 'precision', 'endurance', 'creativite'] as const) {
    parsed.scores[key] = Math.max(0, Math.min(100, Math.round(parsed.scores[key] ?? 50)));
  }

  if (!Array.isArray(parsed.suggestions)) parsed.suggestions = [];
  if (!Array.isArray(parsed.highlights)) parsed.highlights = [];

  return parsed;
}

export async function analyzeVideoWithGemini(
  tmpPath: string,
  mimeType: string,
  routeName: string,
): Promise<ClaudeAnalysisResult> {
  if (!env.GOOGLE_API_KEY) throw new Error('Google API key not configured');

  const fileManager = new GoogleAIFileManager(env.GOOGLE_API_KEY);

  const upload = await fileManager.uploadFile(tmpPath, {
    mimeType,
    displayName: routeName,
  });

  let file = await fileManager.getFile(upload.file.name);
  let waited = 0;
  while (file.state === FileState.PROCESSING) {
    if (waited >= 90_000) throw new Error('Gemini file processing timed out');
    await new Promise(r => setTimeout(r, 5_000));
    waited += 5_000;
    file = await fileManager.getFile(upload.file.name);
  }
  if (file.state === FileState.FAILED) throw new Error('Gemini file processing failed');

  const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' }); // verified working

  let result: Awaited<ReturnType<typeof model.generateContent>>;
  try {
    result = await model.generateContent([
      { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
      { text: buildPrompt(routeName) },
    ]);
  } finally {
    fileManager.deleteFile(upload.file.name).catch(() => {});
  }

  return parseAndValidate(result!.response.text());
}

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
