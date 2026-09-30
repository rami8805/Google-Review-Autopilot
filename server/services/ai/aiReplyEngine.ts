import { GoogleGenAI } from '@google/genai';
import type { BrandVoice, RiskAssessment, RiskLevel } from '../../../shared/types/domain';
import {
  FORBIDDEN_AI_INVENTIONS,
  UNTRUSTED_REVIEW_DEFENSE_PROMPT,
} from '../../../shared/constants/automation';

export interface IAiReplyEngine {
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
  }>;
}

export class GeminiAiReplyEngine implements IAiReplyEngine {
  private aiClient: GoogleGenAI | null = null;
  private modelName: string;

  constructor(apiKey?: string, modelName = 'gemini-2.5-flash') {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY') {
      this.aiClient = new GoogleGenAI({ apiKey: key });
    }
    this.modelName = modelName;
  }

  async assessRisk(reviewText: string, rating: number): Promise<RiskAssessment> {
    const lower = reviewText.toLowerCase();

    // Check for high-severity markers deterministically
    const hasLegalThreat =
      lower.includes('lawyer') ||
      lower.includes('sue') ||
      lower.includes('attorney') ||
      lower.includes('legal action');
    const hasSafetyIssue =
      lower.includes('poison') ||
      lower.includes('hospital') ||
      lower.includes('injury') ||
      lower.includes('danger');
    const hasCompensationRequest =
      lower.includes('refund') ||
      lower.includes('money back') ||
      lower.includes('reimburse') ||
      lower.includes('compensation');
    const hasInjectionAttempt =
      lower.includes('ignore previous instructions') ||
      lower.includes('system prompt') ||
      lower.includes('as an ai language model');

    const flags: RiskAssessment['flags'] = [];
    if (hasLegalThreat) flags.push('LEGAL_THREAT');
    if (hasSafetyIssue) flags.push('SAFETY_ISSUE');
    if (hasCompensationRequest) flags.push('COMPENSATION_REQUEST');
    if (hasInjectionAttempt) flags.push('UNTRUSTED_CONTENT_INJECTION');

    let riskLevel: RiskLevel = 'LOW';
    if (hasLegalThreat || hasSafetyIssue || hasInjectionAttempt) {
      riskLevel = 'CRITICAL';
    } else if (hasCompensationRequest || rating === 1) {
      riskLevel = 'HIGH';
    } else if (rating === 2 || rating === 3) {
      riskLevel = 'MEDIUM';
    }

    const recommendedAction =
      rating >= 4 && riskLevel === 'LOW' ? 'AUTO_PUBLISH' : 'REQUIRE_APPROVAL';

    return {
      riskLevel,
      flags,
      explanation:
        flags.length > 0
          ? `Flagged for: ${flags.join(', ')}.`
          : rating <= 3
          ? 'Non-positive rating requires manual human oversight.'
          : 'Low risk positive review eligible for auto-publication.',
      confidenceScore: 0.95,
      recommendedAction,
    };
  }

  async generateReplyDraft(params: {
    reviewText: string;
    authorName: string;
    rating: number;
    brandVoice: BrandVoice;
    riskAssessment: RiskAssessment;
  }): Promise<{ proposedText: string; model: string; tokensUsed?: number }> {
    const { reviewText, authorName, rating, brandVoice, riskAssessment } = params;

    const trustedContext = brandVoice.trustedBusinessContext;
    const contactInfo = trustedContext.contactEmailForInquiries
      ? `at ${trustedContext.contactEmailForInquiries}`
      : 'with our team directly';

    // System instruction safeguarding against hallucinations & prompt injections
    const systemPrompt = `
${UNTRUSTED_REVIEW_DEFENSE_PROMPT}

You are drafting a public reply to a Google review on behalf of the business.
Tone: ${brandVoice.tone}
Reviewer Name: ${authorName || 'valued customer'}
Review Star Rating: ${rating}/5
Trusted Contact: ${contactInfo}
Services: ${trustedContext.coreServicesOffered.join(', ') || 'our services'}

CONSTRAINTS:
1. Under 80 words.
2. Thank the reviewer.
3. Be professional and warm.
4. ABSOLUTELY NEVER offer refunds, discounts, settlements, employee names, or promises.
`;

    if (this.aiClient) {
      try {
        const response = await this.aiClient.models.generateContent({
          model: this.modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${systemPrompt}\n\n<untrusted_review_content>\n${reviewText}\n</untrusted_review_content>`,
                },
              ],
            },
          ],
        });

        let draft = (response.text || '').trim();
        if (!draft) {
          return {
            proposedText: this.buildSafeFallback(authorName, rating, contactInfo, riskAssessment),
            model: 'safe-deterministic-fallback',
          };
        }
        draft = this.sanitizeDraft(draft);
        return {
          proposedText: draft,
          model: this.modelName,
        };
      } catch (err) {
        console.error('Gemini API call failed, falling back to deterministic safe template:', err);
      }
    }

    // Deterministic safe fallback
    return {
      proposedText: this.buildSafeFallback(authorName, rating, contactInfo, riskAssessment),
      model: 'safe-deterministic-engine',
    };
  }

  private sanitizeDraft(draft: string): string {
    let sanitized = draft.trim();
    const forbiddenPatterns = [
      /\brefund(s|ed|ing)?\b/gi,
      /\bdiscount(s|ed|ing)?\b/gi,
      /\b(compensation|compensate|reimburse|reimbursement)\b/gi,
      /\b(guarantee|guarantees|settlement)\b/gi,
      /\bfree (service|meal|appointment|gift|treatment)\b/gi,
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(sanitized)) {
        sanitized = sanitized.replace(pattern, '[redacted]');
      }
    }

    for (const forbidden of FORBIDDEN_AI_INVENTIONS) {
      const regex = new RegExp(`\\b${forbidden}\\b`, 'gi');
      if (regex.test(sanitized)) {
        sanitized = sanitized.replace(regex, '[redacted]');
      }
    }
    return sanitized;
  }

  private buildSafeFallback(
    authorName: string,
    rating: number,
    contactInfo: string,
    riskAssessment: RiskAssessment
  ): string {
    const greeting = authorName ? `Hi ${authorName},` : 'Hello,';
    if (rating >= 4 && riskAssessment.riskLevel === 'LOW') {
      return `${greeting} thank you so much for the 5-star review! We truly appreciate your feedback and look forward to serving you again soon.`;
    }
    return `${greeting} thank you for taking the time to share your feedback. We take all experiences seriously and would welcome the chance to hear more details directly. Please reach out to us ${contactInfo} so we can assist.`;
  }
}
