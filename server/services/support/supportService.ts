import type {
  SupportTicket,
  SupportMessage,
  SupportInternalNote,
  SupportAttachment,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  AiSupportSuggestion,
  KnowledgeBaseArticle,
} from '../../../shared/types/domain';
import { SupportNotificationService } from './supportNotificationService';
import { INITIAL_KNOWLEDGE_BASE_ARTICLES } from './knowledgeBaseData';

export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
];

export interface CreateTicketOptions {
  saasCustomerId: string;
  userEmail: string;
  subject: string;
  category: TicketCategory;
  priority?: TicketPriority;
  message: string;
  attachments?: Array<{
    fileName: string;
    mimeType: string;
    fileSize: number;
    dataBase64?: string;
  }>;
}

export interface AdminInboxFilterOptions {
  view?: 'ALL_OPEN' | 'ASSIGNED_TO_ME' | 'WAITING_FOR_CUSTOMER' | 'HIGH_PRIORITY' | 'UNRESOLVED' | 'RECENTLY_CLOSED';
  adminId?: string;
  category?: string;
  search?: string;
}

export class SupportService {
  private tickets: SupportTicket[] = [];
  private messages: SupportMessage[] = [];
  private internalNotes: SupportInternalNote[] = [];
  private attachments: SupportAttachment[] = [];
  private notificationService: SupportNotificationService;
  private knowledgeBase: KnowledgeBaseArticle[] = [...INITIAL_KNOWLEDGE_BASE_ARTICLES];

  constructor(notificationService?: SupportNotificationService) {
    this.notificationService = notificationService || new SupportNotificationService();
    this.seedInitialTickets();
  }

  private seedInitialTickets() {
    // Seed initial ticket for Downtown Dental
    const ticket1: SupportTicket = {
      id: 'tick_001',
      saasCustomerId: 'saas_cust_demo_01',
      createdByUserEmail: 'owner@downtowndental-sf.com',
      subject: 'Question regarding 3-star review delay rule',
      category: 'AUTOMATION',
      status: 'WAITING_FOR_CUSTOMER',
      priority: 'NORMAL',
      assignedAdminId: 'admin_usr_01',
      assignedAdminName: 'Sarah Platform Lead',
      lastResponseAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      lastResponseBy: 'ADMIN',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    };
    this.tickets.push(ticket1);

    this.messages.push(
      {
        id: 'msg_001a',
        ticketId: ticket1.id,
        senderType: 'SAAS_CUSTOMER',
        senderName: 'Dr. Sarah Lin (owner@downtowndental-sf.com)',
        message: 'Hi team, I noticed our 3-star review was not auto-published even though our 4 and 5 stars are. Can you verify if our rules allow 3 stars to auto-publish?',
        createdAt: ticket1.createdAt,
      },
      {
        id: 'msg_001b',
        ticketId: ticket1.id,
        senderType: 'ADMIN',
        senderName: 'Sarah Platform Lead',
        message: 'Hello Dr. Lin,\n\nBy default, Google Review Autopilot routes all 1, 2, and 3-star reviews to your Approval Queue as a reputation safety safeguard. This ensures you can inspect any nuanced critique before it goes live on Google Maps.\n\nYou can review and approve it with one click in your Reviews tab, or adjust the threshold under Settings > Automation Rules if you prefer.',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      }
    );

    this.internalNotes.push({
      id: 'inote_001',
      ticketId: ticket1.id,
      authorAdminId: 'admin_usr_01',
      authorAdminName: 'Sarah Platform Lead',
      note: 'Checked their automation settings. They are on Starter tier. Confirmed 3-star rule is set to REQUIRE_APPROVAL. Advised keeping safety intercept on.',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    });

    // Seed urgent ticket for North Bay Vet (Google connection down)
    const ticket2: SupportTicket = {
      id: 'tick_002',
      saasCustomerId: 'saas_cust_demo_04',
      createdByUserEmail: 'admin@northbayvet.example.com',
      subject: 'Google token expired - automated replies stopped working',
      category: 'GOOGLE_CONNECTION',
      status: 'OPEN',
      priority: 'URGENT',
      assignedAdminId: 'admin_usr_02',
      assignedAdminName: 'Dave Operations',
      lastResponseAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      lastResponseBy: 'SAAS_CUSTOMER',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    };
    this.tickets.push(ticket2);

    this.messages.push({
      id: 'msg_002a',
      ticketId: ticket2.id,
      senderType: 'SAAS_CUSTOMER',
      senderName: 'Clinic Director (admin@northbayvet.example.com)',
      message: 'Urgent: our Google Business Profile shows token expired since yesterday and replies are failing to publish. Need immediate assistance to restore sync.',
      createdAt: ticket2.createdAt,
    });

    this.internalNotes.push({
      id: 'inote_002',
      ticketId: ticket2.id,
      authorAdminId: 'admin_usr_02',
      authorAdminName: 'Dave Operations',
      note: 'Token refresh failed due to revoked Google permissions or password rotation on their GSuite admin. Needs customer to click Reconnect button in Settings.',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    });
  }

