import type { StarRating, RiskLevel, ReplyDecisionAction } from '../types/domain';

export interface UpdateAutomationRulePayload {
  starRating: StarRating;
  maxRiskLevelForAutoPublish: RiskLevel;
  action: ReplyDecisionAction;
  delayMinutesBeforePublish: number;
  isActive: boolean;
}

export interface ApproveReplyPayload {
  reviewId: string;
  editedReplyText?: string;
}

export interface UpdateBrandVoicePayload {
  tone: 'WARM_AND_PROFESSIONAL' | 'FRIENDLY_AND_CASUAL' | 'FORMAL_AND_POLITE' | 'CONCISE_AND_DIRECT';
  signOffTemplate?: string;
  trustedBusinessContext: {
    ownerOrManagerTitle?: string;
    contactEmailForInquiries?: string;
    contactPhoneForInquiries?: string;
    coreServicesOffered: string[];
    prohibitedTopics: string[];
  };
}

export interface ReviewFilterQuery {
  locationId?: string;
  starRating?: number;
  approvalStatus?: string;
  riskLevel?: RiskLevel;
  page?: number;
  pageSize?: number;
}

export interface CreateTicketPayload {
  subject: string;
  category: 'GOOGLE_CONNECTION' | 'REVIEW_REPLY' | 'AUTOMATION' | 'BILLING' | 'ACCOUNT' | 'BUG' | 'OTHER';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  message: string;
  attachments?: Array<{
    fileName: string;
    mimeType: string;
    fileSize: number;
    dataBase64?: string;
  }>;
}

export interface ReplyTicketPayload {
  message: string;
  attachments?: Array<{
    fileName: string;
    mimeType: string;
    fileSize: number;
    dataBase64?: string;
  }>;
}

export interface AddInternalNotePayload {
  note: string;
}

export interface UpdateTicketStatusPayload {
  status?: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'WAITING_ON_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  assignedAdminId?: string;
  assignedAdminName?: string;
}

export interface AddCustomerNotePayload {
  note: string;
}

