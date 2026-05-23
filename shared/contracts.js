/**
 * Shared API contracts — single source of truth for what the backend
 * sends and what the frontend expects. Written in CommonJS so the
 * Express backend can `require()` it directly, and consumed by Vite
 * on the frontend via its built-in CJS interop.
 *
 * Whenever a new endpoint is added or an existing one changes shape,
 * update the schema here FIRST and then run both sides against it.
 * Every contract drift bug we hit (Failed-to-file-report, blank
 * Patterns page, undefined symbol stamps) would have been caught at
 * runtime by these parsers — and statically by your IDE if you ever
 * migrate to TypeScript using `zod-to-ts`.
 */

const { z } = require('zod');

/* ─────────────────────────────────────────────────────────────────────
 * Enums and primitives
 * ────────────────────────────────────────────────────────────────────*/

const ProcessingStatus = z.enum(['pending', 'processing', 'complete', 'failed']);

const EmotionItem = z.object({
  label: z.string(),
  score: z.number(),
});

const SymbolItem = z.object({
  label: z.string(),
  score: z.number(),
});

const RelatedDream = z.object({
  dreamId: z.string(),
  similarity: z.number(),
  title: z.string().nullable().optional(),
});

const AnalysisDetail = z.object({
  title: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  psychologicalInterpretation: z.string().nullable().optional(),
  cinematicDescription: z.string().nullable().optional(),
  dominantTheme: z.string().nullable().optional(),
  environment: z.string().nullable().optional(),
  mood: z.string().nullable().optional(),
});

/* ─────────────────────────────────────────────────────────────────────
 * POST /api/dreams  (request)
 *
 * Discriminated union so a 'text' submission requires a transcript and
 * an 'audio' submission carries the file through multer separately
 * (we don't validate the file shape here — multer + the mime filter
 * own that responsibility).
 * ────────────────────────────────────────────────────────────────────*/

const CreateDreamTextBody = z.object({
  inputType: z.literal('text'),
  transcript: z
    .string()
    .trim()
    .min(50, 'Transcript must be at least 50 characters for text submission'),
});

const CreateDreamAudioBody = z.object({
  inputType: z.literal('audio'),
  transcript: z.string().optional(),
});

const CreateDreamRequest = z.discriminatedUnion('inputType', [
  CreateDreamTextBody,
  CreateDreamAudioBody,
]);

const CreateDreamResponse = z.object({
  dreamId: z.string(),
  message: z.string(),
});

/* ─────────────────────────────────────────────────────────────────────
 * GET /api/dreams/status/:id  (response)
 *
 * This contract was the root cause of the "Developing Film" hang —
 * the frontend was reading `res.status` instead of
 * `res.processingStatus`. Now both sides parse the same schema.
 * ────────────────────────────────────────────────────────────────────*/

const DreamStatusResponse = z.object({
  dreamId: z.string(),
  processingStatus: ProcessingStatus,
  processingError: z.string().nullable().optional(),
});

/* ─────────────────────────────────────────────────────────────────────
 * GET /api/analytics/patterns  (response)
 *
 * This contract was the root cause of the blank Patterns page — the
 * frontend was reading `e.emotion`/`e.percentage`/`s.symbol`/
 * `dominantEmotion`/`connections`, none of which exist on the Pattern
 * Mongoose schema. The real shape, captured here, is what both sides
 * now agree on.
 * ────────────────────────────────────────────────────────────────────*/

const SymbolFrequencyItem = z.object({
  label: z.string(),
  count: z.number(),
  percentage: z.number(),
});

const EmotionTrendItem = z.object({
  label: z.string(),
  averageScore: z.number(),
  dreamCount: z.number(),
});

const DominantEmotionHistoryItem = z.object({
  emotion: z.string(),
  date: z.coerce.date(),
});

const PatternsResponse = z.object({
  userId: z.string().optional(),
  symbolFrequency: z.array(SymbolFrequencyItem).default([]),
  emotionTrends: z.array(EmotionTrendItem).default([]),
  dominantEmotionHistory: z.array(DominantEmotionHistoryItem).default([]),
  totalDreams: z.number().default(0),
  lastUpdated: z.coerce.date().optional(),
});

/* ─────────────────────────────────────────────────────────────────────
 * Helper: safeParse with a friendly thrown error
 * ────────────────────────────────────────────────────────────────────*/

function parseOrThrow(schema, value, label) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ');
    const err = new Error(`Contract violation in ${label}: ${issues}`);
    err.code = 'CONTRACT_VIOLATION';
    err.issues = result.error.issues;
    throw err;
  }
  return result.data;
}

module.exports = {
  // enums + primitives
  ProcessingStatus,
  EmotionItem,
  SymbolItem,
  RelatedDream,
  AnalysisDetail,

  // POST /api/dreams
  CreateDreamRequest,
  CreateDreamResponse,

  // GET /api/dreams/status/:id
  DreamStatusResponse,

  // GET /api/analytics/patterns
  PatternsResponse,
  SymbolFrequencyItem,
  EmotionTrendItem,
  DominantEmotionHistoryItem,

  // helpers
  parseOrThrow,
};