  getNotificationService(): SupportNotificationService {
    return this.notificationService;
  }

  // ==========================================
  // CUSTOMER-FACING TICKET ACTIONS
  // ==========================================

  /**
   * Creates a new support ticket on behalf of a SaaSCustomer.
   * Validates attachments and sanitizes payloads.
   */
  async createTicket(options: CreateTicketOptions): Promise<SupportTicket> {
    const priority = options.priority || 'NORMAL';
    const ticket: SupportTicket = {
      id: `tick_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      saasCustomerId: options.saasCustomerId,
      createdByUserEmail: options.userEmail,
      subject: options.subject.trim(),
      category: options.category,
      status: 'OPEN',
      priority,
      lastResponseAt: new Date().toISOString(),
      lastResponseBy: 'SAAS_CUSTOMER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Process attachments
    const attachedItems: SupportAttachment[] = [];
    if (options.attachments && options.attachments.length > 0) {
      for (const att of options.attachments) {
        this.validateAttachment(att.fileName, att.mimeType, att.fileSize);
        const attachmentRecord: SupportAttachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          ticketId: ticket.id,
          saasCustomerId: options.saasCustomerId,
          fileName: att.fileName,
          fileSize: att.fileSize,
          mimeType: att.mimeType,
          dataBase64: att.dataBase64,
          uploadedBy: options.userEmail,
          createdAt: new Date().toISOString(),
        };
        this.attachments.push(attachmentRecord);
        attachedItems.push(attachmentRecord);
      }
    }

    this.tickets.unshift(ticket);

    // Initial message
    const msg: SupportMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ticketId: ticket.id,
      senderType: 'SAAS_CUSTOMER',
      senderName: options.userEmail,
      message: options.message.trim(),
      attachments: attachedItems,
      createdAt: ticket.createdAt,
    };
    this.messages.push(msg);

    // If ticket is created with HIGH or URGENT priority, notify admin team immediately
    if (priority === 'HIGH' || priority === 'URGENT') {
      await this.notificationService.notifyAdminOfHighPriorityEscalation({
        ticketId: ticket.id,
        ticketSubject: ticket.subject,
        priority,
        customerEmail: options.userEmail,
        reason: 'New ticket opened with elevated priority',
      });
    }

    return ticket;
  }

  /**
   * Lists tickets for a specific SaaSCustomer ONLY.
   * Strips internal admin notes to prevent tenant or privacy leaks!
   */
  async listCustomerTickets(saasCustomerId: string): Promise<SupportTicket[]> {
    const list = this.tickets.filter((t) => t.saasCustomerId === saasCustomerId);
    return list.map((t) => this.sanitizeTicketForCustomer(t));
  }

  /**
   * Gets a single ticket for a SaaSCustomer with tenant isolation.
   * Throws or returns null if saasCustomerId does not match!
   */
  async getCustomerTicket(ticketId: string, saasCustomerId: string): Promise<SupportTicket | null> {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) return null;

    // Strict tenant isolation guard
    if (ticket.saasCustomerId !== saasCustomerId) {
      const err: any = new Error('Unauthorized cross-tenant access to support ticket');
      err.code = 'TENANT_MISMATCH';
      throw err;
    }

    return this.sanitizeTicketForCustomer(ticket);
  }

  /**
   * Customer replies to an existing ticket.
   * Reopens ticket if it was resolved/closed, updates last response, and notifies assigned admin.
   */
  async customerReply(
    ticketId: string,
    saasCustomerId: string,
    senderName: string,
    message: string,
    attachments?: Array<{ fileName: string; mimeType: string; fileSize: number; dataBase64?: string }>
  ): Promise<SupportMessage> {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.saasCustomerId !== saasCustomerId) {
      const err: any = new Error('Tenant mismatch: cannot reply to another tenant ticket');
      err.code = 'TENANT_MISMATCH';
      throw err;
    }

    const attachedItems: SupportAttachment[] = [];
    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        this.validateAttachment(att.fileName, att.mimeType, att.fileSize);
        const attachmentRecord: SupportAttachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          ticketId: ticket.id,
          saasCustomerId,
          fileName: att.fileName,
          fileSize: att.fileSize,
          mimeType: att.mimeType,
          dataBase64: att.dataBase64,
          uploadedBy: senderName,
          createdAt: new Date().toISOString(),
        };
        this.attachments.push(attachmentRecord);
        attachedItems.push(attachmentRecord);
      }
    }

    const replyMsg: SupportMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ticketId,
      senderType: 'SAAS_CUSTOMER',
      senderName,
      message: message.trim(),
      attachments: attachedItems,
      createdAt: new Date().toISOString(),
    };
    this.messages.push(replyMsg);

    // Update ticket status: if closed or waiting, set to OPEN or IN_PROGRESS
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' || ticket.status === 'WAITING_FOR_CUSTOMER') {
      ticket.status = 'OPEN';
    }
    ticket.lastResponseAt = replyMsg.createdAt;
    ticket.lastResponseBy = 'SAAS_CUSTOMER';
    ticket.updatedAt = replyMsg.createdAt;

    // Dispatches notification to admin
    await this.notificationService.notifyAdminOfCustomerReply({
      ticketId: ticket.id,
      ticketSubject: ticket.subject,
      customerEmail: ticket.createdByUserEmail,
      assignedAdminId: ticket.assignedAdminId,
      messageExcerpt: message,
    });

    return replyMsg;
  }

  /**
   * Customer explicitly closes a ticket.
   */
  async closeCustomerTicket(ticketId: string, saasCustomerId: string): Promise<SupportTicket> {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.saasCustomerId !== saasCustomerId) {
      const err: any = new Error('Tenant mismatch: cannot close another tenant ticket');
      err.code = 'TENANT_MISMATCH';
      throw err;
    }

    ticket.status = 'CLOSED';
    ticket.updatedAt = new Date().toISOString();

    this.messages.push({
      id: `msg_${Date.now()}`,
      ticketId,
      senderType: 'SYSTEM',
      senderName: 'System',
      message: 'Ticket closed by customer.',
      createdAt: ticket.updatedAt,
    });

    return this.sanitizeTicketForCustomer(ticket);
  }

  /**
   * Customer reopens a closed/resolved ticket.
   */
  async reopenCustomerTicket(ticketId: string, saasCustomerId: string): Promise<SupportTicket> {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.saasCustomerId !== saasCustomerId) {
      const err: any = new Error('Tenant mismatch');
      err.code = 'TENANT_MISMATCH';
      throw err;
    }

    ticket.status = 'OPEN';
    ticket.updatedAt = new Date().toISOString();

    this.messages.push({
      id: `msg_${Date.now()}`,
      ticketId,
      senderType: 'SYSTEM',
      senderName: 'System',
      message: 'Ticket reopened by customer.',
      createdAt: ticket.updatedAt,
    });

    return this.sanitizeTicketForCustomer(ticket);
  }

  // ==========================================
  // ADMIN SUPPORT INBOX & ACTIONS
  // ==========================================

  /**
   * Lists tickets for the Admin Inbox according to active view filters.
   */
  async listAdminInbox(options: AdminInboxFilterOptions = {}): Promise<any[]> {
    let result = this.tickets.map((t) => {
      const msgs = this.messages.filter((m) => m.ticketId === t.id);
      const notes = this.internalNotes.filter((n) => n.ticketId === t.id);
      const atts = this.attachments.filter((a) => a.ticketId === t.id);

      return {
        ...t,
        messagesCount: msgs.length,
        internalNotesCount: notes.length,
        attachmentsCount: atts.length,
        latestMessagePreview: msgs.length > 0 ? msgs[msgs.length - 1].message.slice(0, 120) : '',
      };
    });

    // View filter
    const view = options.view || 'ALL_OPEN';
    if (view === 'ALL_OPEN') {
      result = result.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'WAITING_FOR_CUSTOMER');
    } else if (view === 'ASSIGNED_TO_ME') {
      result = result.filter((t) => t.assignedAdminId === options.adminId && t.status !== 'CLOSED');
    } else if (view === 'WAITING_FOR_CUSTOMER') {
      result = result.filter((t) => t.status === 'WAITING_FOR_CUSTOMER');
    } else if (view === 'HIGH_PRIORITY') {
      result = result.filter((t) => (t.priority === 'HIGH' || t.priority === 'URGENT') && t.status !== 'CLOSED');
    } else if (view === 'UNRESOLVED') {
      result = result.filter((t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED');
    } else if (view === 'RECENTLY_CLOSED') {
      result = result.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED');
    }

    // Category filter
    if (options.category && options.category !== 'ALL') {
      result = result.filter((t) => t.category === options.category);
    }

    // Search filter
    if (options.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.createdByUserEmail.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q)
      );
    }

    return result;
  }

  /**
   * Retrieves full ticket details for Platform Admin, including:
   * - all messages
   * - internal notes (strictly admin-only)
   * - attachments
   * - AI Support Assistant suggestion
   */
  async getAdminTicketDetail(
    ticketId: string,
    customerContext?: {
      customerName: string;
      plan: string;
      googleLocationsCount: number;
      hasGoogleConnectionError: boolean;
      recentRiskFlagsCount: number;
      billingStatus: string;
    }
  ): Promise<SupportTicket | null> {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) return null;

    const msgs = this.messages.filter((m) => m.ticketId === ticket.id);
    const notes = this.internalNotes.filter((n) => n.ticketId === ticket.id);
    const atts = this.attachments.filter((a) => a.ticketId === ticket.id);

    // AI Support Assistant generation
    const aiSuggestion = this.generateAiSupportSuggestion(ticket, msgs, customerContext);

    return {
      ...ticket,
      messages: msgs,
      internalNotes: notes,
      attachments: atts,
      aiAssistantSuggestion: aiSuggestion,
    };
  }

  /**
   * Admin replies to a customer ticket.
   * Sends customer email notification, updates ticket status.
   */
  async adminReply(
    ticketId: string,
    adminUser: { id: string; name: string; email: string },
    message: string,
    attachments?: Array<{ fileName: string; mimeType: string; fileSize: number; dataBase64?: string }>
  ): Promise<SupportMessage> {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');

    const attachedItems: SupportAttachment[] = [];
    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        this.validateAttachment(att.fileName, att.mimeType, att.fileSize);
        const attachmentRecord: SupportAttachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          ticketId: ticket.id,
          saasCustomerId: ticket.saasCustomerId,
          fileName: att.fileName,
          fileSize: att.fileSize,
          mimeType: att.mimeType,
          dataBase64: att.dataBase64,
          uploadedBy: adminUser.name,
          createdAt: new Date().toISOString(),
        };
        this.attachments.push(attachmentRecord);
        attachedItems.push(attachmentRecord);
      }
    }

    const replyMsg: SupportMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ticketId,
      senderType: 'ADMIN',
      senderUserId: adminUser.id,
      senderName: adminUser.name,
      message: message.trim(),
      attachments: attachedItems,
      createdAt: new Date().toISOString(),
    };
    this.messages.push(replyMsg);

    ticket.status = 'WAITING_FOR_CUSTOMER';
    ticket.lastResponseAt = replyMsg.createdAt;
    ticket.lastResponseBy = 'ADMIN';
    ticket.assignedAdminId = adminUser.id;
    ticket.assignedAdminName = adminUser.name;
    ticket.updatedAt = replyMsg.createdAt;

    // Dispatches email notification to customer
    await this.notificationService.notifyCustomerOfAdminReply({
      customerEmail: ticket.createdByUserEmail,
      ticketId: ticket.id,
      ticketSubject: ticket.subject,
      adminName: adminUser.name,
      messageExcerpt: message,
    });

    return replyMsg;
  }

  /**
   * Admin adds a private internal note on the ticket.
   * This note is NEVER visible to the customer!
   */
  async addInternalNote(
    ticketId: string,
    adminUser: { id: string; name: string },
    noteText: string
  ): Promise<SupportInternalNote> {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');

    const noteRecord: SupportInternalNote = {
      id: `inote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ticketId,
      authorAdminId: adminUser.id,
      authorAdminName: adminUser.name,
      note: noteText.trim(),
      createdAt: new Date().toISOString(),
    };
    this.internalNotes.push(noteRecord);
    ticket.updatedAt = noteRecord.createdAt;

    return noteRecord;
  }

