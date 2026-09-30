import { Type, type Schema } from '@google/genai';
import type { AiEngineOutput, AiRiskLevel, AiSentiment, AiSuggestedAction } from './types';
import { CURRENT_PROMPT_VERSION } from './prompts';

/**
 * Gemini responseSchema definition using @google/genai Type enum
 */
export const geminiReviewAnalysisResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sentiment: {
      type: Type.STRING,
      description: 'The overall sentiment of the review: POSITIVE, NEUTRAL, NEGATIVE, or MIXED.',
      enum: ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED'],
    },
    riskLevel: {
      type: Type.STRING,
      description: 'The assessed risk level: LOW, MEDIUM, HIGH, or CRITICAL.',
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    },
    suggestedAction: {
      type: Type.STRING,
      description: 'Recommended workflow action: AUTO_PUBLISH, REQUIRE_APPROVAL, or DO_NOT_REPLY.',
      enum: ['AUTO_PUBLISH', 'REQUIRE_APPROVAL', 'DO_NOT_REPLY'],
    },
    reply: {
      type: Type.STRING,
      description: 'The drafted public response text adhering strictly to brand voice and safety rules.',
    },
    detectedTopics: {
      type: Type.ARRAY,
      description: 'List of detected topics and sensitive markers (e.g. legal, safety, injury, medical, refund, etc.).',
      items: {
        type: Type.STRING,
      },
    },
    reasoningSummary: {
      type: Type.STRING,
      description: 'Concise explanation justifying the sentiment, risk level, and suggested action.',
    },
    promptVersion: {
      type: Type.STRING,
      description: 'The prompt version used for generating this response.',
    },
    languageDetected: {
      type: Type.STRING,
      description: 'The detected language of the review (e.g. "en", "es", "fr", "de", "ja").',
    },
  },
  required: [
    'sentiment',
    'riskLevel',
    'suggestedAction',
    'reply',
    'detectedTopics',
    'reasoningSummary',
    'promptVersion',
  ],
};

/**
 * Validates and safely parses raw JSON string or object into AiEngineOutput.
 * Throws an Error if required keys are missing or malformed.
 */
export function validateAndParseAiOutput(raw: unknown): AiEngineOutput {
  let parsed: any = raw;

  if (typeof raw === 'string') {
    try {
      // Clean possible markdown code fences if present
      let clean = raw.trim();
      if (clean.startsWith('```json')) {
        clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (clean.startsWith('```')) {
        clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      parsed = JSON.parse(clean);
    } catch (err) {
      throw new Error(`Failed to parse AI output as JSON: ${(err as Error).message}`);
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Malformed AI response: output must be a non-null object.');
  }

  const validSentiments = ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED'];
  const validRiskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const validActions = ['AUTO_PUBLISH', 'REQUIRE_APPROVAL', 'DO_NOT_REPLY'];

  const sentiment = validSentiments.includes(parsed.sentiment)
    ? (parsed.sentiment as AiSentiment)
    : 'NEUTRAL';

  const riskLevel = validRiskLevels.includes(parsed.riskLevel)
    ? (parsed.riskLevel as AiRiskLevel)
    : 'MEDIUM';

  const suggestedAction = validActions.includes(parsed.suggestedAction)
    ? (parsed.suggestedAction as AiSuggestedAction)
    : 'REQUIRE_APPROVAL';

  if (typeof parsed.reply !== 'string' || !parsed.reply.trim()) {
    throw new Error('Malformed AI response: "reply" must be a non-empty string.');
  }

  const detectedTopics: string[] = Array.isArray(parsed.detectedTopics)
    ? parsed.detectedTopics.filter((t: any) => typeof t === 'string' && t.trim().length > 0)
    : [];

  const reasoningSummary =
    typeof parsed.reasoningSummary === 'string' && parsed.reasoningSummary.trim()
      ? parsed.reasoningSummary.trim()
      : 'Automated analysis performed.';

  const promptVersion =
    typeof parsed.promptVersion === 'string' && parsed.promptVersion.trim()
      ? parsed.promptVersion.trim()
      : CURRENT_PROMPT_VERSION;

  const languageDetected =
    typeof parsed.languageDetected === 'string' ? parsed.languageDetected.trim() : 'en';

  return {
    sentiment,
    riskLevel,
    suggestedAction,
    reply: parsed.reply.trim(),
    detectedTopics,
    reasoningSummary,
    promptVersion,
    languageDetected,
  };
}
