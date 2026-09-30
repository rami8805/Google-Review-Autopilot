import { GoogleGenAI } from '@google/genai';
import type {
  BrandVoice,
  RiskAssessment,
  RiskLevel,
  StarRating,
} from '../../../shared/types/domain';
import type {
  AiEngineInput,
  AiEngineOutput,
  AiRiskLevel,
  AiSentiment,
  AiSuggestedAction,
} from './types';
import {
  CURRENT_PROMPT_VERSION,
  buildSystemInstruction,
  buildUserPrompt,
} from './prompts';
import { geminiReviewAnalysisResponseSchema, validateAndParseAiOutput } from './schemas';
import {
  preAnalyzeReview,
  postValidateAiOutput,
  buildSafeDeterministicReply,
} from './validator';

export interface IAiReplyEngine {
  analyzeAndGenerateReply(input: AiEngineInput): Promise<AiEngineOutput>;
  assessRisk(reviewText: string, rating: number): Promise<RiskAssessment>;
  generateReplyDraft(params: {
    reviewText: string;
    authorName: string;
    rating: number;
    brandVoice: BrandVoice;
    riskAssessment: RiskAssessment;
  }): Promise<{
    proposedText: string;
    model: string;
    tokensUsed?: number;
    structuredOutput?: AiEngineOutput;
  }>;
}