  /**
   * Updates ticket metadata (status, priority, assignment)
   */
  async updateTicketMetadata(
    ticketId: string,
    updates: {
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedAdminId?: string;
      assignedAdminName?: string;
    }
  ): Promise<SupportTicket> {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');

    const oldPriority = ticket.priority;

    if (updates.status) ticket.status = updates.status;
    if (updates.priority) ticket.priority = updates.priority;
    if (updates.assignedAdminId !== undefined) ticket.assignedAdminId = updates.assignedAdminId;
    if (updates.assignedAdminName !== undefined) ticket.assignedAdminName = updates.assignedAdminName;
    ticket.updatedAt = new Date().toISOString();

    // If priority escalated to HIGH or URGENT, dispatch alert
    if (
      updates.priority &&
      (updates.priority === 'HIGH' || updates.priority === 'URGENT') &&
      oldPriority !== updates.priority
    ) {
      await this.notificationService.notifyAdminOfHighPriorityEscalation({
        ticketId: ticket.id,
        ticketSubject: ticket.subject,
        priority: updates.priority,
        customerEmail: ticket.createdByUserEmail,
        reason: 'Ticket priority escalated by administrator',
      });
    }

    return ticket;
  }

  // ==========================================
  // AI SUPPORT ASSISTANT (ADMIN ONLY)
  // ==========================================

