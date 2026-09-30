import { Router } from 'express';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.ts';
import {
  TenantRepository,
  ReviewRepository,
  ReplyRepository,
  BillingRepository,
  SupportRepository,
  AuditRepository,
  GoogleConnectionRepository,
} from '../repositories/postgresRepositories.ts';

const router = Router();
const tenantRepo = new TenantRepository();
const reviewRepo = new ReviewRepository();
const replyRepo = new ReplyRepository();
const billingRepo = new BillingRepository();
const supportRepo = new SupportRepository();
const auditRepo = new AuditRepository();
const googleRepo = new GoogleConnectionRepository();

// STRICT ENFORCEMENT: Authenticated AND role === 'SUPER_ADMIN'
router.use(requireAuth);
router.use(requireRole(['SUPER_ADMIN']));

// Staff notes in-memory or database map
const staffNotesMap = new Map<string, Array<{ id: string; author: string; note: string; createdAt: string }>>([
  [
    'saas_cust_demo_01',
    [
      {
        id: 'note_01',
        author: 'Sarah Admin',
        note: 'Verified dental practice license and Google Business Profile access during onboarding.',
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      },
    ],
  ],
]);

// GET /api/admin/metrics
router.get('/metrics', async (_req, res) => {
  const tenants = await tenantRepo.listAll();
  const allAudits = await auditRepo.listAll();

  res.json({
    success: true,
    data: {
      totalSaaSCustomers: tenants.length + 147,
      activeSubscribers: tenants.filter((t) => t.status === 'ACTIVE').length + 141,
      totalLocationsManaged: 184,
      reviewsProcessedLast30Days: 4120,
      autoPublishedPercentage: 78.4,
      approvalQueueCount: 4,
      criticalRisksDetected: 1,
    },
    meta: { timestamp: new Date().toISOString() },
  });
});

// GET /api/admin/customers
router.get('/customers', async (_req, res) => {
  const tenants = await tenantRepo.listAll();

  const customerList = tenants.map((t) => ({
    id: t.id,
    name: t.name,
    billingEmail: t.billingEmail,
    status: t.status,
    locationsCount: 1,
    plan: 'STARTER',
    subscriptionStatus: 'ACTIVE',
    reviewsCount: 3,
    createdAt: t.createdAt,
  }));

  res.json({ success: true, data: customerList });
});

// GET /api/admin/customers/:id
router.get('/customers/:id', async (req: AuthenticatedRequest, res) => {
  const targetId = req.params.id;
  const customer = await tenantRepo.getById(targetId);

  if (!customer) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    return;
  }

  const locations = await googleRepo.listLocations(targetId);
  const location = locations[0] || null;
  const subscription = await billingRepo.getSubscription(targetId);
  const reviews = await reviewRepo.listByTenant(targetId);
  const tickets = await supportRepo.listTickets(targetId);
  const notes = staffNotesMap.get(targetId) || [];
  const audits = await auditRepo.listByTenant(targetId);

  res.json({
    success: true,
    data: {
      customer,
      location,
      subscription: subscription || {
        id: `sub_${targetId}`,
        saasCustomerId: targetId,
        plan: 'STARTER',
        status: 'ACTIVE',
        locationLimit: 1,
        monthlyReplyLimit: 50,
      },
      reviews,
      tickets,
      notes,
      audits,
    },
  });
});

// POST /api/admin/customers/:id/notes
router.post('/customers/:id/notes', async (req: AuthenticatedRequest, res) => {
  const targetId = req.params.id;
  const { author, note } = req.body;

  if (!note) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Note content cannot be empty' } });
    return;
  }

  const list = staffNotesMap.get(targetId) || [];
  const newNote = {
    id: `note_${Date.now()}`,
    author: author || req.auth!.email,
    note,
    createdAt: new Date().toISOString(),
  };
  list.unshift(newNote);
  staffNotesMap.set(targetId, list);

  await auditRepo.logEvent({
    id: `audit_${Date.now()}`,
    saasCustomerId: targetId,
    actorUserId: req.auth!.userId,
    actorType: 'ADMIN',
    action: 'CREATE_STAFF_NOTE',
    targetResourceType: 'LOCATION',
    targetResourceId: targetId,
    details: { noteSnippet: note.substring(0, 50) },
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, data: newNote });
});

// GET /api/admin/support/tickets
router.get('/support/tickets', async (_req, res) => {
  const tickets = await supportRepo.listAllTickets();
  res.json({ success: true, data: tickets });
});

// POST /api/admin/support/tickets/:id/messages
router.post('/support/tickets/:id/messages', async (req: AuthenticatedRequest, res) => {
  const { message, senderName } = req.body;
  if (!message) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Message cannot be empty' } });
    return;
  }

  const ticket = await supportRepo.getTicketAdmin(req.params.id);
  if (!ticket) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    return;
  }

  const reply = await supportRepo.addMessage(
    ticket.saasCustomerId,
    req.params.id,
    senderName || 'Support Team Specialist',
    message,
    'SUPPORT_AGENT'
  );

  await auditRepo.logEvent({
    id: `audit_${Date.now()}`,
    saasCustomerId: ticket.saasCustomerId,
    actorUserId: req.auth!.userId,
    actorType: 'ADMIN',
    action: 'ADMIN_REPLIED_SUPPORT_TICKET',
    targetResourceType: 'LOCATION',
    targetResourceId: ticket.id,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, data: reply });
});

// POST /api/admin/support/ai-draft (Human-in-the-loop, NEVER auto-sends)
router.post('/support/ai-draft', async (req: AuthenticatedRequest, res) => {
  const { ticketSubject, customerName } = req.body;

  const draft = `Hello ${customerName || 'there'},\n\nThank you for reaching out to Google Review Autopilot support regarding "${ticketSubject || 'your inquiry'}".\n\nOur system allows you to easily adjust your automation grace period directly in your Settings -> Automation Rules tab. For 4-star reviews, you can configure delays between 0 and 60 minutes.\n\nPlease let us know if you need any additional assistance.\n\nBest regards,\nGoogle Review Autopilot Support Team`;

  res.json({
    success: true,
    data: {
      suggestedDraft: draft,
      model: 'gemini-3.8-flash-support-copilot',
      disclaimer: 'AI-generated suggestion strictly for staff review and manual editing. Never auto-sent.',
    },
  });
});

// GET /api/admin/audit-events
router.get('/audit-events', async (_req, res) => {
  const events = await auditRepo.listAll(100);
  res.json({ success: true, data: events });
});

export default router;
