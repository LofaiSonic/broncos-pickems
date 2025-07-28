-- Migration to synchronize local database with production schema
-- This adds missing tables, views, and normalizes weather/odds data

-- Create season_types table
CREATE TABLE IF NOT EXISTS season_types (
    id INTEGER NOT NULL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    abbreviation VARCHAR(10) NOT NULL,
    description TEXT
);

-- Insert season types
INSERT INTO season_types (id, name, abbreviation, description) VALUES 
(1, 'Preseason', 'PRE', 'NFL Preseason games')
ON CONFLICT (id) DO NOTHING;

INSERT INTO season_types (id, name, abbreviation, description) VALUES 
(2, 'Regular Season', 'REG', 'NFL Regular Season games')
ON CONFLICT (id) DO NOTHING;

INSERT INTO season_types (id, name, abbreviation, description) VALUES 
(3, 'Postseason', 'POST', 'NFL Playoff games')
ON CONFLICT (id) DO NOTHING;

-- Create team_records table
CREATE TABLE IF NOT EXISTS team_records (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id),
    season INTEGER NOT NULL,
    week INTEGER NOT NULL,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    ties INTEGER DEFAULT 0,
    points_for INTEGER DEFAULT 0,
    points_against INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    UNIQUE(team_id, season, week)
);

-- Create indexes for team_records
CREATE INDEX IF NOT EXISTS idx_team_records_team_season ON team_records(team_id, season);

