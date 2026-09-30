import { DatabaseStore } from '../../server/services/data/dbStore';
import { SupportService } from '../../server/services/data/dataService';
import { TenantMismatchError, EntityNotFoundError } from '../../server/services/data/errors';
import type { TenantContext } from '../../shared/types/database';

export function runSupportTicketOwnershipTests(): { passed: number; failed: number; results: string[] } {
  const store = new DatabaseStore();
  const supportService = new SupportService(store);

  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      results.push(`PASS: ${testName}`);
    } else {
      failed++;
      results.push(`FAIL: ${testName} ${detail ? `- ${detail}` : ''}`);
    }
  }

  const tenantA = 'tenant_clinic_a';
  const tenantB = 'tenant_clinic_b';
  const contextA: TenantContext = { saasCustomerId: tenantA, role: 'OWNER' };
  const contextB: TenantContext = { saasCustomerId: tenantB, role: 'OWNER' };

  // 1. Tenant A creates a support ticket
  const ticketA = supportService.createTicket(
    {
      id: 'ticket_alpha_01',
      saasCustomerId: tenantA,
      subject: 'Review sync timing question',
      category: 'GOOGLE_INTEGRATION',
      priority: 'MEDIUM',
      status: 'OPEN',
    },
    contextA
  );

  assert(ticketA.saasCustomerId === tenantA, 'Support ticket created with verified tenant ownership');

  // 2. Tenant A adds a message to their ticket
  const msgA = supportService.addMessage(
    {
      id: 'msg_alpha_01',
      supportTicketId: ticketA.id,
      senderType: 'SAAS_CUSTOMER',
      senderId: 'user_a',
      body: 'Can we change the polling frequency?',
    },
    contextA
  );

  assert(msgA.supportTicketId === ticketA.id, 'Tenant A successfully posts a message to their own ticket');

  // 3. Tenant B attempts to read Tenant A's support ticket -> TenantMismatchError
  try {
    supportService.getTicketById(ticketA.id, contextB);
    assert(false, 'Tenant B should not be able to get Tenant A ticket');
  } catch (err) {
    assert(err instanceof TenantMismatchError, 'Tenant B attempting to read Tenant A ticket throws TenantMismatchError');
  }

  // 4. Tenant B attempts to add a message to Tenant A's support ticket -> TenantMismatchError
  try {
    supportService.addMessage(
      {
        id: 'msg_injected_01',
        supportTicketId: ticketA.id,
        senderType: 'SAAS_CUSTOMER',
        senderId: 'user_b',
        body: 'Malicious injection into ticket',
      },
      contextB
    );
    assert(false, 'Tenant B should not be able to inject messages into Tenant A ticket');
  } catch (err) {
    assert(
      err instanceof TenantMismatchError,
      'Tenant B attempting to inject message into Tenant A ticket throws TenantMismatchError'
    );
  }

  // 5. Tenant B listing tickets sees zero tickets from Tenant A
  const ticketsB = supportService.listTicketsByTenant(contextB);
  assert(ticketsB.length === 0, 'Tenant B listTicketsByTenant returns zero items from Tenant A');

  // 6. Query by ticket status index works accurately
  const openTicketsA = supportService.listTicketsByStatus('OPEN', contextA);
  assert(
    openTicketsA.length === 1 && openTicketsA[0].id === ticketA.id,
    'Status index lookup returns tickets scoped strictly to the requesting tenant'
  );

  const openTicketsB = supportService.listTicketsByStatus('OPEN', contextB);
  assert(openTicketsB.length === 0, 'Status index lookup for Tenant B returns 0 tickets');

  return { passed, failed, results };
}
