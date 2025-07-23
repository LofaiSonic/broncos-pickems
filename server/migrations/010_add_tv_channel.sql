-- Migration 010: Add TV channel information to games
-- This migration adds TV channel/network information for game broadcasts

-- Add tv_channel column to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS tv_channel VARCHAR(50);

-- Common TV networks for NFL games
COMMENT ON COLUMN games.tv_channel IS 'TV network broadcasting the game (e.g., CBS, FOX, NBC, ESPN, NFL Network, Amazon Prime)';

-- Update some example TV channels for existing games (these would normally come from API)
-- For now, let's set some placeholder values based on typical broadcast patterns
UPDATE games SET tv_channel = 
    CASE 
        WHEN EXTRACT(dow FROM game_time) = 0 THEN -- Sunday
            CASE 
                WHEN EXTRACT(hour FROM game_time) < 16 THEN 'CBS/FOX'
                WHEN EXTRACT(hour FROM game_time) < 20 THEN 'CBS/FOX' 
                ELSE 'NBC'
            END
        WHEN EXTRACT(dow FROM game_time) = 1 THEN 'ESPN' -- Monday
        WHEN EXTRACT(dow FROM game_time) = 4 THEN 'Amazon Prime' -- Thursday
        WHEN EXTRACT(dow FROM game_time) = 5 THEN 'NFL Network' -- Friday
        WHEN EXTRACT(dow FROM game_time) = 6 THEN 'NFL Network' -- Saturday
        ELSE 'TBD'
    END
WHERE tv_channel IS NULL AND season_type = 2; -- Only for regular season games

-- Preseason games typically on local networks
UPDATE games SET tv_channel = 'Local' 
WHERE tv_channel IS NULL AND season_type = 1;

-- Create index for performance when filtering by TV channel
CREATE INDEX IF NOT EXISTS idx_games_tv_channel ON games(tv_channel);

-- Migration complete
SELECT 'Migration 010 completed: Added TV channel information to games' as status;