  /**
   * Generates intelligent, contextual support guidance for Platform Admins.
   * AI DOES NOT AUTOMATICALLY SEND REPLIES. Admin must review and click "Send".
   */
  generateAiSupportSuggestion(
    ticket: SupportTicket,
    messages: SupportMessage[],
    customerContext?: {
      customerName: string;
      plan: string;
      googleLocationsCount: number;
      hasGoogleConnectionError: boolean;
      recentRiskFlagsCount: number;
      billingStatus: string;
    }
  ): AiSupportSuggestion {
    const initialText = messages.length > 0 ? messages[0].message : ticket.subject;
    const lower = `${ticket.subject} ${initialText}`.toLowerCase();

    let probableCause = 'General customer inquiry regarding system configuration.';
    let issueSummary = `Customer is requesting support regarding ${ticket.category.toLowerCase().replace('_', ' ')}.`;
    let suggestedResponse = '';
    let suggestedArticleId = 'kb_008';
    let suggestedArticleTitle = 'Contacting Support & SLA Guidelines';

    if (ticket.category === 'GOOGLE_CONNECTION' || lower.includes('google') || lower.includes('token') || lower.includes('expired')) {
      issueSummary = 'Customer is reporting a Google Business Profile connection disruption or OAuth token expiry.';
      probableCause = customerContext?.hasGoogleConnectionError
        ? 'OAuth refresh token expired or Google Workspace password was changed, invalidating existing access token.'
        : 'Google OAuth permissions require re-authorization or re-granting scopes.';
      suggestedArticleId = 'kb_001';
      suggestedArticleTitle = 'Google Connection Expired & Re-authentication';
      suggestedResponse = `Hello,\n\nThank you for reaching out to support. It appears your Google Business Profile connection requires re-authentication, which often happens when account credentials or permissions are updated on Google.\n\nTo restore automated replies immediately:\n1. Open your Settings tab.\n2. In the Google Connection card, click "Reconnect Profile".\n3. Select your Google account and grant the requested business management permissions.\n\nOnce reconnected, your pending reviews will sync and reply generation will resume immediately. Please let us know if you need any further assistance!`;
    } else if (ticket.category === 'AUTOMATION' || lower.includes('grace period') || lower.includes('auto-publish') || lower.includes('rules')) {
      issueSummary = 'Customer is asking how the automatic reply rules and safety approval queue operate.';
      probableCause = 'Customer expected a lower star rating or flagged review to auto-publish without manual approval.';
      suggestedArticleId = 'kb_003';
      suggestedArticleTitle = 'How Automatic Replies Work';
      suggestedResponse = `Hello,\n\nThanks for reaching out! Our automation engine is designed to prioritize reputation safety:\n- 5-Star and 4-Star reviews with low risk are automatically published after their grace period.\n- 1, 2, and 3-Star reviews, as well as any review containing potential risk flags, are automatically held in your Approval Queue so you can review them before they go public.\n\nYou can approve pending replies with a single click in your Reviews tab, or customize your star-rating rules in Settings > Automation Rules.\n\nWarm regards,\nSupport Team`;
    } else if (ticket.category === 'BILLING' || lower.includes('invoice') || lower.includes('plan') || lower.includes('cancel')) {
      issueSummary = 'Billing inquiry concerning subscription plans or payments.';
      probableCause = `Subscription status is currently ${customerContext?.billingStatus || 'ACTIVE'} on ${customerContext?.plan || 'STARTER'} plan.`;
      suggestedArticleId = 'kb_007';
      suggestedArticleTitle = 'Billing, Plan Changes, and Cancellation';
      suggestedResponse = `Hello,\n\nThank you for contacting billing support. We have verified your account details. You can view your invoices, change plans, or manage your billing details directly from the Billing tab in your dashboard.\n\nIf you have a specific question about an invoice or subscription adjustment, please let us know and we will be happy to assist directly!`;
    } else {
      suggestedResponse = `Hello,\n\nThank you for contacting Google Review Autopilot support. We have received your inquiry regarding "${ticket.subject}" and are investigating. We will follow up with you shortly.\n\nBest regards,\nPlatform Support Team`;
    }

    return {
      issueSummary,
      probableCause,
      relevantCustomerContext: {
        customerName: customerContext?.customerName || 'Demo Customer',
        plan: customerContext?.plan || 'STARTER',
        googleLocationsCount: customerContext?.googleLocationsCount ?? 1,
        hasGoogleConnectionError: customerContext?.hasGoogleConnectionError ?? false,
        recentRiskFlagsCount: customerContext?.recentRiskFlagsCount ?? 0,
        billingStatus: customerContext?.billingStatus || 'ACTIVE',
      },
      suggestedResponse,
      suggestedArticleId,
      suggestedArticleTitle,
    };
  }

