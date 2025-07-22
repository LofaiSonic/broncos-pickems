-- Migration 007: 2025-2026 NFL Season Structure with Preseason Support
-- This migration adds support for the 2025-2026 NFL season including preseason weeks

-- Add season_type column to games table to distinguish preseason/regular season/postseason
ALTER TABLE games ADD COLUMN IF NOT EXISTS season_type INTEGER DEFAULT 2;

-- Add season_year column to track the specific year
ALTER TABLE games ADD COLUMN IF NOT EXISTS season_year INTEGER DEFAULT 2025;

-- Add espn_game_id to track ESPN API game IDs for data sync
ALTER TABLE games ADD COLUMN IF NOT EXISTS espn_game_id VARCHAR(50);

-- Add unique constraint on ESPN game ID
ALTER TABLE games ADD CONSTRAINT unique_espn_game_id UNIQUE (espn_game_id);

-- Create season_types lookup table for better data organization
CREATE TABLE IF NOT EXISTS season_types (
    id INTEGER PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    abbreviation VARCHAR(10) NOT NULL,
    description TEXT
);

-- Insert season type data
INSERT INTO season_types (id, name, abbreviation, description) VALUES
(1, 'Preseason', 'PRE', 'Preseason games for team preparation and player evaluation'),
(2, 'Regular Season', 'REG', 'Regular season games that count towards standings'),
(3, 'Postseason', 'POST', 'Playoff games including Wild Card, Divisional, Conference Championship, and Super Bowl'),
(4, 'Off Season', 'OFF', 'Off season period')
ON CONFLICT (id) DO NOTHING;

-- Create 2025 season record
INSERT INTO seasons (year, is_active, start_date, end_date, description) VALUES 
(2025, true, '2025-07-31', '2026-02-12', '2025-2026 NFL Season including preseason and postseason')
ON CONFLICT (year) DO UPDATE SET
    is_active = EXCLUDED.is_active,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    description = EXCLUDED.description;

-- Deactivate any other seasons
UPDATE seasons SET is_active = false WHERE year != 2025;

-- Create preseason weeks structure
-- Based on ESPN API calendar structure:
-- Hall of Fame Weekend: value=1 (special preseason week)
-- Preseason Week 1: value=2  
-- Preseason Week 2: value=3
-- Preseason Week 3: value=4

-- We'll use negative week numbers for preseason to distinguish from regular season
-- -4 = Hall of Fame Weekend
-- -3 = Preseason Week 1
-- -2 = Preseason Week 2  
-- -1 = Preseason Week 3

-- Add preseason game template data (will be populated by API sync)
-- Note: We'll populate actual games via API calls rather than inserting template data

-- Create view for all season weeks including preseason
CREATE OR REPLACE VIEW season_schedule AS
SELECT 
    -4 as week_number,
    'Hall of Fame Weekend' as week_name,
    'HOF' as week_abbreviation,
    1 as season_type,
    'PRE' as season_type_abbr,
    '2025-07-31'::date as start_date,
    '2025-08-07'::date as end_date

UNION ALL

SELECT 
    -3 as week_number,
    'Preseason Week 1' as week_name,
    'Pre Wk 1' as week_abbreviation,
    1 as season_type,
    'PRE' as season_type_abbr,
    '2025-08-07'::date as start_date,
    '2025-08-14'::date as end_date

UNION ALL

SELECT 
    -2 as week_number,
    'Preseason Week 2' as week_name,
    'Pre Wk 2' as week_abbreviation,
    1 as season_type,
    'PRE' as season_type_abbr,
    '2025-08-14'::date as start_date,
    '2025-08-21'::date as end_date

UNION ALL

SELECT 
    -1 as week_number,
    'Preseason Week 3' as week_name,
    'Pre Wk 3' as week_abbreviation,
    1 as season_type,
    'PRE' as season_type_abbr,
    '2025-08-21'::date as start_date,
    '2025-09-04'::date as end_date

UNION ALL

-- Regular season weeks 1-18
SELECT 
    week_num as week_number,
    'Week ' || week_num as week_name,
    'Week ' || week_num as week_abbreviation,
    2 as season_type,
    'REG' as season_type_abbr,
    ('2025-09-04'::date + (week_num - 1) * interval '7 days')::date as start_date,
    ('2025-09-04'::date + week_num * interval '7 days' - interval '1 day')::date as end_date
FROM generate_series(1, 18) as week_num

ORDER BY week_number;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_season_type ON games(season_type);
CREATE INDEX IF NOT EXISTS idx_games_season_year ON games(season_year);
CREATE INDEX IF NOT EXISTS idx_games_week_season_type ON games(week, season_type);
CREATE INDEX IF NOT EXISTS idx_games_espn_id ON games(espn_game_id);

-- Update existing games to have season_type = 2 (regular season) if not set
UPDATE games SET season_type = 2 WHERE season_type IS NULL;
UPDATE games SET season_year = 2025 WHERE season_year IS NULL;

-- Create function to get week display name
CREATE OR REPLACE FUNCTION get_week_display_name(week_num INTEGER, season_type_id INTEGER)
RETURNS TEXT AS $$
BEGIN
    CASE 
        WHEN season_type_id = 1 THEN
            CASE week_num
                WHEN -4 THEN RETURN 'Hall of Fame Weekend'
                WHEN -3 THEN RETURN 'Preseason Week 1'
                WHEN -2 THEN RETURN 'Preseason Week 2'
                WHEN -1 THEN RETURN 'Preseason Week 3'
                ELSE RETURN 'Preseason Week ' || (week_num + 4)
            END;
        WHEN season_type_id = 2 THEN
            RETURN 'Week ' || week_num;
        WHEN season_type_id = 3 THEN
            CASE week_num
                WHEN 1 THEN RETURN 'Wild Card'
                WHEN 2 THEN RETURN 'Divisional Round'
                WHEN 3 THEN RETURN 'Conference Championship'
                WHEN 4 THEN RETURN 'Pro Bowl'
                WHEN 5 THEN RETURN 'Super Bowl'
                ELSE RETURN 'Playoff Week ' || week_num
            END;
        ELSE
            RETURN 'Week ' || week_num;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON COLUMN games.season_type IS 'Season type: 1=Preseason, 2=Regular Season, 3=Postseason, 4=Off Season';
COMMENT ON COLUMN games.season_year IS 'The year this season starts (e.g., 2025 for 2025-2026 season)';
COMMENT ON COLUMN games.espn_game_id IS 'ESPN API game ID for data synchronization';
COMMENT ON VIEW season_schedule IS 'Complete schedule view showing all weeks including preseason';
COMMENT ON FUNCTION get_week_display_name IS 'Returns formatted week name based on week number and season type';

-- Migration complete
SELECT 'Migration 007 completed: 2025-2026 NFL Season Structure with Preseason Support' as status;