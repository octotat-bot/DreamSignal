/**
 * Shared API contracts — single source of truth for what the backend
 * sends and what the frontend expects.
 *
 * Authored as native ESM so Vite can serve it directly to the browser
 * without running a CommonJS-to-ESM transform on out-of-root files. The
 * backend (CommonJS) consumes this module via dynamic `import()` from
 * inside async controllers. The `shared/package.json` sibling carries
 * `"type": "module"` so Node interprets this file as ESM regardless of
 * the parent backend package's CJS default.
 *
 * Whenever a new endpoint is added or an existing one changes shape,
 * update the schema here FIRST and then run both sides against it.
 * Every contract drift bug we hit (Failed-to-file-report, blank
 * Patterns page, undefined symbol stamps) would have been caught at
 * runtime by these parsers — and statically by your IDE if you ever
 * migrate to TypeScript using `zod-to-ts`.
 */

import { z } from 'zod';

/* ─────────────────────────────────────────────────────────────────────
 * Enums and primitives
 * ────────────────────────────────────────────────────────────────────*/

export const ProcessingStatus = z.enum(['pending', 'processing', 'complete', 'failed']);

export const EmotionItem = z.object({
  label: z.string(),
  score: z.number(),
});

export const SymbolItem = z.object({
  label: z.string(),
  score: z.number(),
});

export const RelatedDream = z.object({
  dreamId: z.string(),
  similarity: z.number(),
  title: z.string().nullable().optional(),
});

export const AnalysisDetail = z.object({
  title: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  psychologicalInterpretation: z.string().nullable().optional(),
  cinematicDescription: z.string().nullable().optional(),
  dominantTheme: z.string().nullable().optional(),
  environment: z.string().nullable().optional(),
  mood: z.string().nullable().optional(),
});

/* ─────────────────────────────────────────────────────────────────────
 * Helpers for multipart submissions
 *
 * Multipart/form-data stringifies every value, so booleans arrive as
 * strings and arrays arrive as JSON-encoded strings. These helpers
 * accept both wire formats and normalize to native JS types.
 * ────────────────────────────────────────────────────────────────────*/

const flag = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return ['true', '1', 'yes', 'on'].includes(v.toLowerCase());
    return false;
  });

const tagsField = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((raw) => {
    if (!raw) return [];
    let list;
    if (Array.isArray(raw)) list = raw;
    else {
      try {
        const parsed = JSON.parse(raw);
        list = Array.isArray(parsed) ? parsed : [String(raw)];
      } catch {
        list = String(raw).split(',');
      }
    }
    return Array.from(
      new Set(list.map((t) => String(t).trim().toLowerCase()).filter(Boolean))
    ).slice(0, 12);
  });

/* ─────────────────────────────────────────────────────────────────────
 * POST /api/dreams  (request)
 * ────────────────────────────────────────────────────────────────────*/

export const CreateDreamTextBody = z.object({
  inputType: z.literal('text'),
  transcript: z
    .string()
    .trim()
    .min(50, 'Transcript must be at least 50 characters for text submission'),
  tags: tagsField,
  isLucid: flag,
  isRecurring: flag,
  isNightmare: flag,
});

export const CreateDreamAudioBody = z.object({
  inputType: z.literal('audio'),
  transcript: z.string().optional(),
  tags: tagsField,
  isLucid: flag,
  isRecurring: flag,
  isNightmare: flag,
});

export const CreateDreamRequest = z.discriminatedUnion('inputType', [
  CreateDreamTextBody,
  CreateDreamAudioBody,
]);

export const CreateDreamResponse = z.object({
  dreamId: z.string(),
  message: z.string(),
});

/* ─────────────────────────────────────────────────────────────────────
 * GET /api/dreams/status/:id  (response)
 * ────────────────────────────────────────────────────────────────────*/

export const DreamStatusResponse = z.object({
  dreamId: z.string(),
  processingStatus: ProcessingStatus,
  processingError: z.string().nullable().optional(),
});

/* ─────────────────────────────────────────────────────────────────────
 * GET /api/analytics/patterns  (response)
 * ────────────────────────────────────────────────────────────────────*/

export const SymbolFrequencyItem = z.object({
  label: z.string(),
  count: z.number(),
  percentage: z.number(),
});

export const EmotionTrendItem = z.object({
  label: z.string(),
  averageScore: z.number(),
  dreamCount: z.number(),
});

export const DominantEmotionHistoryItem = z.object({
  emotion: z.string(),
  date: z.coerce.date(),
});

export const PatternsResponse = z.object({
  userId: z.string().optional(),
  symbolFrequency: z.array(SymbolFrequencyItem).default([]),
  emotionTrends: z.array(EmotionTrendItem).default([]),
  dominantEmotionHistory: z.array(DominantEmotionHistoryItem).default([]),
  totalDreams: z.number().default(0),
  lastUpdated: z.coerce.date().optional(),
});