export class GeminiAiReplyEngine implements IAiReplyEngine {
  private aiClient: GoogleGenAI | null = null;
  private modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY') {
      this.aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }

    // Default to gemini-3.8-flash per Google GenAI guidelines
    const configured = modelName || process.env.GEMINI_MODEL;
    const isDeprecated =
      !configured ||
      configured.includes('gemini-2.5') ||
      configured.includes('gemini-2.0') ||
      configured.includes('gemini-1.5') ||
      configured.includes('gemini-pro');

    this.modelName = isDeprecated ? 'gemini-3.8-flash' : configured;
  }

  /**
   * Main production entrypoint: Comprehensive analysis, risk assessment, and safe reply generation
   */
  async analyzeAndGenerateReply(input: AiEngineInput): Promise<AiEngineOutput> {
    const starRating = (input.rating || 5) as StarRating;
    const reviewText = input.reviewText || '';

    // Step 1: Pre-analysis heuristics & injection shield
    const preCheck = preAnalyzeReview(reviewText, starRating);

    let rawOutput: AiEngineOutput | null = null;

    // Step 2: Call Gemini API if client is available
    if (this.aiClient) {
      try {
        const systemInstruction = buildSystemInstruction(CURRENT_PROMPT_VERSION);
        const userPrompt = buildUserPrompt({
          reviewText,
          rating: starRating,
          reviewerName: input.reviewerName,
          businessName: input.businessContext?.businessName,
          category: input.businessContext?.category,
          brandVoiceTone: input.brandVoice?.tone,
          signOffTemplate: input.brandVoice?.signOffTemplate,
          trustedBusinessContext: input.brandVoice?.trustedBusinessContext,
          relevantBusinessFacts: input.relevantBusinessFacts || input.businessContext?.relevantBusinessFacts,
        });

        const response = await this.aiClient.models.generateContent({
          model: this.modelName,
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: geminiReviewAnalysisResponseSchema,
            temperature: 0.2, // Low temperature for high consistency and safety
          },
        });

        const text = response.text;
        if (text) {
          rawOutput = validateAndParseAiOutput(text);
        }
      } catch (err) {
        console.warn('[GeminiAiReplyEngine] Gemini API call failed or timed out, executing deterministic fallback:', err);
      }
    }

    // Step 3: If no AI client or generation failed/malformed, synthesize deterministic safe output
    if (!rawOutput) {
      rawOutput = this.buildDeterministicOutput(input, preCheck);
    }

    // Merge detected topics from pre-check
    const mergedTopics = Array.from(
      new Set([...preCheck.detectedTopics, ...(rawOutput.detectedTopics || [])])
    );
    rawOutput.detectedTopics = mergedTopics;

    // Step 4: Strict Post-Validation & Safety Guards
    const postValidation = postValidateAiOutput(rawOutput, input, preCheck);

    return {
      sentiment: rawOutput.sentiment,
      riskLevel: postValidation.enforcedRisk,
      suggestedAction: postValidation.enforcedAction,
      reply: postValidation.sanitizedReply,
      detectedTopics: mergedTopics,
      reasoningSummary: rawOutput.reasoningSummary,
      promptVersion: CURRENT_PROMPT_VERSION,
      languageDetected: rawOutput.languageDetected || 'en',
      safetyFlags: preCheck.safetyFlags,
      forbiddenContentViolations: postValidation.violations,
    };
  }

  /**
   * Deterministic fallback when Gemini API is unavailable or returns an error
   */
  private buildDeterministicOutput(
    input: AiEngineInput,
    preCheck: ReturnType<typeof preAnalyzeReview>
  ): AiEngineOutput {
    let sentiment: AiSentiment = 'NEUTRAL';
    if (input.rating >= 4) {
      sentiment = 'POSITIVE';
    } else if (input.rating === 3) {
      sentiment = 'MIXED';
    } else {
      sentiment = 'NEGATIVE';
    }

    const reply = buildSafeDeterministicReply(input, preCheck.riskFloor, sentiment);

    let suggestedAction: AiSuggestedAction = 'REQUIRE_APPROVAL';
    if (input.rating >= 4 && preCheck.riskFloor === 'LOW') {
      suggestedAction = 'AUTO_PUBLISH';
    }

    return {
      sentiment,
      riskLevel: preCheck.riskFloor,
      suggestedAction,
      reply,
      detectedTopics: preCheck.detectedTopics,
      reasoningSummary:
        preCheck.detectedTopics.length > 0
          ? `Deterministic safety fallback applied. Flagged topics: ${preCheck.detectedTopics.join(', ')}.`
          : `Deterministic safety fallback applied for ${input.rating}-star review.`,
      promptVersion: CURRENT_PROMPT_VERSION,
      languageDetected: 'en',
    };
  }

  /**
   * Backward-compatible risk assessment method matching RiskAssessment domain type
   */
  async assessRisk(reviewText: string, rating: number): Promise<RiskAssessment> {
    const preCheck = preAnalyzeReview(reviewText, rating as StarRating);

    const flags: RiskAssessment['flags'] = [];
    if (preCheck.isPromptInjection) flags.push('UNTRUSTED_CONTENT_INJECTION');
    if (preCheck.detectedTopics.includes('legal')) flags.push('LEGAL_THREAT');
    if (preCheck.detectedTopics.includes('safety')) flags.push('SAFETY_ISSUE');
    if (preCheck.detectedTopics.includes('harassment')) flags.push('HARASSMENT');
    if (preCheck.detectedTopics.includes('serious refund disputes')) flags.push('COMPENSATION_REQUEST');
    if (preCheck.detectedTopics.includes('employee_named')) flags.push('EMPLOYEE_NAMED');
    if (preCheck.detectedTopics.includes('fraud')) flags.push('FALSE_ACCUSATION');

    const recommendedAction =
      rating >= 4 && preCheck.riskFloor === 'LOW' ? 'AUTO_PUBLISH' : 'REQUIRE_APPROVAL';

    return {
      riskLevel: preCheck.riskFloor,
      flags,
      explanation:
        flags.length > 0
          ? `Flagged for: ${flags.join(', ')}.`
          : rating <= 3
          ? 'Non-positive rating requires manual human oversight.'
          : 'Low risk positive review eligible for auto-publication.',
      confidenceScore: 0.96,
      recommendedAction,
    };
  }

  /**
   * Backward-compatible reply draft generator
   */
  async generateReplyDraft(params: {
    reviewText: string;
    authorName: string;
    rating: number;
    brandVoice: BrandVoice;
    riskAssessment: RiskAssessment;
  }): Promise<{
    proposedText: string;
    model: string;
    tokensUsed?: number;
    structuredOutput?: AiEngineOutput;
  }> {
    const analysis = await this.analyzeAndGenerateReply({
      reviewText: params.reviewText,
      rating: params.rating as StarRating,
      reviewerName: params.authorName,
      brandVoice: {
        tone: params.brandVoice.tone,
        signOffTemplate: params.brandVoice.signOffTemplate,
        trustedBusinessContext: params.brandVoice.trustedBusinessContext,
      },
      businessContext: {
        businessName: 'Downtown Dental SF',
      },
    });

    return {
      proposedText: analysis.reply,
      model: this.aiClient ? this.modelName : 'safe-deterministic-engine',
      structuredOutput: analysis,
    };
  }
}