-- Create odds_history table
CREATE TABLE IF NOT EXISTS odds_history (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    bookmaker VARCHAR(50),
    spread NUMERIC(4,1),
    over_under NUMERIC(4,1),
    home_ml INTEGER,
    away_ml INTEGER,
    recorded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- Create index for odds_history
CREATE INDEX IF NOT EXISTS idx_odds_history_game_id ON odds_history(game_id);

-- Create weather_history table
CREATE TABLE IF NOT EXISTS weather_history (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    temperature INTEGER,
    conditions VARCHAR(50),
    wind_speed INTEGER,
    humidity INTEGER,
    precipitation NUMERIC(4,2),
    recorded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- Create index for weather_history
CREATE INDEX IF NOT EXISTS idx_weather_history_game_id ON weather_history(game_id);

-- Migrate existing weather data from games table to weather_history table
INSERT INTO weather_history (game_id, temperature, wind_speed, recorded_at)
SELECT id, weather_temp, weather_wind, weather_updated_at
FROM games 
WHERE weather_temp IS NOT NULL OR weather_wind IS NOT NULL
ON CONFLICT DO NOTHING;

-- Create current_team_records view
CREATE OR REPLACE VIEW current_team_records AS
SELECT DISTINCT ON (team_id) 
    team_id,
    wins,
    losses,
    ties,
    CONCAT(wins, '-', losses, 
        CASE WHEN ties > 0 THEN CONCAT('-', ties) ELSE '' END
    ) AS record,
    points_for,
    points_against,
    points_for - points_against AS point_differential,
    updated_at
FROM team_records
WHERE season = EXTRACT(year FROM now())
ORDER BY team_id, week DESC;

-- Create season_schedule view  
CREATE OR REPLACE VIEW season_schedule AS
SELECT 
    -4 AS week_number,
    'Hall of Fame Weekend' AS week_name,
    'HOF' AS week_abbreviation,
    1 AS season_type,
    'PRE' AS season_type_abbr,
    '2025-07-31'::date AS start_date,
    '2025-08-07'::date AS end_date
UNION ALL
SELECT 
    -3 AS week_number,
    'Preseason Week 1' AS week_name,
    'Pre Wk 1' AS week_abbreviation,
    1 AS season_type,
    'PRE' AS season_type_abbr,
    '2025-08-07'::date AS start_date,
    '2025-08-14'::date AS end_date
UNION ALL
SELECT 
    -2 AS week_number,
    'Preseason Week 2' AS week_name,
    'Pre Wk 2' AS week_abbreviation,
    1 AS season_type,
    'PRE' AS season_type_abbr,
    '2025-08-14'::date AS start_date,
    '2025-08-21'::date AS end_date
UNION ALL
SELECT 
    -1 AS week_number,
    'Preseason Week 3' AS week_name,
    'Pre Wk 3' AS week_abbreviation,
    1 AS season_type,
    'PRE' AS season_type_abbr,
    '2025-08-21'::date AS start_date,
    '2025-09-04'::date AS end_date
UNION ALL
SELECT 
    week_num AS week_number,
    'Week ' || week_num AS week_name,
    'Week ' || week_num AS week_abbreviation,
    2 AS season_type,
    'REG' AS season_type_abbr,
    ('2025-09-04'::date + (week_num - 1) * INTERVAL '7 days')::date AS start_date,
    ('2025-09-04'::date + week_num * INTERVAL '7 days' - INTERVAL '1 day')::date AS end_date
FROM generate_series(1, 18) AS week_num
ORDER BY week_number;

-- Initialize team records for 2025 season
INSERT INTO team_records (team_id, season, week, wins, losses, ties, points_for, points_against)
SELECT 
    t.id as team_id,
    2025 as season,
    0 as week,
    0 as wins,
    0 as losses, 
    0 as ties,
    0 as points_for,
    0 as points_against
FROM teams t
ON CONFLICT (team_id, season, week) DO NOTHING;

-- Note: We'll keep the weather/odds columns in games table for backward compatibility
-- but new data should use the normalized tables

-- Create function to update team records after games are completed
CREATE OR REPLACE FUNCTION update_team_records_for_game(game_id_param INTEGER)
RETURNS VOID AS $$
DECLARE
    game_record RECORD;
    home_wins INTEGER := 0;
    home_losses INTEGER := 0;
    away_wins INTEGER := 0;
    away_losses INTEGER := 0;
BEGIN
    -- Get game details
    SELECT * INTO game_record FROM games WHERE id = game_id_param AND is_final = TRUE;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Determine winners/losers
    IF game_record.home_score > game_record.away_score THEN
        home_wins := 1;
        away_losses := 1;
    ELSIF game_record.away_score > game_record.home_score THEN
        away_wins := 1;
        home_losses := 1;
    -- Tie case handled by default 0 values
    END IF;
    
    -- Update home team record
    INSERT INTO team_records (team_id, season, week, wins, losses, ties, points_for, points_against)
    VALUES (
        game_record.home_team_id,
        game_record.season_year,
        CASE 
            WHEN game_record.week LIKE 'pre%' THEN -ABS(CAST(SUBSTRING(game_record.week FROM 4) AS INTEGER))
            ELSE CAST(game_record.week AS INTEGER)
        END,
        home_wins,
        home_losses,
        CASE WHEN game_record.home_score = game_record.away_score THEN 1 ELSE 0 END,
        COALESCE(game_record.home_score, 0),
        COALESCE(game_record.away_score, 0)
    )
    ON CONFLICT (team_id, season, week) DO UPDATE SET
        wins = team_records.wins + EXCLUDED.wins,
        losses = team_records.losses + EXCLUDED.losses,
        ties = team_records.ties + EXCLUDED.ties,
        points_for = team_records.points_for + EXCLUDED.points_for,
        points_against = team_records.points_against + EXCLUDED.points_against,
        updated_at = now();
        
    -- Update away team record
    INSERT INTO team_records (team_id, season, week, wins, losses, ties, points_for, points_against)
    VALUES (
        game_record.away_team_id,
        game_record.season_year,
        CASE 
            WHEN game_record.week LIKE 'pre%' THEN -ABS(CAST(SUBSTRING(game_record.week FROM 4) AS INTEGER))
            ELSE CAST(game_record.week AS INTEGER)
        END,
        away_wins,
        away_losses,
        CASE WHEN game_record.home_score = game_record.away_score THEN 1 ELSE 0 END,
        COALESCE(game_record.away_score, 0),
        COALESCE(game_record.home_score, 0)
    )
    ON CONFLICT (team_id, season, week) DO UPDATE SET
        wins = team_records.wins + EXCLUDED.wins,
        losses = team_records.losses + EXCLUDED.losses,
        ties = team_records.ties + EXCLUDED.ties,
        points_for = team_records.points_for + EXCLUDED.points_for,
        points_against = team_records.points_against + EXCLUDED.points_against,
        updated_at = now();
END;
$$ LANGUAGE plpgsql;