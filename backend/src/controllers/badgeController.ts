import { Request, Response } from 'express';
import { BadgeService } from '../services/badgeService';
import { AuthRequest } from '../middleware/auth';

const badgeService = new BadgeService();

export class BadgeController {
  async getUserBadges(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const badges = await badgeService.getUserBadges(userId);
      res.json(badges);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getBadgeProgress(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const progress = await badgeService.getBadgeProgress(userId);
      res.json(progress);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async checkBadges(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const newBadges = await badgeService.checkAndAwardBadges(userId);
      res.json({ newBadges });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}