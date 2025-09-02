export interface User {
  id?: number;
  username: string;
  email: string;
  password_hash?: string;
  github_username?: string;
  jira_account_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Badge {
  id?: number;
  name: string;
  description?: string;
  category: 'bug_squashing' | 'code_review' | 'streak' | 'milestone';
  icon_url?: string;
  points: number;
  criteria: Record<string, any>;
  created_at?: Date;
}

export interface Activity {
  id?: number;
  user_id: number;
  activity_type: 'bug_fixed' | 'pr_reviewed' | 'commit' | 'pr_merged';
  source: 'github' | 'jira';
  source_id?: string;
  source_url?: string;
  metadata?: Record<string, any>;
  points_earned: number;
  activity_date: Date;
  created_at?: Date;
}

export interface UserBadge {
  id?: number;
  user_id: number;
  badge_id: number;
  earned_at?: Date;
  progress: number;
}

export interface UserStreak {
  id?: number;
  user_id: number;
  streak_type: 'daily_activity' | 'weekly_commits';
  current_streak: number;
  longest_streak: number;
  last_activity_date?: Date;
  started_at?: Date;
  updated_at?: Date;
}

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
    };
    assignee?: {
      accountId: string;
      displayName: string;
    };
    issuetype: {
      name: string;
    };
    resolution?: {
      name: string;
    };
    updated: string;
  };
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: string;
  html_url?: string;
  user: {
    login: string;
  };
  merged_at?: string;
  created_at: string;
  updated_at: string;
  reviews?: Array<{
    user: {
      login: string;
    };
    state: string;
  }>;
}

export interface GitHubCommit {
  sha: string;
  html_url?: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author?: {
    login: string;
  };
}