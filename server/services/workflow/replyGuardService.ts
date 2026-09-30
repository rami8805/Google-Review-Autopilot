/**
 * Google Review Autopilot - Reply Guard Safety Layer Service
 *
 * Sits strictly between AI reply generation and Google Business Profile publication.
 * Enforces server-side validation across 8 deterministic safety gates:
 * A. Fact Check
 * B. Risk Check
 * C. Tone Check
 * D. Repetition Check
 * E. Privacy Check
 * F. Promise / Commitment Check
 * G. Policy / Legal Safety Check
 * H. Quality Check
 *
 * Implements strict Prompt Injection Defense, single-turn bounded regeneration,
 * and immutable publication gatekeeping.
 */

import type {
  Review,
  BrandVoice,
  AutomationRule,
  GuardCheckResult,
  GuardCheckStatus,
  GuardSeverity,
  GuardDecision,
  GuardChecks,
  GuardResult,
  GuardAdminDiagnostics,
  StarRating,
} from '../../../shared/types/domain';

export interface GuardInput {
  review: Review;
  generatedReply: string;
  businessContext?: BrandVoice['trustedBusinessContext'];
  brandVoice?: BrandVoice;
  recentReplies?: Array<{ proposedText: string; publishedText?: string }>;
  automationRules?: AutomationRule[];
  regenerationAttempts?: number;
}

export class ReplyGuardService {
  /**
   * Run full Reply Guard inspection pipeline.
   * Deterministic, cost-controlled, and idempotent.
   */
  async validateReply(input: GuardInput): Promise<GuardResult> {
    const startTime = Date.now();
    const {
      review,
      generatedReply,
      businessContext,
      brandVoice,
      recentReplies = [],
      automationRules = [],
      regenerationAttempts = 0,
    } = input;

    const trimmedReply = (generatedReply || '').trim();
    const reviewComment = (review.comment || '').trim();

    // 1. Execute all 8 checks
    const qualityCheck = this.checkQuality(trimmedReply, reviewComment);
    const factCheck = this.checkFacts(trimmedReply, reviewComment, businessContext);
    const riskCheck = this.checkRisk(trimmedReply, reviewComment, review.starRating);
    const toneCheck = this.checkTone(trimmedReply, brandVoice?.tone);
    const repetitionCheck = this.checkRepetition(trimmedReply, recentReplies);
    const privacyCheck = this.checkPrivacy(trimmedReply, businessContext);
    const promiseCheck = this.checkPromises(trimmedReply, businessContext);
    const legalSafetyCheck = this.checkLegalSafety(trimmedReply);

    const checks: GuardChecks = {
      fact: factCheck,
      risk: riskCheck,
      tone: toneCheck,
      repetition: repetitionCheck,
      privacy: privacyCheck,
      promise: promiseCheck,
      legalSafety: legalSafetyCheck,
      quality: qualityCheck,
    };

    // 2. Identify failed checks and compute overall risk severity
    const allChecks = Object.entries(checks) as Array<[keyof GuardChecks, GuardCheckResult]>;
    const failedChecks = allChecks.filter(
      ([_, res]) => res.status === 'BLOCK' || res.status === 'WARNING'
    );
    const failedCheckNames = failedChecks.map(([name]) => name);

    let overallRisk: GuardSeverity = 'LOW';
    if (allChecks.some(([_, r]) => r.severity === 'CRITICAL')) {
      overallRisk = 'CRITICAL';
    } else if (allChecks.some(([_, r]) => r.severity === 'HIGH')) {
      overallRisk = 'HIGH';
    } else if (allChecks.some(([_, r]) => r.severity === 'MEDIUM')) {
      overallRisk = 'MEDIUM';
    }

    // 3. Determine if regeneration is allowed (strictly max 1 attempt for fixable issues)
    const fixableCheckNames = ['tone', 'repetition', 'fact', 'promise', 'quality'];
    const hasFixableFailure = failedChecks.some(([name, res]) =>
      fixableCheckNames.includes(name) && res.severity !== 'CRITICAL'
    );
    const hasUnfixableCritical = allChecks.some(
      ([name, res]) => res.severity === 'CRITICAL' && !['quality'].includes(name)
    );

    const regenerationAllowed =
      regenerationAttempts === 0 && hasFixableFailure && !hasUnfixableCritical;

    let regenerationReason: string | undefined;
    if (regenerationAllowed) {
      const topFixable = failedChecks.find(([name]) => fixableCheckNames.includes(name));
      if (topFixable) {
        regenerationReason = `Regeneration requested to resolve ${topFixable[0]} check: ${topFixable[1].reason}`;
      }
    }

    // 4. Determine final guard decision
    let decision: GuardDecision = 'REQUIRE_APPROVAL';

    if (qualityCheck.status === 'BLOCK' && qualityCheck.severity === 'CRITICAL') {
      // Empty reply or critical artifact
      decision = regenerationAllowed ? 'BLOCK_AND_REGENERATE' : 'BLOCK';
    } else if (overallRisk === 'CRITICAL') {
      // Critical risk (legal threat, medical emergency, hate speech, injection) is locked to manual approval
      decision = 'REQUIRE_APPROVAL';
    } else if (overallRisk === 'HIGH') {
      if (regenerationAllowed) {
        decision = 'BLOCK_AND_REGENERATE';
      } else {
        decision = 'REQUIRE_APPROVAL';
      }
    } else if (failedChecks.filter(([_, r]) => r.severity === 'MEDIUM').length >= 2) {
      // Multiple medium issues require approval
      decision = 'REQUIRE_APPROVAL';
    } else if (failedChecks.some(([_, r]) => r.severity === 'MEDIUM')) {
      // Single medium issue
      if (regenerationAllowed) {
        decision = 'BLOCK_AND_REGENERATE';
      } else {
        decision = 'REQUIRE_APPROVAL';
      }
    } else {
      // Low risk or all pass: check if automation rules allow auto-publish
      const matchingRule = automationRules.find(
        (r) => r.starRating === review.starRating && r.isActive
      );
      const isAutoPublishRating = review.starRating >= 4;
      const rulePermits = !matchingRule || matchingRule.action === 'AUTO_PUBLISH';

      if (isAutoPublishRating && rulePermits) {
        decision = 'AUTO_PUBLISH';
      } else {
        decision = 'REQUIRE_APPROVAL';
      }
    }

    // 5. Generate human-readable customer explanation & summary
    const customerExplanation = this.buildCustomerExplanation(checks, review.starRating);
    const summary = this.buildSummary(decision, overallRisk, failedCheckNames);

    const executionTimeMs = Date.now() - startTime;

    const adminDiagnostics: GuardAdminDiagnostics = {
      checks,
      failedCheckNames,
      executionTimeMs,
      regenerationAttempts,
      aiModelUsed: 'gemini-3.8-flash',
      evaluatedAt: new Date().toISOString(),
    };

    return {
      decision,
      overallRisk,
      checks,
      regenerationAllowed,
      regenerationReason,
      summary,
      customerExplanation,
      adminDiagnostics,
    };
  }

