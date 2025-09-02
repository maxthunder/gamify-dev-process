import { pool } from '../config/database';
import { Badge, UserBadge, Activity } from '../types';

export class BadgeService {
  async checkAndAwardBadges(userId: number): Promise<Badge[]> {
    const client = await pool.connect();
    const newBadges: Badge[] = [];

    try {
      await client.query('BEGIN');

      // Get user's activities summary
      const activitySummary = await this.getUserActivitySummary(userId, client);
      
      // Get all badges
      const badgesResult = await client.query('SELECT * FROM badges');
      const allBadges = badgesResult.rows;

      // Get user's current badges
      const userBadgesResult = await client.query(
        'SELECT badge_id FROM user_badges WHERE user_id = $1',
        [userId]
      );
      const userBadgeIds = userBadgesResult.rows.map((row: any) => row.badge_id);

      // Check each badge criteria
      for (const badge of allBadges) {
        if (!userBadgeIds.includes(badge.id)) {
          const earned = this.checkBadgeCriteria(badge, activitySummary);
          
          if (earned) {
            // Award badge
            await client.query(
              'INSERT INTO user_badges (user_id, badge_id, progress) VALUES ($1, $2, $3)',
              [userId, badge.id, 100]
            );
            newBadges.push(badge);
          }
        }
      }

      await client.query('COMMIT');
      return newBadges;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async getUserActivitySummary(userId: number, client: any): Promise<Record<string, number>> {
    const bugsFixedResult = await client.query(
      "SELECT COUNT(*) as count FROM activities WHERE user_id = $1 AND activity_type = 'bug_fixed'",
      [userId]
    );

    const prsReviewedResult = await client.query(
      "SELECT COUNT(*) as count FROM activities WHERE user_id = $1 AND activity_type = 'pr_reviewed'",
      [userId]
    );

    const commitsResult = await client.query(
      "SELECT COUNT(*) as count FROM activities WHERE user_id = $1 AND activity_type = 'commit'",
      [userId]
    );

    const prsMergedResult = await client.query(
      "SELECT COUNT(*) as count FROM activities WHERE user_id = $1 AND activity_type = 'pr_merged'",
      [userId]
    );

    const streakResult = await client.query(
      "SELECT current_streak FROM user_streaks WHERE user_id = $1 AND streak_type = 'daily_activity'",
      [userId]
    );

    return {
      bugs_fixed: parseInt(bugsFixedResult.rows[0]?.count || '0'),
      prs_reviewed: parseInt(prsReviewedResult.rows[0]?.count || '0'),
      commits: parseInt(commitsResult.rows[0]?.count || '0'),
      prs_merged: parseInt(prsMergedResult.rows[0]?.count || '0'),
      streak_days: streakResult.rows[0]?.current_streak || 0
    };
  }

  private checkBadgeCriteria(badge: Badge, activitySummary: any): boolean {
    const criteria = badge.criteria;
    
    for (const [key, value] of Object.entries(criteria)) {
      if (activitySummary[key] < value) {
        return false;
      }
    }
    
    return true;
  }

  async getUserBadges(userId: number): Promise<Badge[]> {
    const result = await pool.query(
      `SELECT b.* FROM badges b 
       JOIN user_badges ub ON b.id = ub.badge_id 
       WHERE ub.user_id = $1 
       ORDER BY ub.earned_at DESC`,
      [userId]
    );
    
    return result.rows;
  }

  async getBadgeProgress(userId: number): Promise<any[]> {
    const client = await pool.connect();
    
    try {
      const activitySummary = await this.getUserActivitySummary(userId, client);
      const badgesResult = await client.query('SELECT * FROM badges ORDER BY points');
      const badges = badgesResult.rows;

      const userBadgesResult = await client.query(
        'SELECT badge_id FROM user_badges WHERE user_id = $1',
        [userId]
      );
      const earnedBadgeIds = userBadgesResult.rows.map((row: any) => row.badge_id);

      return badges.map((badge: any) => {
        const criteria = badge.criteria;
        let progress = 0;
        let target = 0;
        let current = 0;

        for (const [key, value] of Object.entries(criteria)) {
          target = value as number;
          current = (activitySummary as any)[key] || 0;
          progress = Math.min(100, (current / target) * 100);
        }

        return {
          ...badge,
          earned: earnedBadgeIds.includes(badge.id),
          progress: Math.round(progress),
          current,
          target
        };
      });
    } finally {
      client.release();
    }
  }
}