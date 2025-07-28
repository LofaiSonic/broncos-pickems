-- Performance indexes for 10,000+ users scalability

-- Composite index for picks queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_picks_user_game_composite 
ON picks(user_id, game_id, created_at) 
INCLUDE (picked_team_id, confidence_points, is_correct, points_earned);

-- Index for game queries by week and time
CREATE INDEX IF NOT EXISTS idx_games_season_week_time 
ON games(season_id, week, game_time) 
INCLUDE (home_team_id, away_team_id, is_final, picks_locked);

-- Partial indexes for active queries
CREATE INDEX IF NOT EXISTS idx_games_active_week 
ON games(season_id, week) 
WHERE is_final = FALSE;

CREATE INDEX IF NOT EXISTS idx_picks_pending_results 
ON picks(game_id) 
WHERE is_correct IS NULL;

-- Index for leaderboard calculations
CREATE INDEX IF NOT EXISTS idx_picks_user_points 
ON picks(user_id, points_earned) 
WHERE is_correct IS NOT NULL;

-- Index for user login queries
CREATE INDEX IF NOT EXISTS idx_users_username_lower 
ON users(LOWER(username));

-- Index for injury reports by game
CREATE INDEX IF NOT EXISTS idx_injury_game_team 
ON injury_reports(game_id, team_id);

-- Index for update logs queries
CREATE INDEX IF NOT EXISTS idx_update_logs_type_timestamp 
ON update_logs(update_type, timestamp DESC);

-- Analyze tables to update statistics for query planner
ANALYZE users;
ANALYZE games;
ANALYZE picks;
ANALYZE teams;
ANALYZE injury_reports;
ANALYZE update_logs;