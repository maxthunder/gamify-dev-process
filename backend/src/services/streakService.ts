import { pool } from '../config/database';

export class StreakService {
  async updateUserStreaks(userId: number): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get user's recent activities
      const activitiesResult = await client.query(
        `SELECT DISTINCT activity_date 
         FROM activities 
         WHERE user_id = $1 
         ORDER BY activity_date DESC 
         LIMIT 100`,
        [userId]
      );

      const activityDates = activitiesResult.rows.map((row: any) => 
        new Date(row.activity_date).toISOString().split('T')[0]
      );

      if (activityDates.length === 0) {
        await client.query('COMMIT');
        return;
      }

      // Calculate daily streak
      const currentStreak = this.calculateConsecutiveDays(activityDates);
      
      // Get existing streak record
      const streakResult = await client.query(
        "SELECT * FROM user_streaks WHERE user_id = $1 AND streak_type = 'daily_activity'",
        [userId]
      );

      const today = new Date().toISOString().split('T')[0];
      const lastActivityDate = activityDates[0];

      if (streakResult.rows.length === 0) {
        // Create new streak record
        await client.query(
          `INSERT INTO user_streaks 
           (user_id, streak_type, current_streak, longest_streak, last_activity_date, started_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, 'daily_activity', currentStreak, currentStreak, lastActivityDate, lastActivityDate]
        );
      } else {
        const existingStreak = streakResult.rows[0];
        const longestStreak = Math.max(existingStreak.longest_streak, currentStreak);

        // Update streak record
        await client.query(
          `UPDATE user_streaks 
           SET current_streak = $1, longest_streak = $2, last_activity_date = $3, updated_at = NOW()
           WHERE user_id = $4 AND streak_type = 'daily_activity'`,
          [currentStreak, longestStreak, lastActivityDate, userId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private calculateConsecutiveDays(dates: string[]): number {
    if (dates.length === 0) return 0;

    let streak = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const mostRecentDate = new Date(dates[0]);
    mostRecentDate.setHours(0, 0, 0, 0);
    
    // Check if the streak is broken (last activity was not today or yesterday)
    const daysSinceLastActivity = Math.floor((today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLastActivity > 1) {
      return 0; // Streak is broken
    }

    // Count consecutive days
    for (let i = 1; i < dates.length; i++) {
      const currentDate = new Date(dates[i - 1]);
      const previousDate = new Date(dates[i]);
      
      currentDate.setHours(0, 0, 0, 0);
      previousDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        streak++;
      } else if (daysDiff > 1) {
        break; // Streak is broken
      }
      // If daysDiff === 0, it's the same day, continue checking
    }

    return streak;
  }

  async getUserStreaks(userId: number): Promise<any[]> {
    const result = await pool.query(
      'SELECT * FROM user_streaks WHERE user_id = $1',
      [userId]
    );
    
    return result.rows;
  }
}