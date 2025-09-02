import { pool } from '../config/database';
import { Activity } from '../types';
import { JiraService } from './jiraService';
import { GitHubService } from './githubService';
import { BadgeService } from './badgeService';
import { StreakService } from './streakService';

export class ActivityService {
  private jiraService: JiraService;
  private githubService: GitHubService;
  private badgeService: BadgeService;
  private streakService: StreakService;

  constructor() {
    this.jiraService = new JiraService();
    this.githubService = new GitHubService();
    this.badgeService = new BadgeService();
    this.streakService = new StreakService();
  }

  async syncUserActivities(userId: number): Promise<void> {
    const client = await pool.connect();
    
    try {
      // Get user details
      const userResult = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      const user = userResult.rows[0];
      
      if (!user) {
        throw new Error('User not found');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Sync last 30 days

      // Sync Jira activities
      if (user.jira_account_id) {
        await this.syncJiraActivities(userId, user.jira_account_id, startDate);
      }

      // Sync GitHub activities
      if (user.github_username) {
        await this.syncGitHubActivities(userId, user.github_username, startDate);
      }

      // Update streaks
      await this.streakService.updateUserStreaks(userId);

      // Check for new badges
      await this.badgeService.checkAndAwardBadges(userId);
    } finally {
      client.release();
    }
  }

  private async syncJiraActivities(userId: number, jiraAccountId: string, startDate: Date): Promise<void> {
    const bugs = await this.jiraService.getResolvedBugs(jiraAccountId, startDate);
    
    for (const bug of bugs) {
      await this.recordActivity({
        user_id: userId,
        activity_type: 'bug_fixed',
        source: 'jira',
        source_id: bug.key,
        source_url: `${process.env.JIRA_BASE_URL}/browse/${bug.key}`,
        metadata: {
          summary: bug.fields.summary,
          resolution: bug.fields.resolution?.name
        },
        points_earned: 10,
        activity_date: new Date(bug.fields.updated)
      });
    }
  }

  private async syncGitHubActivities(userId: number, githubUsername: string, startDate: Date): Promise<void> {
    // Sync reviewed PRs
    const reviewedPRs = await this.githubService.getUserReviews(githubUsername, startDate);
    for (const pr of reviewedPRs) {
      await this.recordActivity({
        user_id: userId,
        activity_type: 'pr_reviewed',
        source: 'github',
        source_id: pr.number.toString(),
        source_url: pr.html_url || '',
        metadata: {
          title: pr.title,
          state: pr.state
        },
        points_earned: 5,
        activity_date: new Date(pr.updated_at)
      });
    }

    // Sync merged PRs
    const mergedPRs = await this.githubService.getMergedPullRequests(githubUsername, startDate);
    for (const pr of mergedPRs) {
      await this.recordActivity({
        user_id: userId,
        activity_type: 'pr_merged',
        source: 'github',
        source_id: pr.number.toString(),
        source_url: pr.html_url || '',
        metadata: {
          title: pr.title
        },
        points_earned: 15,
        activity_date: new Date(pr.merged_at!)
      });
    }

    // Sync commits from all repos
    const repos = await this.githubService.getOrgRepos();
    for (const repo of repos.slice(0, 5)) { // Limit to 5 repos for performance
      const commits = await this.githubService.getUserCommits(githubUsername, repo, startDate);
      for (const commit of commits) {
        await this.recordActivity({
          user_id: userId,
          activity_type: 'commit',
          source: 'github',
          source_id: commit.sha,
          source_url: commit.html_url || '',
          metadata: {
            message: commit.commit.message,
            repo
          },
          points_earned: 2,
          activity_date: new Date(commit.commit.author.date)
        });
      }
    }
  }

  private async recordActivity(activity: Activity): Promise<void> {
    const client = await pool.connect();
    
    try {
      // Check if activity already exists
      const existingResult = await client.query(
        'SELECT id FROM activities WHERE source = $1 AND source_id = $2',
        [activity.source, activity.source_id]
      );

      if (existingResult.rows.length === 0) {
        await client.query(
          `INSERT INTO activities 
           (user_id, activity_type, source, source_id, source_url, metadata, points_earned, activity_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            activity.user_id,
            activity.activity_type,
            activity.source,
            activity.source_id,
            activity.source_url,
            JSON.stringify(activity.metadata),
            activity.points_earned,
            activity.activity_date
          ]
        );
      }
    } finally {
      client.release();
    }
  }

  async getUserActivities(userId: number, limit = 50): Promise<Activity[]> {
    const result = await pool.query(
      `SELECT * FROM activities 
       WHERE user_id = $1 
       ORDER BY activity_date DESC 
       LIMIT $2`,
      [userId, limit]
    );
    
    return result.rows;
  }

  async getUserStats(userId: number): Promise<any> {
    const client = await pool.connect();
    
    try {
      const totalPointsResult = await client.query(
        'SELECT SUM(points_earned) as total FROM activities WHERE user_id = $1',
        [userId]
      );

      const activityCountsResult = await client.query(
        `SELECT activity_type, COUNT(*) as count, SUM(points_earned) as points
         FROM activities 
         WHERE user_id = $1 
         GROUP BY activity_type`,
        [userId]
      );

      const streaksResult = await client.query(
        'SELECT * FROM user_streaks WHERE user_id = $1',
        [userId]
      );

      const badgesResult = await client.query(
        'SELECT COUNT(*) as count FROM user_badges WHERE user_id = $1',
        [userId]
      );

      return {
        total_points: parseInt(totalPointsResult.rows[0]?.total || '0'),
        badges_earned: parseInt(badgesResult.rows[0]?.count || '0'),
        activity_breakdown: activityCountsResult.rows,
        streaks: streaksResult.rows
      };
    } finally {
      client.release();
    }
  }
}