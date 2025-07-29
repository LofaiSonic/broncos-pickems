-- Fix production database schema to match development
-- This migration adds all missing columns that exist in dev but not in prod

-- Add missing columns to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS season_type INTEGER DEFAULT 2;
ALTER TABLE games ADD COLUMN IF NOT EXISTS tv_channel VARCHAR(50);
ALTER TABLE games ADD COLUMN IF NOT EXISTS espn_event_id VARCHAR(255);
ALTER TABLE games ADD COLUMN IF NOT EXISTS stadium VARCHAR(255);
ALTER TABLE games ADD COLUMN IF NOT EXISTS season_year INTEGER DEFAULT 2025;

-- Add missing columns to seasons table
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS description TEXT;

-- Add missing columns to picks table (if any)
ALTER TABLE picks ADD COLUMN IF NOT EXISTS confidence INTEGER;
ALTER TABLE picks ADD COLUMN IF NOT EXISTS is_correct BOOLEAN;
ALTER TABLE picks ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;

-- Add missing columns to users table (if any)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Create season_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS season_types (
    id INTEGER NOT NULL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    abbreviation VARCHAR(10) NOT NULL,
    description TEXT
);

-- Insert season types
INSERT INTO season_types (id, name, abbreviation, description) VALUES 
    (1, 'Preseason', 'PRE', 'NFL Preseason Games'),
    (2, 'Regular Season', 'REG', 'NFL Regular Season Games'),
    (3, 'Postseason', 'POST', 'NFL Playoff Games')
ON CONFLICT (id) DO NOTHING;

-- Create team_records table if it doesn't exist
CREATE TABLE IF NOT EXISTS team_records (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id),
    season_id INTEGER NOT NULL REFERENCES seasons(id),
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    ties INTEGER DEFAULT 0,
    division_wins INTEGER DEFAULT 0,
    division_losses INTEGER DEFAULT 0,
    conference_wins INTEGER DEFAULT 0,
    conference_losses INTEGER DEFAULT 0,
    points_for INTEGER DEFAULT 0,
    points_against INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, season_id)
);

-- Create odds_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS odds_history (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id),
    spread DECIMAL(3,1),
    over_under DECIMAL(4,1),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create weather_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS weather_history (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id),
    temperature INTEGER,
    conditions VARCHAR(100),
    wind_speed INTEGER,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_picks_user_game ON picks(user_id, game_id);
CREATE INDEX IF NOT EXISTS idx_picks_week ON picks(week);
CREATE INDEX IF NOT EXISTS idx_games_season_type ON games(season_type);
CREATE INDEX IF NOT EXISTS idx_team_records_team_season ON team_records(team_id, season_id);

-- Update the seasons table with proper 2025 season data
UPDATE seasons 
SET start_date = '2025-07-31', 
    end_date = '2026-02-12',
    description = '2025-2026 NFL Season including preseason and postseason'
WHERE year = 2025;