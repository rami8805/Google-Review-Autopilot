import type { SupportTicket, SupportMessage, TicketStatus } from '../../../shared/types/domain';

export interface ISupportService {
  createTicket(saasCustomerId: string, email: string, subject: string, message: string): Promise<SupportTicket>;
  listTickets(saasCustomerId: string): Promise<SupportTicket[]>;
  listAllTickets(): Promise<SupportTicket[]>;
  getTicket(ticketId: string): Promise<SupportTicket | null>;
  getTicketMessages(ticketId: string): Promise<SupportMessage[]>;
  replyToTicket(ticketId: string, senderName: string, message: string, senderType?: 'SAAS_CUSTOMER' | 'SUPPORT_AGENT' | 'SYSTEM'): Promise<SupportMessage>;
  updateTicketStatus(ticketId: string, status: TicketStatus): Promise<SupportTicket | null>;
}

export class SupportService implements ISupportService {
  private tickets: SupportTicket[] = [
    {
      id: 'tick_sample_01',
      saasCustomerId: 'saas_cust_demo_01',
      createdByUserEmail: 'owner@downtowndental-sf.com',
      subject: 'Inquiry: Customizing grace period for 4-star reviews',
      status: 'OPEN',
      priority: 'MEDIUM',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
  ];

  private messages: SupportMessage[] = [
    {
      id: 'msg_sample_01',
      ticketId: 'tick_sample_01',
      senderType: 'SAAS_CUSTOMER',
      senderName: 'Dr. Sarah Lin',
      message: 'Hi team, is it possible to change our 4-star delay before auto-publishing from 30 minutes to 45 minutes? Thanks!',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
  ];

  async createTicket(
    saasCustomerId: string,
    email: string,
    subject: string,
    initialMessage: string
  ): Promise<SupportTicket> {
    const ticket: SupportTicket = {
      id: `tick_${Date.now()}`,
      saasCustomerId,
      createdByUserEmail: email,
      subject,
      status: 'OPEN',
      priority: 'MEDIUM',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tickets.unshift(ticket);

    this.messages.push({
      id: `msg_${Date.now()}`,
      ticketId: ticket.id,
      senderType: 'SAAS_CUSTOMER',
      senderName: email,
      message: initialMessage,
      createdAt: new Date().toISOString(),
    });

    return ticket;
  }

  async listTickets(saasCustomerId: string): Promise<SupportTicket[]> {
    return this.tickets.filter((t) => t.saasCustomerId === saasCustomerId);
  }

  async listAllTickets(): Promise<SupportTicket[]> {
    return [...this.tickets];
  }

  async getTicket(ticketId: string): Promise<SupportTicket | null> {
    return this.tickets.find((t) => t.id === ticketId) || null;
  }

  async getTicketMessages(ticketId: string): Promise<SupportMessage[]> {
    return this.messages.filter((m) => m.ticketId === ticketId);
  }

  async replyToTicket(
    ticketId: string,
    senderName: string,
    message: string,
    senderType: 'SAAS_CUSTOMER' | 'SUPPORT_AGENT' | 'SYSTEM' = 'SAAS_CUSTOMER'
  ): Promise<SupportMessage> {
    const reply: SupportMessage = {
      id: `msg_${Date.now()}`,
      ticketId,
      senderType,
      senderName,
      message,
      createdAt: new Date().toISOString(),
    };
    this.messages.push(reply);

    // Update ticket updatedAt
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (ticket) {
      ticket.updatedAt = new Date().toISOString();
      if (senderType === 'SUPPORT_AGENT') {
        ticket.status = 'IN_PROGRESS';
      }
    }

    return reply;
  }

  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<SupportTicket | null> {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) return null;
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    return ticket;
  }
}
