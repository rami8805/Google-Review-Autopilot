import { Router } from 'express';
import { requireAuth, requireTenant, requireTenantOwnership, type AuthenticatedRequest } from '../middleware/auth.ts';
import { SupportRepository, AuditRepository } from '../repositories/postgresRepositories.ts';

const router = Router();
const supportRepo = new SupportRepository();
const auditRepo = new AuditRepository();

router.use(requireAuth);
router.use(requireTenant);

// GET /api/support/tickets
router.get('/tickets', async (req: AuthenticatedRequest, res) => {
  const tickets = await supportRepo.listTickets(req.auth!.tenantId);
  res.json({ success: true, data: tickets });
});

// POST /api/support/tickets
router.post('/tickets', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const { email, subject, message } = req.body;

  if (!subject || !message) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Subject and message are required' },
    });
    return;
  }

  const ticket = await supportRepo.createTicket(
    tenantId,
    email || req.auth!.email,
    subject,
    message
  );

  await auditRepo.logEvent({
    id: `audit_${Date.now()}`,
    saasCustomerId: tenantId,
    actorUserId: req.auth!.userId,
    actorType: 'USER',
    action: 'CREATE_SUPPORT_TICKET',
    targetResourceType: 'LOCATION',
    targetResourceId: ticket.id,
    details: { subject },
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, data: ticket });
});

// GET /api/support/tickets/:id/messages
router.get('/tickets/:id/messages', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const ticket = await supportRepo.getTicket(tenantId, req.params.id);

  if (!ticket) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Support ticket not found' } });
    return;
  }

  if (!requireTenantOwnership(ticket.saasCustomerId, req, res)) return;

  const messages = await supportRepo.getMessages(tenantId, req.params.id);
  res.json({ success: true, data: { ticket, messages } });
});

// POST /api/support/tickets/:id/messages
router.post('/tickets/:id/messages', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const ticket = await supportRepo.getTicket(tenantId, req.params.id);

  if (!ticket) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Support ticket not found' } });
    return;
  }

  if (!requireTenantOwnership(ticket.saasCustomerId, req, res)) return;

  const { message, senderName } = req.body;
  if (!message) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Message cannot be empty' } });
    return;
  }

  const reply = await supportRepo.addMessage(
    tenantId,
    req.params.id,
    senderName || req.auth!.email,
    message,
    'SAAS_CUSTOMER'
  );

  res.json({ success: true, data: reply });
});

// PATCH /api/support/tickets/:id/status
router.patch('/tickets/:id/status', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.auth!.tenantId;
  const ticket = await supportRepo.getTicket(tenantId, req.params.id);

  if (!ticket) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Support ticket not found' } });
    return;
  }

  if (!requireTenantOwnership(ticket.saasCustomerId, req, res)) return;

  const { status } = req.body;
  const updated = await supportRepo.updateTicketStatus(tenantId, req.params.id, status);

  res.json({ success: true, data: updated });
});

export default router;
