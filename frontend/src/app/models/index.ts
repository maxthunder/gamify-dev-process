export interface User {
  id?: number;
  username: string;
  email: string;
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
  earned?: boolean;
  progress?: number;
  current?: number;
  target?: number;
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

export interface UserStats {
  total_points: number;
  badges_earned: number;
  activity_breakdown: Array<{
    activity_type: string;
    count: number;
    points: number;
  }>;
  streaks: Array<{
    streak_type: string;
    current_streak: number;
    longest_streak: number;
  }>;
}

export interface AuthResponse {
  user: User;
  token: string;
}