  // ==========================================
  // CHECK A: FACT CHECK
  // ==========================================
  private checkFacts(
    reply: string,
    review: string,
    context?: BrandVoice['trustedBusinessContext']
  ): GuardCheckResult {
    // 1. Check for invented refunds / compensation
    const refundMatch = reply.match(/\b(refund(s|ed|ing)?|money back|reimburse(ment)?)\b/i);
    if (refundMatch) {
      return {
        status: 'BLOCK',
        severity: 'CRITICAL',
        reason: 'Reply offers or mentions unauthorized refund/reimbursement not in business context.',
        evidence: refundMatch[0],
      };
    }

    const discountMatch = reply.match(/\b(\d+%\s*off|discount(s)?|voucher(s)?|coupon(s)?)\b/i);
    if (discountMatch) {
      return {
        status: 'BLOCK',
        severity: 'HIGH',
        reason: 'Reply offers unauthorized discount or voucher.',
        evidence: discountMatch[0],
      };
    }

    const compMatch = reply.match(
      /\b(free (meal|food|service|cleaning|treatment|visit|gift|replacement|item)|comp(ed)?|on the house)\b/i
    );
    if (compMatch) {
      return {
        status: 'BLOCK',
        severity: 'HIGH',
        reason: 'Reply promises free goods, comped services, or gifts without business authorization.',
        evidence: compMatch[0],
      };
    }

    // 2. Check for invented operational actions
    const operationalMatch = reply.match(
      /\b(re-?trained|fired\b|disciplined|replaced (the )?(kitchen|equipment|heating|oven|unit|staff)|installed new (cameras|equipment)|upgraded our (ovens|equipment|facilities))\b/i
    );
    if (operationalMatch) {
      return {
        status: 'BLOCK',
        severity: 'HIGH',
        reason: 'Reply invents specific internal operational changes or employee disciplinary actions.',
        evidence: operationalMatch[0],
      };
    }

    // 3. Check for invented delivery / appointment claims
    const deliveryMatch = reply.match(
      /\b((will|shall) (arrive|deliver|be delivered) (tomorrow|by Friday|on Monday|next week)|\b\d{1,2}\/\d{1,2}\b)/i
    );
    if (deliveryMatch) {
      return {
        status: 'BLOCK',
        severity: 'HIGH',
        reason: 'Reply invents a specific delivery date or timeline.',
        evidence: deliveryMatch[0],
      };
    }

    const appointmentMatch = reply.match(
      /\b((scheduled|booked) (you|your appointment) for (tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|\d{1,2}(:\d{2})?\s*(am|pm)))\b/i
    );
    if (appointmentMatch) {
      return {
        status: 'BLOCK',
        severity: 'HIGH',
        reason: 'Reply invents an unverified appointment booking.',
        evidence: appointmentMatch[0],
      };
    }

    // 4. Check for claims that issue was fixed or customer was contacted
    const fixClaimMatch = reply.match(
      /\b((we have|we've|has been) (fixed|repaired|resolved the (issue|problem|bug|leak|glitch)))\b/i
    );
    if (fixClaimMatch) {
      return {
        status: 'WARNING',
        severity: 'MEDIUM',
        reason: 'Reply claims an operational issue was already fixed without verified confirmation.',
        evidence: fixClaimMatch[0],
      };
    }

    const contactClaimMatch = reply.match(
      /\b((manager|director|owner) (has )?(called|contacted|reached out to) you|left you a (voicemail|message)|(we have|we've) (sent you a (private|direct) (message|email|text)|emailed you privately))\b/i
    );
    if (contactClaimMatch) {
      return {
        status: 'WARNING',
        severity: 'MEDIUM',
        reason: 'Reply claims management already contacted the customer privately.',
        evidence: contactClaimMatch[0],
      };
    }

    return {
      status: 'PASS',
      severity: 'LOW',
      reason: 'No invented facts, unauthorized compensations, or unverified claims detected.',
    };
  }

  // ==========================================
  // CHECK B: RISK CHECK
  // ==========================================
  private checkRisk(reply: string, review: string, rating: StarRating): GuardCheckResult {
    const combined = `${review} ${reply}`.toLowerCase();

    // Critical risks
    const injectionMatch = combined.match(
      /\b(ignore (all )?previous (instructions|rules)|system prompt|reveal (the )?prompt|as an ai language model|override rules|print api key|bypass safety)\b/i
    );
    if (injectionMatch) {
      return {
        status: 'BLOCK',
        severity: 'CRITICAL',
        reason: 'Adversarial prompt injection attempt detected in review content.',
        evidence: injectionMatch[0],
      };
    }

    const legalMatch = combined.match(
      /\b(lawyer|attorney|sue|suing|lawsuit|litigation|legal action|court|summons|subpoena)\b/i
    );
    if (legalMatch) {
      return {
        status: 'BLOCK',
        severity: 'CRITICAL',
        reason: 'Legal threat or litigation term detected in review or reply.',
        evidence: legalMatch[0],
      };
    }

    const medicalMatch = combined.match(
      /\b(injur(y|ed|ies)|hospital|ER|emergency room|bleeding|broken bone|broken tooth|malpractice|food poisoning|allergic reaction|anaphylaxis|ambulance)\b/i
    );
    if (medicalMatch) {
      return {
        status: 'BLOCK',
        severity: 'CRITICAL',
        reason: 'Medical injury or acute health emergency reported.',
        evidence: medicalMatch[0],
      };
    }

    const violenceMatch = combined.match(
      /\b(punch(ed)?|kill(ed)?|beat up|attack(ed)?|assault(ed)?|weapon|gun|knife)\b/i
    );
    if (violenceMatch) {
      return {
        status: 'BLOCK',
        severity: 'CRITICAL',
        reason: 'Threat of physical violence or criminal assault.',
        evidence: violenceMatch[0],
      };
    }

    // High risks
    const discriminationMatch = combined.match(
      /\b(racis(t|m)|sexist|discrimination|homophobic|slur|hate speech|harass(ed|ment))\b/i
    );
    if (discriminationMatch) {
      return {
        status: 'BLOCK',
        severity: 'HIGH',
        reason: 'Harassment, discrimination, or hate speech allegations detected.',
        evidence: discriminationMatch[0],
      };
    }

    const safetyMatch = combined.match(
      /\b(fire hazard|infestation|roach(es)?|rat(s)?|health code violation|contamination|unsafe condition)\b/i
    );
    if (safetyMatch) {
      return {
        status: 'BLOCK',
        severity: 'HIGH',
        reason: 'Public health violation or structural safety hazard reported.',
        evidence: safetyMatch[0],
      };
    }

    const fraudMatch = combined.match(
      /\b(fraud|scam(mer)?|stolen|theft|counterfeit|chargeback|unauthorized charge)\b/i
    );
    if (fraudMatch) {
      return {
        status: 'BLOCK',
        severity: 'HIGH',
        reason: 'Fraud or financial dispute reported.',
        evidence: fraudMatch[0],
      };
    }

    const regulatoryMatch = combined.match(
      /\b(OSHA|BBB|Better Business Bureau|health inspector|FTC|police report|police)\b/i
    );
    if (regulatoryMatch) {
      return {
        status: 'BLOCK',
        severity: 'HIGH',
        reason: 'Regulatory agency or law enforcement notification involved.',
        evidence: regulatoryMatch[0],
      };
    }

    if (rating <= 2) {
      return {
        status: 'WARNING',
        severity: 'HIGH',
        reason: `Negative rating (${rating}★) holds higher reputational risk; manual review required.`,
      };
    }

    if (rating === 3) {
      return {
        status: 'WARNING',
        severity: 'MEDIUM',
        reason: 'Neutral rating (3★) requires customer management oversight.',
      };
    }

    return {
      status: 'PASS',
      severity: 'LOW',
      reason: 'Standard review without sensitive legal, safety, or regulatory risks.',
    };
  }

  // ==========================================
  // CHECK C: TONE CHECK
  // ==========================================
  private checkTone(reply: string, configuredTone?: BrandVoice['tone']): GuardCheckResult {
    // 1. Aggressive wording
    const aggressiveMatch = reply.match(
      /\b(calm down|you are (wrong|mistaken)|stop complaining|deal with it|how dare you|get over it|ridiculous complaint)\b/i
    );
    if (aggressiveMatch) {
      return {
        status: 'BLOCK',
        severity: 'HIGH',
        reason: 'Aggressive or hostile customer response detected.',
        evidence: aggressiveMatch[0],
      };
    }

    // 2. Defensive wording
    const defensiveMatch = reply.match(
      /\b(not our fault|did nothing wrong|you should have known|not our responsibility|you misunderstand|it was not our fault|it wasn't our fault)\b/i
    );
    if (defensiveMatch) {
      return {
        status: 'WARNING',
        severity: 'MEDIUM',
        reason: 'Defensive phrasing blaming the customer.',
        evidence: defensiveMatch[0],
      };
    }

    // 3. Sarcasm
    const sarcasmMatch = reply.match(
      /\b(thanks for nothing|sure you did|what a surprise|good luck finding (any)?better|obviously)\b/i
    );
    if (sarcasmMatch) {
      return {
        status: 'BLOCK',
        severity: 'HIGH',
        reason: 'Sarcastic or patronizing phrasing detected.',
        evidence: sarcasmMatch[0],
      };
    }

    // 4. Excessive apology (count of apologies >= 3)
    const apologyMatches = reply.match(/\b(sorry|apolog(y|ize|ies|etic)|regret)\b/gi);
    if (apologyMatches && apologyMatches.length >= 3) {
      return {
        status: 'WARNING',
        severity: 'MEDIUM',
        reason: 'Excessive apologizing undermines professional brand voice.',
        evidence: `Apologized ${apologyMatches.length} times in short reply`,
      };
    }

    // 5. Inappropriate humor / laughter
    const humorMatch = reply.match(/\b(haha|lol|lmao|rofl)\b/i);
    if (humorMatch) {
      return {
        status: 'BLOCK',
        severity: 'HIGH',
        reason: 'Inappropriate internet slang or humor in professional review reply.',
        evidence: humorMatch[0],
      };
    }

    // 6. Robotic wording
    const roboticMatch = reply.match(
      /\b(as per your review parameter|automated (system )?response regarding|input acknowledged|review data processed)\b/i
    );
    if (roboticMatch) {
      return {
        status: 'WARNING',
        severity: 'MEDIUM',
        reason: 'Robotic phrasing sounds unnatural.',
        evidence: roboticMatch[0],
      };
    }

    return {
      status: 'PASS',
      severity: 'LOW',
      reason: 'Tone conforms to professional, polite customer service standards.',
    };
  }

  // ==========================================
  // CHECK D: REPETITION CHECK
  // ==========================================
  private checkRepetition(
    reply: string,
    recentReplies: Array<{ proposedText: string; publishedText?: string }>
  ): GuardCheckResult {
    if (!recentReplies || recentReplies.length === 0) {
      return {
        status: 'PASS',
        severity: 'LOW',
        reason: 'No prior replies to compare against.',
      };
    }

    const currentClean = reply.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    const currentWords = new Set(currentClean.split(' ').filter((w) => w.length > 3));

    for (const prior of recentReplies.slice(0, 5)) {
      const priorText = (prior.publishedText || prior.proposedText || '').trim();
      if (!priorText) continue;

      // 1. Verbatim identical check
      if (reply.toLowerCase() === priorText.toLowerCase()) {
        return {
          status: 'WARNING',
          severity: 'MEDIUM',
          reason: 'Reply is identical verbatim to a recent reply for this location.',
          evidence: priorText.substring(0, 60) + '...',
        };
      }

      // 2. Opening sentence identical check
      const currentOpening = reply.split(/[.!?]/)[0]?.trim().toLowerCase();
      const priorOpening = priorText.split(/[.!?]/)[0]?.trim().toLowerCase();
      if (
        currentOpening &&
        priorOpening &&
        currentOpening === priorOpening &&
        currentOpening.length > 25
      ) {
        return {
          status: 'WARNING',
          severity: 'MEDIUM',
          reason: 'Reply uses an identical opening sentence as a recent reply.',
          evidence: currentOpening,
        };
      }

      // 3. Jaccard similarity index on substantial words
      const priorClean = priorText.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
      const priorWords = new Set(priorClean.split(' ').filter((w) => w.length > 3));

      let intersection = 0;
      for (const w of currentWords) {
        if (priorWords.has(w)) intersection++;
      }
      const union = new Set([...currentWords, ...priorWords]).size;
      const jaccard = union > 0 ? intersection / union : 0;

      if (jaccard > 0.78 && currentWords.size > 5) {
        return {
          status: 'WARNING',
          severity: 'MEDIUM',
          reason: 'High semantic similarity (>78%) to a recent reply; lacks natural variation.',
          evidence: `Similarity score: ${(jaccard * 100).toFixed(0)}%`,
        };
      }
    }

    return {
      status: 'PASS',
      severity: 'LOW',
      reason: 'Reply displays natural linguistic variation compared to recent replies.',
    };
  }

  // ==========================================
  // CHECK E: PRIVACY CHECK
  // ==========================================
  private checkPrivacy(
    reply: string,
    context?: BrandVoice['trustedBusinessContext']
  ): GuardCheckResult {
    const trustedEmail = (context?.contactEmailForInquiries || '').toLowerCase().trim();
    const trustedPhoneDigits = (context?.contactPhoneForInquiries || '').replace(/\D/g, '');

    // 1. Check for email addresses
    const emailMatches = reply.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (emailMatches) {
      for (const email of emailMatches) {
        if (!trustedEmail || email.toLowerCase() !== trustedEmail) {
          return {
            status: 'BLOCK',
            severity: 'CRITICAL',
            reason: 'Exposes private, customer, or unauthorized email address in public review.',
            evidence: email,
          };
        }
      }
    }

    // 2. Check for phone numbers
    const phoneMatches = reply.match(/(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})\b/g);
    if (phoneMatches) {
      for (const phone of phoneMatches) {
        const digits = phone.replace(/\D/g, '');
        if (!trustedPhoneDigits || digits !== trustedPhoneDigits) {
          return {
            status: 'BLOCK',
            severity: 'HIGH',
            reason: 'Exposes private or unverified phone number in public reply.',
            evidence: phone,
          };
        }
      }
    }

    // 3. Check for order / booking / account identifiers
    const orderMatch = reply.match(
      /\b(order|invoice|booking|account|confirmation|tracking)\s*(#|no\.?|id|number)?\s*:?\s*[a-zA-Z0-9_-]{4,}\b/i
    );
    if (orderMatch) {
      return {
        status: 'BLOCK',
        severity: 'HIGH',
        reason: 'Contains internal or customer order/booking identification number.',
        evidence: orderMatch[0],
      };
    }

    // 4. Check for SSN or credit card numbers
    const ssnMatch = reply.match(/\b\d{3}-\d{2}-\d{4}\b/);
    if (ssnMatch) {
      return {
        status: 'BLOCK',
        severity: 'CRITICAL',
        reason: 'Potential Social Security Number pattern detected.',
        evidence: '[SSN Redacted]',
      };
    }

    return {
      status: 'PASS',
      severity: 'LOW',
      reason: 'No private customer identifiers, unauthorized emails, or sensitive data exposed.',
    };
  }

  // ==========================================
  // CHECK F: PROMISE / COMMITMENT CHECK
  // ==========================================
  private checkPromises(
    reply: string,
    context?: BrandVoice['trustedBusinessContext']
  ): GuardCheckResult {
    // Check for binding promises
    const promiseMatch = reply.match(
      /\b(we guarantee (this |that )?(will )?never happen again|we will refund you|we will ensure you are refunded|our manager will call you tomorrow|we will contact you tomorrow|your replacement is (already )?on the way|we will fix (your|this) for free|we promise you a free)\b/i
    );
    if (promiseMatch) {
      return {
        status: 'BLOCK',
        severity: 'HIGH',
        reason: 'Makes unauthorized binding operational or financial guarantee.',
        evidence: promiseMatch[0],
      };
    }

    const generalPromise = reply.match(
      /\b(we promise (that )?(we will|to)|we guarantee 100%|guaranteed satisfaction)\b/i
    );
    if (generalPromise) {
      return {
        status: 'WARNING',
        severity: 'MEDIUM',
        reason: 'Use of absolute guarantee language creates commercial liability.',
        evidence: generalPromise[0],
      };
    }

    return {
      status: 'PASS',
      severity: 'LOW',
      reason: 'No unauthorized promises or liability commitments detected.',
    };
  }

  // ==========================================
  // CHECK G: POLICY / LEGAL SAFETY CHECK
  // ==========================================
  private checkLegalSafety(reply: string): GuardCheckResult {
    // 1. Admitting legal liability
    const liabilityMatch = reply.match(
      /\b(we (admit|acknowledge|accept) (that |this was |it was )?(our )?(legal )?(liability|negligence|fault)|we were (legally )?(at fault|negligent|liable)|we breached our contract)\b/i
    );
    if (liabilityMatch) {
      return {
        status: 'BLOCK',
        severity: 'CRITICAL',
        reason: 'Reply admits legal liability or contractual breach.',
        evidence: liabilityMatch[0],
      };
    }

    // 2. Accusing customer of lying
    const lyingAccusation = reply.match(
      /\b(you are (lying|making this up)|untrue review|false (claim|statement|accusation)|slander(ous)?|defamation)\b/i
    );
    if (lyingAccusation) {
      return {
        status: 'BLOCK',
        severity: 'HIGH',
        reason: 'Publicly accuses reviewer of lying or defamation.',
        evidence: lyingAccusation[0],
      };
    }

    // 3. Threatening reviewer
    const threatMatch = reply.match(
      /\b(we will take you to court|our (lawyer|attorney) will (sue|contact) you|remove this review or else|we are tracking your ip)\b/i
    );
    if (threatMatch) {
      return {
        status: 'BLOCK',
        severity: 'CRITICAL',
        reason: 'Makes legal threats or retaliatory statements against the reviewer.',
        evidence: threatMatch[0],
      };
    }

    // 4. Requesting sensitive information publicly
    const requestSensitiveMatch = reply.match(
      /\b(post your (credit card|ssn|social security|account number|password)|reply with your personal)\b/i
    );
    if (requestSensitiveMatch) {
      return {
        status: 'BLOCK',
        severity: 'CRITICAL',
        reason: 'Requests sensitive personal information over public review channel.',
        evidence: requestSensitiveMatch[0],
      };
    }

    return {
      status: 'PASS',
      severity: 'LOW',
      reason: 'Legally safe wording; avoids liability admissions or public disputes.',
    };
  }

  // ==========================================
  // CHECK H: QUALITY & ARTIFACT CHECK
  // ==========================================
  private checkQuality(reply: string, review: string): GuardCheckResult {
    // 1. Empty or whitespace only
    if (!reply || reply.length < 10) {
      return {
        status: 'BLOCK',
        severity: 'CRITICAL',
        reason: 'Generated reply is empty or excessively brief (< 10 chars).',
        evidence: `Length: ${reply.length}`,
      };
    }

    // 2. Excessively long
    const wordCount = reply.split(/\s+/).length;
    if (wordCount > 160 || reply.length > 900) {
      return {
        status: 'WARNING',
        severity: 'MEDIUM',
        reason: `Reply is excessively verbose (${wordCount} words; recommended: <80 words).`,
        evidence: `${wordCount} words`,
      };
    }

    // 3. AI / Model artifacts
    const artifactMatch = reply.match(
      /\b(as an AI|as a language model|here is a (draft|reply|response)|here's a suggested reply|note to (the )?user|note to business|system prompt|<untrusted_review_content>|<\/untrusted_review_content>|```|undefined|null|NaN|ECONNREFUSED|HTTP 5\d\d)\b/i
    );
    if (artifactMatch) {
      return {
        status: 'BLOCK',
        severity: 'CRITICAL',
        reason: 'Contains AI meta-commentary, code tags, or model prompt artifacts.',
        evidence: artifactMatch[0],
      };
    }

    // 4. Verbatim repetition of entire review
    if (review.length > 30 && reply.toLowerCase().includes(review.toLowerCase())) {
      return {
        status: 'BLOCK',
        severity: 'HIGH',
        reason: 'Reply merely echoes back the entire review verbatim.',
      };
    }

    return {
      status: 'PASS',
      severity: 'LOW',
      reason: 'Quality standards met: concise, clear, and free of system artifacts.',
    };
  }

  // ==========================================
  // HELPER: Customer Explanation
  // ==========================================
  private buildCustomerExplanation(checks: GuardChecks, starRating: StarRating): string {
    if (checks.fact.status === 'BLOCK' && checks.fact.severity === 'CRITICAL') {
      return 'Review requires approval because it contains an unauthorized refund or compensation claim.';
    }
    if (checks.risk.severity === 'CRITICAL' || checks.risk.severity === 'HIGH') {
      if (checks.risk.reason.toLowerCase().includes('safety')) {
        return 'Reply requires approval because it mentions a safety concern.';
      }
      if (checks.risk.reason.toLowerCase().includes('legal')) {
        return 'Review requires approval due to sensitive legal or regulatory terms.';
      }
      return 'Review requires approval due to sensitive topics flagged for owner review.';
    }
    if (checks.fact.status === 'BLOCK') {
      return 'Reply was held for approval to verify business operational details.';
    }
    if (checks.promise.status === 'BLOCK') {
      return 'Reply requires approval because it contains a specific business commitment.';
    }
    if (checks.privacy.status === 'BLOCK') {
      return 'Reply held for approval to prevent exposing private customer details.';
    }
    if (checks.repetition.status === 'WARNING') {
      return 'Reply held for approval to prevent repetitive phrasing across reviews.';
    }
    if (checks.tone.status === 'BLOCK' || checks.tone.status === 'WARNING') {
      return 'Reply held for approval to ensure alignment with your brand tone.';
    }
    if (starRating <= 3) {
      return `Held for owner approval according to your ${starRating}★ oversight safety rule.`;
    }
    return 'Ready for owner inspection and approval.';
  }

  // ==========================================
  // HELPER: Summary
  // ==========================================
  private buildSummary(
    decision: GuardDecision,
    overallRisk: GuardSeverity,
    failedCheckNames: string[]
  ): string {
    if (decision === 'AUTO_PUBLISH') {
      return 'Reply Guard passed all 8 safety gates. Approved for Google publication.';
    }
    if (decision === 'BLOCK_AND_REGENERATE') {
      return `Reply Guard flagged fixable issues (${failedCheckNames.join(', ')}). Triggering single-turn regeneration.`;
    }
    if (decision === 'BLOCK') {
      return `Reply Guard blocked publication due to critical issues (${failedCheckNames.join(', ')}).`;
    }
    return `Reply Guard routed to manual approval (Risk: ${overallRisk}; Flags: ${failedCheckNames.length > 0 ? failedCheckNames.join(', ') : 'Oversight Rule'}).`;
  }
}
