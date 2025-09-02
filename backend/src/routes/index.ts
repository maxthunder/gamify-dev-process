import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { ActivityController } from '../controllers/activityController';
import { BadgeController } from '../controllers/badgeController';
import { authenticate } from '../middleware/auth';

const router = Router();
const authController = new AuthController();
const activityController = new ActivityController();
const badgeController = new BadgeController();

// Auth routes
router.post('/api/auth/register', authController.register);
router.post('/api/auth/login', authController.login);
router.get('/api/auth/profile', authenticate, authController.getProfile);

// Activity routes
router.post('/api/activities/sync', authenticate, activityController.syncActivities);
router.get('/api/activities', authenticate, activityController.getActivities);
router.get('/api/activities/stats', authenticate, activityController.getStats);

// Badge routes
router.get('/api/badges', authenticate, badgeController.getUserBadges);
router.get('/api/badges/progress', authenticate, badgeController.getBadgeProgress);
router.post('/api/badges/check', authenticate, badgeController.checkBadges);

// Health check
router.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default router;