  // ==========================================
  // ATTACHMENT VALIDATION & AUTHORIZATION
  // ==========================================

  private validateAttachment(fileName: string, mimeType: string, fileSize: number) {
    if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new Error(
        `Invalid file type "${mimeType}". Allowed types: PNG, JPEG, JPG, WEBP, PDF.`
      );
    }
    if (fileSize > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new Error(
        `Attachment exceeds maximum size of 5MB (got ${(fileSize / (1024 * 1024)).toFixed(1)}MB).`
      );
    }
  }

  /**
   * Secure attachment retrieval.
   * Verifies that the requester belongs to the owning SaaSCustomer or is a PLATFORM_ADMIN.
   */
  getAttachment(
    attachmentId: string,
    requestingCustomer: { saasCustomerId: string; role: string }
  ): SupportAttachment | null {
    const attachment = this.attachments.find((a) => a.id === attachmentId);
    if (!attachment) return null;

    // Check authorization: must be same tenant OR platform admin
    const isAdmin =
      requestingCustomer.role === 'PLATFORM_ADMIN' ||
      requestingCustomer.role === 'SUPER_ADMIN' ||
      requestingCustomer.role === 'ADMIN';

    if (!isAdmin && attachment.saasCustomerId !== requestingCustomer.saasCustomerId) {
      const err: any = new Error('Unauthorized attachment download: Tenant mismatch');
      err.code = 'TENANT_MISMATCH';
      throw err;
    }

    return attachment;
  }

  // ==========================================
  // KNOWLEDGE BASE
  // ==========================================

  getKnowledgeBaseArticles(search?: string): KnowledgeBaseArticle[] {
    if (!search || !search.trim()) {
      return [...this.knowledgeBase];
    }
    const q = search.toLowerCase().trim();
    return this.knowledgeBase.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  getKnowledgeBaseArticleBySlug(slug: string): KnowledgeBaseArticle | null {
    return this.knowledgeBase.find((a) => a.slug === slug || a.id === slug) || null;
  }

  // ==========================================
  // HELPERS
  // ==========================================

  /**
   * Strips internalNotes and AI assistant suggestions from customer-facing responses.
   * Ensures private admin data NEVER leaks to the customer.
   */
  private sanitizeTicketForCustomer(ticket: SupportTicket): SupportTicket {
    const msgs = this.messages.filter((m) => m.ticketId === ticket.id);
    const atts = this.attachments.filter((a) => a.ticketId === ticket.id);

    return {
      id: ticket.id,
      saasCustomerId: ticket.saasCustomerId,
      createdByUserEmail: ticket.createdByUserEmail,
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      assignedAdminId: ticket.assignedAdminId,
      assignedAdminName: ticket.assignedAdminName,
      lastResponseAt: ticket.lastResponseAt,
      lastResponseBy: ticket.lastResponseBy,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      messages: msgs,
      attachments: atts,
      // internalNotes strictly omitted
      // aiAssistantSuggestion strictly omitted
    };
  }

  getTicketCountStats(): { openTickets: number; highRiskTickets: number } {
    let openTickets = 0;
    let highRiskTickets = 0;

    for (const t of this.tickets) {
      if (t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'WAITING_FOR_CUSTOMER') {
        openTickets++;
        if (t.priority === 'HIGH' || t.priority === 'URGENT') {
          highRiskTickets++;
        }
      }
    }

    return { openTickets, highRiskTickets };
  }
}
