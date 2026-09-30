import { Router, type Request, type Response } from 'express';
import { CloudTasksService } from '../services/tasks/cloudTasksService.ts';

const router = Router();
const tasksService = new CloudTasksService();

/**
 * POST /api/tasks/worker
 * Invoked by Google Cloud Tasks push trigger.
 */
router.post('/worker', async (req: Request, res: Response) => {
  const { jobId } = req.body || {};

  if (!jobId) {
    res.status(400).json({ success: false, error: 'jobId is required' });
    return;
  }

  const result = await tasksService.executeJob(jobId);

  if (!result.success && result.status !== 'ALREADY_COMPLETED') {
    res.status(500).json(result);
    return;
  }

  res.status(200).json(result);
});

export default router;
