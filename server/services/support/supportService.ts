import type { SupportTicket, SupportMessage } from '../../../shared/types/domain';

export interface ISupportService {
  createTicket(saasCustomerId: string, email: string, subject: string, message: string): Promise<SupportTicket>;
  listTickets(saasCustomerId: string): Promise<SupportTicket[]>;
  getTicketMessages(ticketId: string): Promise<SupportMessage[]>;
  replyToTicket(ticketId: string, senderName: string, message: string): Promise<SupportMessage>;
}

export class SupportService implements ISupportService {
  private tickets: SupportTicket[] = [];
  private messages: SupportMessage[] = [];

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
    this.tickets.push(ticket);

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

  async getTicketMessages(ticketId: string): Promise<SupportMessage[]> {
    return this.messages.filter((m) => m.ticketId === ticketId);
  }

  async replyToTicket(ticketId: string, senderName: string, message: string): Promise<SupportMessage> {
    const reply: SupportMessage = {
      id: `msg_${Date.now()}`,
      ticketId,
      senderType: 'SAAS_CUSTOMER',
      senderName,
      message,
      createdAt: new Date().toISOString(),
    };
    this.messages.push(reply);
    return reply;
  }
}
