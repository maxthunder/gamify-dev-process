-- Drop existing tables if they exist
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS user_streaks CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    github_username VARCHAR(100),
    jira_account_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create badges table
CREATE TABLE badges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'bug_squashing', 'code_review', 'streak', 'milestone'
    icon_url VARCHAR(255),
    points INTEGER DEFAULT 0,
    criteria JSONB, -- Store badge criteria as JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create activities table
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'bug_fixed', 'pr_reviewed', 'commit', 'pr_merged'
    source VARCHAR(20) NOT NULL, -- 'github', 'jira'
    source_id VARCHAR(255), -- PR number, issue key, etc.
    source_url TEXT,
    metadata JSONB, -- Store additional activity data
    points_earned INTEGER DEFAULT 0,
    activity_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_badges table (many-to-many relationship)
CREATE TABLE user_badges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress INTEGER DEFAULT 0, -- For progressive badges
    UNIQUE(user_id, badge_id)
);

-- Create user_streaks table
CREATE TABLE user_streaks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    streak_type VARCHAR(50) NOT NULL, -- 'daily_activity', 'weekly_commits', etc.
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    started_at DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, streak_type)
);

-- Create indexes for better performance
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_activity_date ON activities(activity_date);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX idx_user_streaks_user_id ON user_streaks(user_id);

-- Insert default badges
INSERT INTO badges (name, description, category, points, criteria) VALUES
('Bug Squasher', 'Fixed 10 bugs', 'bug_squashing', 100, '{"bugs_fixed": 10}'),
('Bug Exterminator', 'Fixed 50 bugs', 'bug_squashing', 500, '{"bugs_fixed": 50}'),
('Bug Annihilator', 'Fixed 100 bugs', 'bug_squashing', 1000, '{"bugs_fixed": 100}'),
('Code Reviewer', 'Reviewed 10 pull requests', 'code_review', 100, '{"prs_reviewed": 10}'),
('Code Guardian', 'Reviewed 50 pull requests', 'code_review', 500, '{"prs_reviewed": 50}'),
('Code Sage', 'Reviewed 100 pull requests', 'code_review', 1000, '{"prs_reviewed": 100}'),
('Week Warrior', '7-day activity streak', 'streak', 150, '{"streak_days": 7}'),
('Fortnight Fighter', '14-day activity streak', 'streak', 300, '{"streak_days": 14}'),
('Monthly Master', '30-day activity streak', 'streak', 750, '{"streak_days": 30}'),
('Quarterly Champion', '90-day activity streak', 'streak', 2500, '{"streak_days": 90}'),
('First Commit', 'Made your first commit', 'milestone', 50, '{"commits": 1}'),
('Centurion', 'Made 100 commits', 'milestone', 500, '{"commits": 100}'),
('Merge Master', 'Had 10 PRs merged', 'milestone', 200, '{"prs_merged": 10}');