import { Request, Response } from 'express';
import { ActivityService } from '../services/activityService';
import { AuthRequest } from '../middleware/auth';

const activityService = new ActivityService();

export class ActivityController {
  async syncActivities(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      await activityService.syncUserActivities(userId);
      res.json({ message: 'Activities synced successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getActivities(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const limit = parseInt(req.query.limit as string) || 50;
      const activities = await activityService.getUserActivities(userId, limit);
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const stats = await activityService.getUserStats(userId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}