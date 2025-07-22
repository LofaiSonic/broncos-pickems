-- Migration 006: Automatic Updates System
-- Add tables and columns for automatic data updates

-- Create update logs table
CREATE TABLE IF NOT EXISTS update_logs (
  id SERIAL PRIMARY KEY,
  job_name VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'ERROR', 'WARNING')),
  error_message TEXT,
  records_updated INTEGER DEFAULT 0,
  executed_at TIMESTAMP DEFAULT NOW(),
  duration_ms INTEGER
);

-- Add weather columns to games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS weather_temp INTEGER,
ADD COLUMN IF NOT EXISTS weather_conditions VARCHAR(50),
ADD COLUMN IF NOT EXISTS weather_wind INTEGER,
ADD COLUMN IF NOT EXISTS weather_updated_at TIMESTAMP;

-- Add record columns to games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS home_team_record VARCHAR(10),
ADD COLUMN IF NOT EXISTS away_team_record VARCHAR(10);

-- Add odds update tracking
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS odds_updated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS scores_updated_at TIMESTAMP;

-- Create team injuries table (enhanced version)
CREATE TABLE IF NOT EXISTS team_injuries (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL,
  player_name VARCHAR(100) NOT NULL,
  position VARCHAR(10),
  status VARCHAR(50),
  injury_type VARCHAR(100),
  details TEXT,
  severity VARCHAR(20),
  return_date DATE,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create team records table for historical tracking
CREATE TABLE IF NOT EXISTS team_records (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL,
  season INTEGER NOT NULL,
  week INTEGER NOT NULL,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  points_for INTEGER DEFAULT 0,
  points_against INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, season, week)
);

-- Create weather history table
CREATE TABLE IF NOT EXISTS weather_history (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  temperature INTEGER,
  conditions VARCHAR(50),
  wind_speed INTEGER,
  humidity INTEGER,
  precipitation DECIMAL(4,2),
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Create betting odds history table
CREATE TABLE IF NOT EXISTS odds_history (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  bookmaker VARCHAR(50),
  spread DECIMAL(4,1),
  over_under DECIMAL(4,1),
  home_ml INTEGER, -- moneyline
  away_ml INTEGER, -- moneyline
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_update_logs_job_name ON update_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_update_logs_executed_at ON update_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_injuries_team_id ON team_injuries(team_id);
CREATE INDEX IF NOT EXISTS idx_team_injuries_updated_at ON team_injuries(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_records_team_season ON team_records(team_id, season);
CREATE INDEX IF NOT EXISTS idx_weather_history_game_id ON weather_history(game_id);
CREATE INDEX IF NOT EXISTS idx_odds_history_game_id ON odds_history(game_id);
CREATE INDEX IF NOT EXISTS idx_games_weather_updated ON games(weather_updated_at);
CREATE INDEX IF NOT EXISTS idx_games_odds_updated ON games(odds_updated_at);

-- Insert sample update log entries
INSERT INTO update_logs (job_name, status, records_updated, executed_at) VALUES 
  ('injury-updates', 'SUCCESS', 0, NOW() - INTERVAL '1 hour'),
  ('odds-updates', 'SUCCESS', 0, NOW() - INTERVAL '2 hours'),
  ('records-updates', 'SUCCESS', 0, NOW() - INTERVAL '6 hours');

-- Create a view for latest team injuries
CREATE OR REPLACE VIEW latest_team_injuries AS
SELECT DISTINCT ON (team_id, player_name) 
  team_id, 
  player_name, 
  position, 
  status, 
  injury_type, 
  details,
  updated_at
FROM team_injuries 
ORDER BY team_id, player_name, updated_at DESC;

-- Create a view for current team records
CREATE OR REPLACE VIEW current_team_records AS
SELECT DISTINCT ON (team_id) 
  team_id,
  wins,
  losses,
  ties,
  CONCAT(wins, '-', losses, CASE WHEN ties > 0 THEN CONCAT('-', ties) ELSE '' END) as record,
  points_for,
  points_against,
  (points_for - points_against) as point_differential,
  updated_at
FROM team_records 
WHERE season = EXTRACT(YEAR FROM NOW())
ORDER BY team_id, week DESC;

-- Add comments for documentation
COMMENT ON TABLE update_logs IS 'Log of all automatic update jobs and their results';
COMMENT ON TABLE team_injuries IS 'Current injury reports for all NFL teams';
COMMENT ON TABLE team_records IS 'Historical team records by week and season';
COMMENT ON TABLE weather_history IS 'Historical weather data for games';
COMMENT ON TABLE odds_history IS 'Historical betting odds data';
COMMENT ON VIEW latest_team_injuries IS 'Most recent injury status for each player';
COMMENT ON VIEW current_team_records IS 'Current season records for all teams';