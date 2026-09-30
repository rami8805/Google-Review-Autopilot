export interface EmailNotificationDispatch {
  toEmail: string;
  fromEmail: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  dispatchedAt: string;
}

export interface InAppNotificationDispatch {
  saasCustomerId: string;
  recipientAdminId?: string;
  title: string;
  message: string;
  linkUrl: string;
  dispatchedAt: string;
}

export class SupportNotificationService {
  private emailDispatches: EmailNotificationDispatch[] = [];
  private inAppDispatches: InAppNotificationDispatch[] = [];

  getEmailDispatches(): EmailNotificationDispatch[] {
    return [...this.emailDispatches];
  }

  getInAppDispatches(): InAppNotificationDispatch[] {
    return [...this.inAppDispatches];
  }

  clearHistory() {
    this.emailDispatches = [];
    this.inAppDispatches = [];
  }

  /**
   * Dispatched when an admin replies to a customer's ticket.
   * Sends customer email notification.
   */
  async notifyCustomerOfAdminReply(params: {
    customerEmail: string;
    ticketId: string;
    ticketSubject: string;
    adminName: string;
    messageExcerpt: string;
  }): Promise<EmailNotificationDispatch> {
    const dispatch: EmailNotificationDispatch = {
      toEmail: params.customerEmail,
      fromEmail: process.env.NOTIFICATION_FROM_EMAIL || 'support@reviewautopilot.com',
      subject: `[Support Ticket #${params.ticketId}] Response from ${params.adminName}: ${params.ticketSubject}`,
      textBody: `Hello,\n\n${params.adminName} from Google Review Autopilot support has replied to your ticket #${params.ticketId} ("${params.ticketSubject}"):\n\n"${params.messageExcerpt}"\n\nYou can view and reply to this ticket in your dashboard.\n\nBest regards,\nGoogle Review Autopilot Support Team`,
      htmlBody: `
        <div style="font-family: sans-serif; max-width: 600px; color: #334155;">
          <h2 style="color: #1e293b;">New response to your support ticket</h2>
          <p><strong>Ticket #${params.ticketId}:</strong> ${params.ticketSubject}</p>
          <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0; font-weight: 600; color: #1e293b;">${params.adminName}:</p>
            <p style="margin: 8px 0 0 0; color: #475569; white-space: pre-line;">${params.messageExcerpt}</p>
          </div>
          <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
            To respond or upload screenshots, open the Support Center in your account dashboard.
          </p>
        </div>
      `,
      dispatchedAt: new Date().toISOString(),
    };

    this.emailDispatches.push(dispatch);
    console.log(`[SupportNotification] Customer email dispatched to ${params.customerEmail} for ticket #${params.ticketId}`);
    return dispatch;
  }

  /**
   * Dispatched when a customer replies to a ticket.
   * Notifies the assigned admin (or admin pool).
   */
  async notifyAdminOfCustomerReply(params: {
    ticketId: string;
    ticketSubject: string;
    customerEmail: string;
    assignedAdminId?: string;
    messageExcerpt: string;
  }): Promise<InAppNotificationDispatch> {
    const dispatch: InAppNotificationDispatch = {
      saasCustomerId: 'PLATFORM_ADMIN',
      recipientAdminId: params.assignedAdminId || 'ALL_ADMINS',
      title: `Customer replied on Ticket #${params.ticketId}`,
      message: `${params.customerEmail} responded to "${params.ticketSubject}": "${params.messageExcerpt.slice(0, 100)}..."`,
      linkUrl: `/admin?tab=support&ticketId=${params.ticketId}`,
      dispatchedAt: new Date().toISOString(),
    };

    this.inAppDispatches.push(dispatch);
    console.log(`[SupportNotification] Admin notification dispatched for ticket #${params.ticketId}`);
    return dispatch;
  }

  /**
   * Dispatched when a ticket priority is set to HIGH or URGENT.
   * Immediately notifies admin staff for priority escalation.
   */
  async notifyAdminOfHighPriorityEscalation(params: {
    ticketId: string;
    ticketSubject: string;
    priority: 'HIGH' | 'URGENT';
    customerEmail: string;
    reason?: string;
  }): Promise<InAppNotificationDispatch> {
    const dispatch: InAppNotificationDispatch = {
      saasCustomerId: 'PLATFORM_ADMIN',
      recipientAdminId: 'ALL_ADMINS',
      title: `🔥 [${params.priority} PRIORITY] Ticket #${params.ticketId} Escalated`,
      message: `Ticket from ${params.customerEmail} is marked as ${params.priority}: "${params.ticketSubject}". ${params.reason ? `Reason: ${params.reason}` : ''}`,
      linkUrl: `/admin?tab=support&ticketId=${params.ticketId}`,
      dispatchedAt: new Date().toISOString(),
    };

    this.inAppDispatches.push(dispatch);
    console.log(`[SupportNotification] High-priority escalation dispatched for ticket #${params.ticketId}`);
    return dispatch;
  }
}
