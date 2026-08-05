import { Router, Request, Response } from 'express';
import { IntegrationHealthService } from '../services/integrationHealth.service';
import { authGuard } from '../middleware/authGuard';

export const integrationHealthRouter = Router();

// GET /api/integration-health - Fetch integration health metrics for company
integrationHealthRouter.get('/', authGuard, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const companyId = user?.company_id || user?.user_metadata?.company_id;

    if (!companyId) {
      res.status(400).json({ error: 'Missing companyId' });
      return;
    }

    const healthList = await IntegrationHealthService.getCompanyIntegrationHealth(companyId);
    res.json({ health: healthList });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch integration health' });
  }
});

// POST /api/integration-health/retry - Trigger manual retry for provider
integrationHealthRouter.post('/retry', authGuard, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const companyId = user?.company_id || user?.user_metadata?.company_id;
    const userRole = user?.role || user?.user_metadata?.role || 'telecaller';
    const userId = user?.id;
    const userEmail = user?.email || 'admin@callmind.app';
    const { providerName } = req.body;

    if (!companyId || !providerName) {
      res.status(400).json({ error: 'Missing companyId or providerName' });
      return;
    }

    const result = await IntegrationHealthService.triggerManualRetry(
      companyId,
      providerName,
      userRole,
      userId,
      userEmail
    );

    if (!result.success) {
      res.status(403).json({ error: result.message });
      return;
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to trigger retry' });
  }
});
